/**
 * Contract tests for every API wrapper, with no network involved.
 *
 * The real src/api modules are loaded through Vite's SSR loader (same aliases,
 * same TypeScript), `fetch` is replaced by a recorder, and every wrapper is
 * called with sample arguments derived from its parameter types. Each recorded
 * request is then checked against the OpenAPI operation it targets: method,
 * path (and which argument landed in which segment), query names, body
 * encoding and keys, and the Authorization / Accept-Language headers.
 *
 * The token-refresh flow is exercised separately (proactive refresh and the
 * 401 → refresh → retry path).
 */
import path from 'node:path'
import { createServer } from 'vite'

const ACCESS = 'audit-access-token'
const REFRESH = 'audit-refresh-token'

export async function runContractTests(root, calls, opsByKey, keyOf, links = null) {
  installStorage()
  const recorded = []
  let responder = () => okJson({})
  // Restored in `finally` — the live probes that run after this need the real fetch.
  const realFetch = globalThis.fetch
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    recorded.push({ url, init })
    return responder(url, init)
  }

  const server = await createServer({
    root,
    configFile: path.join(root, 'vite.config.ts'),
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom',
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  try {
    const mod = await server.ssrLoadModule('/src/api/index.ts')
    const results = []

    const signIn = (expiresInSeconds = 3600) =>
      mod.setSessionFromAuth({
        accessToken: ACCESS,
        refreshToken: REFRESH,
        expiresInSeconds,
        user: { id: 'audit-user', roles: ['Teacher'] },
      })

    for (const call of calls) {
      const op = opsByKey.get(keyOf(call))
      // Some wrappers are imported straight from their endpoint module rather than the barrel.
      const fn = resolve(mod, call.fn) ?? resolve(await server.ssrLoadModule(`/${call.file}`), call.fn)
      if (!op || !fn || !call.sampleArgs) {
        if (op && call.fn !== 'performRefresh')
          results.push({ id: op.id, fn: call.fn, pass: false, failures: ['wrapper is not exported from its module'] })
        continue
      }
      signIn()
      responder = () => okJson({})
      recorded.length = 0
      const args = call.sampleArgs.map((a) => rebuild(a.value))
      let thrown = null
      try {
        await fn(...args)
      } catch (error) {
        thrown = String(error?.message ?? error)
      }
      const req = recorded.find((r) => r.url.pathname.startsWith('/api/v1'))
      const failures = req ? check(op, call, req, args) : ['no request was sent']
      results.push({
        id: op.id,
        fn: call.fn,
        pass: failures.length === 0,
        failures,
        // A wrapper that post-processes `{}` may throw after the request; that is
        // not a contract failure, but it is recorded.
        thrownAfterRequest: thrown,
      })
    }

    results.push(...(await refreshFlowTests(mod, signIn, recorded, (r) => (responder = r))))
    const navigation = links ? await navigationChecks(server, links) : null
    return { results, navigation }
  } finally {
    globalThis.fetch = realFetch
    await server.close()
  }
}

/**
 * Every link the backend writes into notifications and emails, resolved by
 * notificationHref for every role, must land on a route the router has.
 */
async function navigationChecks(server, { paths, routes }) {
  const { notificationHref } = await server.ssrLoadModule('/src/lib/navigation.ts')
  const patterns = routes
    .filter((r) => !r.path.endsWith('*'))
    .map((r) => new RegExp(`^${r.path.replace(/:[^/]+/g, '[^/]+')}/?$`))
  const roles = ['student', 'teacher', 'assistant', 'parent', 'admin', null]
  const out = []
  for (const raw of paths) {
    if (/^\{\w+\}$/.test(raw)) continue // {resetUrl} / {verificationUrl}: absolute links built elsewhere
    const sample = raw.replace(/\{[^}]+\}/g, 'aaaaaaaa-0000-4000-8000-000000000001')
    for (const role of roles) {
      const href = notificationHref(sample, role)
      if (href === null) {
        out.push({ path: raw, role: role ?? 'signed out', href, pass: true, note: 'not a link for this viewer' })
        continue
      }
      const pathname = href.split('?')[0]
      const pass = patterns.some((p) => p.test(pathname))
      out.push({ path: raw, role: role ?? 'signed out', href, pass })
    }
  }
  return out
}

/* -------------------------------------------------------------------------- */

function check(op, call, req, args) {
  const failures = []
  const method = req.init.method ?? 'GET'
  if (method !== op.method) failures.push(`method ${method}, spec says ${op.method}`)

  // Path: same shape, and each {param} segment carries one of the string arguments.
  const actual = req.url.pathname.split('/')
  const spec = op.route.split('/')
  if (actual.length !== spec.length) {
    failures.push(`path ${req.url.pathname} does not have the shape of ${op.route}`)
  } else {
    const strings = new Set(flattenStrings(args))
    spec.forEach((seg, i) => {
      const got = decodeURIComponent(actual[i])
      if (seg.startsWith('{')) {
        if (!strings.has(got)) failures.push(`path segment ${seg} = "${got}" is not an argument`)
      } else if (seg.toLowerCase() !== got.toLowerCase()) {
        failures.push(`path segment "${got}" ≠ "${seg}"`)
      }
    })
  }

  // Query: names must be declared (ASP.NET binds case-insensitively).
  const declared = new Map(op.parameters.filter((p) => p.in === 'query').map((p) => [p.name.toLowerCase(), p]))
  for (const key of new Set(req.url.searchParams.keys())) {
    if (!declared.has(key.toLowerCase())) failures.push(`query "${key}" is not declared`)
  }

  // Body encoding and keys.
  const headers = req.init.headers ?? {}
  const body = req.init.body
  if (op.requestBody) {
    if (op.requestBody.multipart) {
      if (!(body instanceof FormData)) failures.push('spec expects multipart/form-data')
      else if (op.requestBody.properties) {
        const allowed = new Set(op.requestBody.properties.map((k) => k.toLowerCase()))
        for (const key of new Set(body.keys()))
          if (!allowed.has(key.toLowerCase())) failures.push(`form field "${key}" is not declared`)
      }
    } else if (body === undefined) {
      if (op.requestBody.required) failures.push('spec requires a JSON body; none sent')
    } else if (body instanceof FormData) {
      failures.push('sent multipart; spec expects JSON')
    } else {
      if (!/application\/json/.test(headers['Content-Type'] ?? '')) failures.push('JSON body without Content-Type: application/json')
      let parsed
      try {
        parsed = JSON.parse(body)
      } catch {
        failures.push('body is not valid JSON')
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && op.requestBody.properties) {
        const allowed = new Set(op.requestBody.properties.map((k) => k.toLowerCase()))
        for (const key of Object.keys(parsed))
          if (!allowed.has(key.toLowerCase())) failures.push(`body key "${key}" is not in ${op.requestBody.schema}`)
      }
    }
  }

  // Headers.
  const auth = headers.Authorization
  if (!op.auth.public && auth !== `Bearer ${ACCESS}`) failures.push('protected operation sent without the bearer token')
  if (!headers['Accept-Language']) failures.push('no Accept-Language header')
  return failures
}

async function refreshFlowTests(mod, signIn, recorded, setResponder) {
  const out = []
  const id = 'POST /api/v1/auth/refresh-token'

  // 1. Proactive: an expiring token is refreshed before the call goes out.
  signIn(0)
  recorded.length = 0
  setResponder((url) =>
    url.pathname.endsWith('/auth/refresh-token')
      ? okJson({ accessToken: 'audit-access-2', refreshToken: 'audit-refresh-2', expiresInSeconds: 3600, user: { id: 'audit-user' } })
      : okJson({}),
  )
  await mod.teacherProfileApi.get().catch(() => {})
  const refresh = recorded.find((r) => r.url.pathname.endsWith('/auth/refresh-token'))
  const after = recorded.find((r) => r.url.pathname.endsWith('/teacher/profile'))
  const f1 = []
  if (!refresh) f1.push('no refresh request before an expiring token was used')
  else {
    if (refresh.init.method !== 'POST') f1.push('refresh is not a POST')
    if (JSON.parse(refresh.init.body ?? '{}').refreshToken !== REFRESH) f1.push('refresh body lacks the stored refreshToken')
  }
  if (after?.init.headers?.Authorization !== 'Bearer audit-access-2') f1.push('call did not use the refreshed token')
  out.push({ id, fn: 'refreshAccessToken (proactive)', pass: !f1.length, failures: f1 })

  // 2. Reactive: a 401 triggers one refresh and one retry with the new token.
  signIn()
  recorded.length = 0
  let first = true
  setResponder((url) => {
    if (url.pathname.endsWith('/auth/refresh-token'))
      return okJson({ accessToken: 'audit-access-3', refreshToken: 'audit-refresh-3', expiresInSeconds: 3600, user: { id: 'audit-user' } })
    if (first) {
      first = false
      return new Response(JSON.stringify({ status: 401, code: 'UNAUTHORIZED' }), { status: 401 })
    }
    return okJson({})
  })
  await mod.teacherProfileApi.get().catch(() => {})
  const calls = recorded.filter((r) => r.url.pathname.endsWith('/teacher/profile'))
  const f2 = []
  if (!recorded.some((r) => r.url.pathname.endsWith('/auth/refresh-token'))) f2.push('401 did not trigger a refresh')
  if (calls.length !== 2) f2.push(`expected 2 attempts, saw ${calls.length}`)
  else if (calls[1].init.headers?.Authorization !== 'Bearer audit-access-3') f2.push('retry did not use the new token')
  out.push({ id, fn: 'request (401 → refresh → retry)', pass: !f2.length, failures: f2 })
  return out
}

/* -------------------------------------------------------------------------- */

function okJson(data) {
  return new Response(JSON.stringify({ success: true, message: 'ok', data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function resolve(mod, dotted) {
  let cur = mod
  for (const part of dotted.split('.')) cur = cur?.[part]
  return typeof cur === 'function' ? cur : null
}

function rebuild(v) {
  if (Array.isArray(v)) return v.map(rebuild)
  if (v && typeof v === 'object') {
    if ('__file' in v) return new File(['audit'], 'audit.png', { type: 'image/png' })
    if ('__formData' in v) {
      const f = new FormData()
      f.append('file', new File(['audit'], 'audit.png', { type: 'image/png' }))
      return f
    }
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rebuild(x)]))
  }
  return v
}

function flattenStrings(v, out = []) {
  if (typeof v === 'string') out.push(v)
  else if (typeof v === 'number') out.push(String(v))
  else if (Array.isArray(v)) v.forEach((x) => flattenStrings(x, out))
  else if (v && typeof v === 'object' && !(v instanceof Blob) && !(v instanceof FormData))
    Object.values(v).forEach((x) => flattenStrings(x, out))
  return out
}

function installStorage() {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  }
}
