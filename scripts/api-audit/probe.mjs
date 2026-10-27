/**
 * Live probes against the real API — read-only by construction:
 *
 * - Public GETs run with real ids where production has records (taken from the
 *   list endpoints), plus paging and invalid-parameter cases. Each 2xx payload is
 *   compared with the documented response schema.
 * - Operations that require auth are called anonymously, with nil ids and no
 *   body. ASP.NET's authorization middleware answers 401 before the endpoint
 *   runs, so nothing executes; this proves the route exists and is protected.
 * - Public mutations are only sent bodies that the backend rejects before the
 *   handler runs (C# `required` members missing → 400), or values that can
 *   match nothing (an unknown invitation token, an unknown discount code).
 * - The payment-provider webhook is never called.
 *
 * No credentials are used: authenticated behaviour is out of reach here.
 */

const NIL = '00000000-0000-0000-0000-000000000000'

/**
 * Query parameters the spec marks optional but the backend validator requires
 * (GlobalSearchQueryValidator: Q not empty, ≥ 2 characters).
 */
const UNDECLARED_REQUIRED_QUERY = {
  'GET /api/v1/search': { Q: 'math' },
}
const SKIP = new Set(['POST /api/v1/billing/webhooks/{provider}'])

/** Request bodies for public mutations that cannot get past validation or match anything. */
const PUBLIC_MUTATION_CASES = {
  'POST /api/v1/team/invitations/decline': {
    body: { token: 'audit-probe-invalid-token' },
    scenario: 'unknown invitation token (handler finds nothing, writes nothing)',
  },
  'POST /api/v1/discounts/validate': {
    body: { code: 'AUDIT-PROBE-NO-SUCH-CODE' },
    scenario: 'unknown discount code (read-only lookup)',
  },
}

export async function runProbes(base, ops, { log = () => {} } = {}) {
  const results = []
  const record = (op, r) => results.push({ id: op.id, ...r })

  /*
   * The API rate-limits per caller: 300 requests/min overall, 10/min on auth
   * routes (RateLimitingOptions.cs). Requests are spaced out, and a 429 is
   * waited out (Retry-After) and retried rather than recorded as a result.
   */
  const call = async (method, url, options = {}) => {
    for (let attempt = 0; ; attempt++) {
      await sleep(250)
      const r = await callOnce(method, url, options)
      if (r.status !== 429 || attempt >= 3) return r
      const wait = Math.min(Number(r.retryAfter) || 61, 65)
      log(`  429 on ${method} ${url.replace(base, '')} — waiting ${wait}s`)
      await sleep(wait * 1000)
    }
  }

  const callOnce = async (method, url, { body, token, raw } = {}) => {
    const started = Date.now()
    try {
      const res = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      })
      const text = await res.text()
      let json = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        /* not JSON */
      }
      return {
        status: res.status,
        json,
        ms: Date.now() - started,
        contentType: res.headers.get('content-type'),
        retryAfter: res.headers.get('retry-after'),
      }
    } catch (error) {
      return { status: 0, error: String(error?.message ?? error), ms: Date.now() - started }
    }
  }

  // Prove the network is real before trusting any result: a stubbed fetch, a
  // proxy or a captive portal would otherwise produce a convincing report.
  const health = await call('GET', `${base}/health`)
  if (health.status !== 200 || !Array.isArray(health.json?.checks)) {
    throw new Error(`Live API sanity check failed: GET /health → ${health.status} ${JSON.stringify(health.json)?.slice(0, 120)}`)
  }

  /* ---------------------------- real ids, if any ---------------------------- */

  const ids = { subject: [], grade: [], plan: [], teacher: [], group: [], course: [] }
  const harvest = async (route, key, slugKey) => {
    const r = await call('GET', `${base}${route}`)
    const data = r.json?.data
    const rows = Array.isArray(data) ? data : data?.items ?? []
    for (const row of rows.slice(0, 1)) ids[key].push({ id: row.id, slug: slugKey ? row[slugKey] : undefined })
  }
  await harvest('/api/v1/subjects', 'subject', 'slug')
  await harvest('/api/v1/grades', 'grade', 'slug')
  await harvest('/api/v1/billing/plans', 'plan')
  await harvest('/api/v1/teachers', 'teacher')
  await harvest('/api/v1/groups', 'group')
  await harvest('/api/v1/courses', 'course')

  /** A real id for the first path segment's resource, else nil. */
  const fill = (op) => {
    let realData = true
    const segs = op.route.split('/')
    const out = segs.map((seg, i) => {
      if (!seg.startsWith('{')) return seg
      const resource = segs[i - 1]
      const pick = {
        subjects: ids.subject[0],
        grades: ids.grade[0],
        plans: ids.plan[0],
        teachers: ids.teacher[0],
        groups: ids.group[0],
        courses: ids.course[0],
      }[resource]
      if (pick) return seg === '{idOrSlug}' && pick.slug ? pick.slug : pick.id
      realData = false
      if (/code|slug|provider|token/i.test(seg)) return 'audit-probe-unknown'
      return NIL
    })
    return { url: `${base}${out.join('/')}`, realData }
  }

  /* --------------------------------- probes --------------------------------- */

  for (const op of ops) {
    if (SKIP.has(op.id)) {
      record(op, { skipped: 'server-to-server callback; never called' })
      continue
    }
    const { url, realData } = fill(op)
    const tests = []

    if (!op.auth.public) {
      // Anonymous: must be refused before the endpoint runs.
      const r = await call(op.method, url)
      tests.push({
        scenario: 'anonymous caller on a protected operation',
        expected: 401,
        status: r.status,
        pass: r.status === 401,
        code: r.json?.code ?? null,
      })
    } else if (op.method === 'GET') {
      // Declared required, plus the ones only the backend validator requires.
      const required = [
        ...op.parameters.filter((p) => p.in === 'query' && p.required).map((p) => [p.name, 'math']),
        ...Object.entries(UNDECLARED_REQUIRED_QUERY[op.id] ?? {}),
      ]
      const query = new URLSearchParams(required)
      const isPaged = op.parameters.some((p) => p.in === 'query' && /^pagesize$/i.test(p.name))
      if (isPaged) query.set('PageSize', '2')
      const r = await call('GET', `${url}${query.size ? `?${query}` : ''}`)
      const expected = realData ? 200 : [200, 404]
      const sample = summarize(r.json?.data)
      tests.push({
        scenario: realData
          ? `public read${isPaged ? ' (PageSize=2)' : ''}${required.length ? ` with ${required.map(([n]) => n).join(', ')}` : ''}`
          : 'public read with an id production does not have (no test data)',
        expected,
        status: r.status,
        pass:
          (Array.isArray(expected) ? expected.includes(r.status) : r.status === expected) &&
          // A page asked for 2 must not hold more than 2.
          (!isPaged || r.status !== 200 || (r.json?.data?.items?.length ?? 0) <= 2),
        code: r.json?.code ?? null,
        envelope: r.json ? 'success' in r.json && ('data' in r.json || r.status >= 400) : false,
        sample,
        schemaDiff: r.status === 200 ? schemaDiff(sample, op.responseData) : null,
        // An empty list proves the route, envelope and paging — not that real rows render.
        realData: realData && r.status === 200 && !!sample && (sample.kind === 'object' || sample.count > 0),
        emptyList: r.status === 200 && !!sample && sample.kind !== 'object' && sample.count === 0,
      })
      // The backend clamps paging (PagedRequest: <1 → 12, >100 → 100) instead of rejecting it.
      if (isPaged && r.status === 200) {
        for (const [asked, expectSize] of [
          [-5, 12],
          [1000, 100],
        ]) {
          const p = await call('GET', `${url}?PageSize=${asked}`)
          tests.push({
            scenario: `out-of-range paging (PageSize=${asked}) is clamped to ${expectSize}`,
            expected: 200,
            status: p.status,
            pass: p.status === 200 && p.json?.data?.pageSize === expectSize,
            code: p.json?.code ?? null,
          })
        }
      }
      if (required.length) {
        const missing = await call('GET', url)
        tests.push({
          scenario: `missing required query (${required.map(([n]) => n).join(', ')})`,
          expected: 400,
          status: missing.status,
          pass: missing.status === 400,
          code: missing.json?.code ?? null,
        })
      }
    } else {
      // Public mutation: only bodies that cannot reach the handler, or match nothing.
      const custom = PUBLIC_MUTATION_CASES[op.id]
      if (custom) {
        const r = await call(op.method, url, { body: custom.body })
        tests.push({
          scenario: custom.scenario,
          expected: [400, 404],
          status: r.status,
          pass: [400, 404].includes(r.status),
          code: r.json?.code ?? null,
        })
      } else {
        const r = await call(op.method, url, { body: {} })
        tests.push({
          scenario: 'empty body — required members missing, rejected before the handler',
          expected: 400,
          status: r.status,
          pass: r.status === 400,
          code: r.json?.code ?? null,
        })
      }
    }
    for (const t of tests) if (t.status >= 500 || t.status === 0) t.serverError = true
    record(op, { url: url.replace(base, ''), tests })
    log(`${tests.map((t) => t.status).join('/')} ${op.id}`)
  }
  return { ids, results }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Keys the live payload has that the documented schema does not, and the
 * reverse. Informational: OpenAPI properties are optional, so a missing key
 * is not a failure, but an undocumented one is worth knowing about.
 */
function schemaDiff(sample, documented) {
  if (!sample?.keys?.length || !documented?.keys) return null
  const doc = new Set(documented.keys.map((k) => k.toLowerCase()))
  const got = new Set(sample.keys.map((k) => k.toLowerCase()))
  return {
    schema: documented.schema,
    undocumented: sample.keys.filter((k) => !doc.has(k.toLowerCase())),
    absent: documented.keys.filter((k) => !got.has(k.toLowerCase())),
  }
}

function summarize(data) {
  if (data === undefined || data === null) return null
  if (Array.isArray(data)) return { kind: 'array', count: data.length, keys: data[0] ? Object.keys(data[0]) : [] }
  if (typeof data === 'object' && Array.isArray(data.items)) {
    return {
      kind: 'page',
      count: data.items.length,
      totalCount: data.totalCount,
      pageKeys: Object.keys(data),
      keys: data.items[0] ? Object.keys(data.items[0]) : [],
    }
  }
  if (typeof data === 'object') return { kind: 'object', keys: Object.keys(data) }
  return { kind: typeof data }
}
