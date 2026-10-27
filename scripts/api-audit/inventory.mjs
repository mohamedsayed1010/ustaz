/**
 * The authoritative operation inventory: every operation in the OpenAPI
 * document, joined to the controller action that serves it so the real
 * authorization rules are known. (Swagger puts Bearer on every operation and
 * overrides none, so the spec alone cannot say which operations are public.)
 */
import fs from 'node:fs'
import path from 'node:path'

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

/** Policy → what the caller must hold. Mirrors AuthenticationExtensions.cs. */
const POLICIES = {
  AdminOnly: ['Admin'],
  TeacherOnly: ['Teacher'],
  StudentOnly: ['Student'],
  ParentOnly: ['Parent'],
  TeacherOrAdmin: ['Teacher', 'Admin'],
  VerifiedTeacherOnly: ['Teacher (verified)'],
  AuthenticatedUser: ['any signed-in user'],
  TenantMember: ['workspace member (tenantId claim) or Admin'],
}

export const normRoute = (r) =>
  r.toLowerCase().replace(/\{[^}]*\}/g, '{}').replace(/\/+$/, '')

/* -------------------------------------------------------------------------- */
/*                                 OpenAPI side                                */
/* -------------------------------------------------------------------------- */

export function buildInventory(spec) {
  const schemas = spec.components?.schemas ?? {}
  const refName = (s) => (s?.$ref ? s.$ref.split('/').pop() : null)
  const describe = (s) => {
    if (!s) return null
    if (s.$ref) return refName(s)
    if (s.type === 'array') return `${describe(s.items) ?? 'unknown'}[]`
    return s.type ?? 'object'
  }

  const ops = []
  for (const [route, item] of Object.entries(spec.paths)) {
    const shared = item.parameters ?? []
    for (const m of METHODS) {
      const op = item[m]
      if (!op) continue
      const parameters = [...shared, ...(op.parameters ?? [])].map((p) => ({
        name: p.name,
        in: p.in,
        required: !!p.required,
        type: describe(p.schema),
      }))
      let requestBody = null
      if (op.requestBody) {
        const content = op.requestBody.content ?? {}
        const types = Object.keys(content)
        const main = content['application/json'] ?? content['multipart/form-data'] ?? content[types[0]]
        const schemaName = refName(main?.schema)
        const resolved = schemaName ? schemas[schemaName] : main?.schema
        requestBody = {
          contentTypes: types,
          multipart: types.some((t) => t.startsWith('multipart/')),
          schema: describe(main?.schema),
          required: !!op.requestBody.required,
          properties: resolved?.properties ? Object.keys(resolved.properties) : null,
          requiredProperties: resolved?.required ?? [],
        }
      }
      const responses = Object.fromEntries(
        Object.entries(op.responses ?? {}).map(([code, r]) => {
          const c = r.content ?? {}
          const first = c['application/json'] ?? c[Object.keys(c)[0]]
          return [code, describe(first?.schema)]
        }),
      )
      // The documented shape of `data` (through the envelope, page and list wrappers).
      const okSchema = (() => {
        const c = op.responses?.['200']?.content ?? op.responses?.['201']?.content ?? {}
        return (c['application/json'] ?? c[Object.keys(c)[0]])?.schema
      })()
      const responseData = (() => {
        let s = okSchema?.$ref ? schemas[refName(okSchema)] : okSchema
        s = s?.properties?.data ?? null
        for (let i = 0; i < 4 && s; i++) {
          if (s.$ref) s = schemas[refName(s)]
          else if (s.type === 'array') s = s.items
          else if (s.properties?.items) s = s.properties.items
          else break
        }
        if (s?.$ref) s = schemas[refName(s)]
        return s?.properties ? { schema: describe(okSchema), keys: Object.keys(s.properties) } : null
      })()
      ops.push({
        id: `${m.toUpperCase()} ${route}`,
        method: m.toUpperCase(),
        route,
        normalized: normRoute(route),
        operationId: op.operationId ?? null,
        tags: op.tags ?? [],
        summary: op.summary ?? null,
        description: op.description ?? null,
        deprecated: !!op.deprecated,
        parameters,
        requestBody,
        responses,
        responseData,
        swaggerSecurity: (op.security ?? spec.security ?? []).flatMap((s) => Object.keys(s)),
      })
    }
  }

  // Count unique method + normalized route, so a route listed under two tags
  // (or with differently named parameters) cannot be counted twice.
  const unique = new Map()
  for (const o of ops) unique.set(`${o.method} ${o.normalized}`, o)
  return { ops: [...unique.values()], duplicatesCollapsed: ops.length - unique.size }
}

/* -------------------------------------------------------------------------- */
/*                                 Backend side                                */
/* -------------------------------------------------------------------------- */

/**
 * Reads [Route]/[Http*]/[Authorize]/[AllowAnonymous] off every controller and
 * returns one entry per (method, normalized route).
 */
export function readBackendActions(controllersDir) {
  const actions = []
  for (const file of fs.readdirSync(controllersDir).filter((f) => f.endsWith('.cs'))) {
    const text = fs.readFileSync(path.join(controllersDir, file), 'utf8')
    let pending = []
    let cls = null
    let i = 0
    const lines = text.split(/\r?\n/)
    while (i < lines.length) {
      const line = lines[i].trim()
      if (line.startsWith('[') && !line.startsWith('[]')) {
        // Read one (possibly multi-line) attribute block with balanced brackets.
        let block = ''
        let depth = 0
        do {
          const l = lines[i]
          for (const ch of l) {
            if (ch === '[') depth++
            else if (ch === ']') depth--
          }
          block += `${l.trim()} `
          i++
        } while (depth > 0 && i < lines.length)
        pending.push(...splitAttributes(block))
        continue
      }
      if (/\bclass\s+\w+/.test(line)) {
        cls = { name: line.match(/class\s+(\w+)/)[1], ...readAuth(pending), routes: routesOf(pending) }
        pending = []
      } else if (cls && /^public\s.*\(/.test(line)) {
        const verbs = pending
          .map((a) => a.match(/^Http(Get|Post|Put|Patch|Delete)\b(?:\(\s*"([^"]*)")?/))
          .filter(Boolean)
        if (verbs.length) {
          const auth = readAuth(pending)
          const methodRoutes = routesOf(pending)
          const actionName = line.match(/(\w+)\s*(?:<[^>]*>)?\s*\(/)?.[1]
          for (const [, verb, tpl] of verbs) {
            const templates = tpl !== undefined ? [tpl] : methodRoutes.length ? methodRoutes : ['']
            for (const t of templates) {
              const bases = t.startsWith('~/') || t.startsWith('/') ? [''] : cls.routes.length ? cls.routes : ['']
              for (const base of bases) {
                const full = joinRoute(base, t)
                actions.push({
                  method: verb.toUpperCase(),
                  normalized: normRoute(full),
                  // Several files hold more than one controller class; name the class.
                  source: `${cls.name}.${actionName}`,
                  auth: effectiveAuth(cls, auth),
                })
              }
            }
          }
        }
        pending = []
      } else if (line && !line.startsWith('//') && !line.startsWith('///')) {
        // Any other code line ends the attribute run (comments and blanks do not).
        pending = []
      }
      i++
    }
  }
  return actions
}

function splitAttributes(block) {
  // "[A, B(x, y)] " → ["A", "B(x, y)"]
  const inner = block.trim().replace(/^\[/, '').replace(/\]\s*$/, '')
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of inner) {
    if (ch === '(' || ch === '[') depth++
    if (ch === ')' || ch === ']') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

function routesOf(attrs) {
  return attrs.map((a) => a.match(/^Route\(\s*"([^"]*)"/)?.[1]).filter((x) => x !== undefined)
}

function readAuth(attrs) {
  const anonymous = attrs.some((a) => /^AllowAnonymous\b/.test(a))
  const requirements = []
  for (const a of attrs) {
    if (!/^Authorize\b/.test(a)) continue
    const policy = a.match(/Policy\s*=\s*PolicyNames\.(\w+)/)?.[1]
    const roles = a.match(/Roles\s*=\s*([^)]*)/)?.[1]
    if (policy) requirements.push({ policy, needs: POLICIES[policy] ?? [policy] })
    else if (roles)
      requirements.push({
        roles: roles.split(/[+,]/).map((r) => r.replace(/RoleNames\.|"|\s/g, '')).filter(Boolean),
        needs: roles.split(/[+,]/).map((r) => r.replace(/RoleNames\.|"|\s/g, '')).filter(Boolean),
      })
    else requirements.push({ needs: ['any signed-in user'] })
  }
  return { anonymous, requirements }
}

/** ASP.NET Core: [AllowAnonymous] anywhere on the chain wins over every [Authorize]. */
function effectiveAuth(cls, action) {
  const required = [...cls.requirements, ...action.requirements]
  const anonymous = cls.anonymous || action.anonymous
  return {
    public: anonymous || required.length === 0,
    needs: anonymous ? [] : [...new Set(required.flatMap((r) => r.needs))],
    // A controller-level [AllowAnonymous] silently cancels an action's [Authorize].
    anonymousOverridesAuthorize: anonymous && required.length > 0,
  }
}

function joinRoute(base, tpl) {
  const b = base.replace(/^~?\//, '')
  const t = tpl.replace(/^~?\//, '')
  const full = tpl.startsWith('~/') || tpl.startsWith('/') ? t : [b, t].filter(Boolean).join('/')
  return `/${full}`
    .replace(/v\{version:apiVersion\}/g, 'v1')
    .replace(/\{([^}:?]+)[^}]*\}/g, '{$1}')
}

/* -------------------------------------------------------------------------- */
/*                               Risk classification                           */
/* -------------------------------------------------------------------------- */

/**
 * What running an operation against production would do. Driven by the route
 * shape; the categories are deliberately conservative — anything that could
 * email, notify, charge or invite someone is "external".
 */
export function classifyRisk(op) {
  const r = op.normalized
  if (op.method === 'GET') return 'read-only'
  if (op.method === 'POST' && /\/(validate|search|preview|check)$/.test(r)) return 'read-only (POST)'
  if (
    /webhooks|checkout|subscribe|subscription|payments?\b|refund|invoice|billing/.test(r) ||
    /invit|invite|forgot-password|resend|verify-email|register|\/messages|announcement|broadcast|remind|notify|guardians/.test(r)
  )
    return 'external side effects'
  if (op.method === 'DELETE' || /\/(cancel|revoke|reject|suspend|deactivate|archive|remove|withdraw|ban)$/.test(r))
    return 'destructive'
  return 'mutating'
}
