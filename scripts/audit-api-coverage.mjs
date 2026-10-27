/**
 * Frontend ⇄ API coverage audit.
 *
 *   node scripts/audit-api-coverage.mjs            # full run: static + contract + live probes
 *   node scripts/audit-api-coverage.mjs --offline  # skip the live API (probes reuse the last JSON)
 *   …add --skip-build to skip the typecheck and production build
 *
 * Writes Backedn/docs/frontend-api-coverage.json (one row per operation) and
 * Backedn/docs/frontend-api-coverage.md (the summary). Every number in the
 * markdown is computed from the JSON rows; nothing is typed in by hand.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildInventory, classifyRisk, normRoute, readBackendActions } from './api-audit/inventory.mjs'
import { analyzeFrontend } from './api-audit/frontend.mjs'
import { runContractTests } from './api-audit/contract.mjs'
import { runProbes } from './api-audit/probe.mjs'
import { ANNOTATIONS } from './api-audit/annotations.mjs'
import { renderMarkdown } from './api-audit/report.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const API = process.env.USTAZ_API_URL ?? 'https://ustaz.runasp.net'
const DOCS = path.join(ROOT, 'Backedn', 'docs')
const OUT_JSON = path.join(DOCS, 'frontend-api-coverage.json')
const OUT_MD = path.join(DOCS, 'frontend-api-coverage.md')
const offline = process.argv.includes('--offline')
const skipBuild = process.argv.includes('--skip-build')

const step = (s) => console.log(`\n▸ ${s}`)

/* --------------------------------- spec ---------------------------------- */

step(`Reading the OpenAPI document from ${API}`)
const specRes = await fetch(`${API}/swagger/v1/swagger.json`)
if (!specRes.ok) throw new Error(`swagger.json → ${specRes.status}`)
const spec = await specRes.json()
const specFetchedAt = new Date().toISOString()
const { ops, duplicatesCollapsed } = buildInventory(spec)

const actions = readBackendActions(path.join(ROOT, 'Backedn', 'src', 'Ustaz.API', 'Controllers'))
const actionByKey = new Map(actions.map((a) => [`${a.method} ${a.normalized}`, a]))
for (const op of ops) {
  const a = actionByKey.get(`${op.method} ${op.normalized}`)
  op.backendAction = a?.source ?? null
  op.auth = a?.auth ?? { public: false, needs: ['unknown — no controller action found'] }
  op.risk = classifyRisk(op)
}
console.log(`  ${ops.length} operations, ${new Set(ops.map((o) => o.normalized)).size} routes, ${actions.length} controller actions`)

/* -------------------------------- frontend -------------------------------- */

step('Analysing the frontend (TypeScript compiler)')
const fe = analyzeFrontend(ROOT)
const keyOfCall = (c) => `${c.method} ${normRoute(`/api/v1${c.template}`)}`
const opsByKey = new Map(ops.map((o) => [`${o.method} ${o.normalized}`, o]))
const strayCalls = fe.calls.filter((c) => !opsByKey.has(keyOfCall(c)))
console.log(`  ${fe.calls.length} HTTP calls, ${strayCalls.length} not matching any operation`)

/* -------------------------------- contract -------------------------------- */

/* Links the backend writes into notifications and emails (ActionUrl / CtaPath). */
const backendLinks = [
  ...new Set(
    ['Notifications', 'Emails'].flatMap((dir) => {
      const base = path.join(ROOT, 'Backedn', 'src', 'Ustaz.Application', 'Common', dir)
      return fs
        .readdirSync(base)
        .filter((f) => f.endsWith('.cs'))
        .flatMap((f) => [...fs.readFileSync(path.join(base, f), 'utf8').matchAll(/(?:ActionUrl|CtaPath)\s*=\s*\$?"([^"]+)"/g)].map((m) => m[1]))
    }),
  ),
].sort()

step('Contract-testing every wrapper (fetch stubbed, no network)')
const { results: contract, navigation } = await runContractTests(ROOT, fe.calls, opsByKey, keyOfCall, {
  paths: backendLinks,
  routes: fe.routes,
})
console.log(`  ${contract.filter((r) => r.pass).length}/${contract.length} pass`)
console.log(`  notification links: ${navigation.filter((n) => n.pass).length}/${navigation.length} resolve to a route`)

const unknownAnnotations = Object.keys(ANNOTATIONS).filter((id) => !ops.some((o) => o.id === id))
if (unknownAnnotations.length) throw new Error(`Annotations for operations not in the spec: ${unknownAnnotations.join(', ')}`)

/* ---------------------------------- live ---------------------------------- */

let probes
if (offline && fs.existsSync(OUT_JSON)) {
  step('Offline: reusing live probe results from the last run')
  const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'))
  probes = { ranAt: prev.live.ranAt, ids: prev.live.ids, results: prev.operations.map((o) => ({ id: o.id, ...o.live })) }
} else {
  step(`Probing ${API} (read-only; see scripts/api-audit/probe.mjs)`)
  const ranAt = new Date().toISOString()
  const r = await runProbes(API, ops, { log: (l) => process.stdout.write(`  ${l}\n`) })
  probes = { ranAt, ...r }
}
const probeById = new Map(probes.results.map((r) => [r.id, r]))

/* ------------------------------ classification ------------------------------ */

step('Classifying')
/* Public, but only meaningful with a real account's password or tokens. */
const SESSION_OPS = new Set([
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/refresh-token',
  'POST /api/v1/auth/logout',
])
const rows = ops.map((op) => {
  const key = `${op.method} ${op.normalized}`
  const calls = fe.calls.filter((c) => keyOfCall(c) === key)
  const consumers = calls.flatMap((c) => c.consumers)
  const reachable = consumers.filter((c) => c.reachable)
  const tests = contract.filter((t) => t.id === op.id)
  const live = probeById.get(op.id) ?? null
  const note = ANNOTATIONS[op.id] ?? {}

  const staticIssues = []
  for (const c of calls) {
    if (c.anonymous && !op.auth.public) staticIssues.push(`${c.fn} sends no token, but the operation requires: ${op.auth.needs.join(' / ')}`)
  }
  const contractFailures = tests.flatMap((t) => t.failures.map((f) => `${t.fn}: ${f}`))
  const liveTests = live?.tests ?? []
  const serverErrors = liveTests.filter((t) => t.serverError)
  const unexpected = liveTests.filter((t) => !t.pass && !t.serverError)

  let status
  let reason
  if (note.notApplicable) {
    status = 'not-applicable'
    reason = note.notApplicable
  } else if (!calls.length) {
    status = 'not-integrated'
    reason = note.gap ?? 'No API function calls this operation.'
  } else if (!reachable.length) {
    status = 'client-only'
    reason = note.redundantWith
      ? `Function exists but no screen calls it. Its data already reaches the UI through ${note.redundantWith}.`
      : note.gap ?? 'Function exists but no reachable screen calls it.'
  } else if (staticIssues.length || contractFailures.length || note.partial) {
    status = 'partial'
    reason = [...staticIssues, ...contractFailures, ...(note.partial ? [note.partial] : [])].join(' · ')
  } else if (serverErrors.length || unexpected.length) {
    status = 'test-failed'
    reason = [...serverErrors, ...unexpected]
      .map((t) => `${t.scenario}: expected ${t.expected}, got ${t.status}${t.code ? ` (${t.code})` : ''}`)
      .join(' · ')
  } else if (op.auth.public && op.method === 'GET' && liveTests.some((t) => t.realData)) {
    status = 'verified'
    reason = liveTests.map((t) => `${t.scenario} → ${t.status}`).join(' · ')
  } else if (!op.auth.public) {
    status = 'blocked'
    reason = `Needs a signed-in ${op.auth.needs.join(' / ')}; no test credentials were provided. Anonymous call → ${liveTests[0]?.status ?? 'not run'} (auth enforced).`
  } else if (op.method === 'GET') {
    status = 'blocked'
    reason = liveTests.some((t) => t.emptyList)
      ? `Route, envelope and paging verified live, but production returns an empty list, so no row was rendered (${liveTests.map((t) => `${t.scenario} → ${t.status}`).join(' · ')}).`
      : `Production has no record to read (${liveTests.map((t) => `${t.scenario} → ${t.status}`).join(' · ')}).`
  } else if (live?.skipped) {
    status = 'blocked'
    reason = live.skipped
  } else if (SESSION_OPS.has(op.id)) {
    status = 'blocked'
    reason = `A successful call needs a real account's password or tokens; none were provided. Only the rejection path was exercised: ${liveTests.map((t) => `${t.scenario} → ${t.status}`).join(' · ')}.`
  } else if (op.risk === 'read-only (POST)') {
    status = 'blocked'
    reason = `Read-only, but production has nothing to match (no discount codes exist). Only the rejection path was exercised: ${liveTests.map((t) => `${t.scenario} → ${t.status}`).join(' · ')}.`
  } else {
    status = 'blocked'
    reason = `Public ${op.risk} operation — a real call would ${op.risk === 'external side effects' ? 'send email/notifications or create accounts' : 'write production data'}. Only the rejection path was exercised: ${liveTests.map((t) => `${t.scenario} → ${t.status}`).join(' · ')}.`
  }

  return {
    id: op.id,
    method: op.method,
    route: op.route,
    operationId: op.operationId,
    tags: op.tags,
    summary: op.summary,
    parameters: op.parameters,
    requestBody: op.requestBody && {
      contentTypes: op.requestBody.contentTypes,
      schema: op.requestBody.schema,
      required: op.requestBody.required,
    },
    responses: op.responses,
    auth: op.auth,
    backendAction: op.backendAction,
    risk: op.risk,
    status,
    reason,
    blocker: status === 'blocked' ? blockerKind(op, liveTests) : null,
    frontend: calls.map((c) => ({
      function: c.fn,
      file: `${c.file}:${c.line}`,
      anonymous: c.anonymous,
      multipart: c.multipart,
    })),
    consumers: reachable.map((c) => ({
      file: `${c.file}:${c.line}`,
      routes: summarizeRoutes(c.routes),
    })),
    contract: tests.map(({ fn, pass, failures, thrownAfterRequest }) => ({ fn, pass, failures, thrownAfterRequest })),
    live: live ? { url: live.url, skipped: live.skipped, tests: liveTests } : null,
    note: note.redundantWith ? `Covered by ${note.redundantWith}` : note.comment ?? null,
    changedInThisRun: note.changed ?? null,
  }
})

function blockerKind(op, liveTests) {
  if (!op.auth.public || SESSION_OPS.has(op.id)) return 'credentials'
  if (op.method === 'GET' || op.risk === 'read-only (POST)') return 'test-data'
  if (liveTests.length === 0) return 'not-callable'
  return 'production-safety'
}

/** Shared modules land on many routes; keep the report readable. */
function summarizeRoutes(routes) {
  const byRole = new Map()
  for (const r of routes) {
    const role = r.roles.join('|')
    if (!byRole.has(role)) byRole.set(role, [])
    byRole.get(role).push(r.path)
  }
  return [...byRole].map(([role, paths]) => ({
    roles: role,
    paths: paths.length > 4 ? [...paths.slice(0, 4), `…+${paths.length - 4}`] : paths,
  }))
}

/* --------------------------------- output --------------------------------- */

const report = {
  generatedAt: new Date().toISOString(),
  spec: {
    source: `${API}/swagger/v1/swagger.json`,
    live: true,
    fetchedAt: specFetchedAt,
    openapi: spec.openapi,
    title: spec.info?.title,
    version: spec.info?.version,
    operations: ops.length,
    routes: new Set(ops.map((o) => o.normalized)).size,
    duplicatesCollapsed,
  },
  live: { base: API, ranAt: probes.ranAt, ids: probes.ids, credentials: false },
  frontend: {
    httpCalls: fe.calls.length,
    strayCalls: strayCalls.map((c) => `${c.method} ${c.template} (${c.fn})`),
    routes: fe.routes.length,
  },
  notificationLinks: { backendPaths: backendLinks.length, checks: navigation },
  contractTests: {
    total: contract.length,
    passed: contract.filter((t) => t.pass).length,
    extra: contract.filter((t) => t.fn.startsWith('refresh') || t.fn.startsWith('request (')),
  },
  operations: rows,
}

/* The project's own checks; their outcome goes into the report as run, not as claimed. */
const checks = []
if (!skipBuild) {
  for (const [name, script] of [
    ['TypeScript (npm run typecheck)', 'typecheck'],
    ['Production build (npm run build)', 'build'],
  ]) {
    step(name)
    const r = spawnSync('npm', ['run', script], { cwd: ROOT, shell: true, encoding: 'utf8' })
    const tail = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-3).join(' ')
    checks.push({ name, result: r.status === 0 ? 'pass' : `**fail** (exit ${r.status}): ${tail}` })
    console.log(`  ${r.status === 0 ? 'pass' : `fail — ${tail}`}`)
  }
}
checks.push({ name: 'Lint', result: 'no linter configured — `npm run lint` is an alias of `tsc -b`' })
checks.push({
  name: 'Unit/integration test suite',
  result: "none in the repository; this run's automated tests are the contract tests below",
})
report.checks = checks

fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`)
fs.writeFileSync(OUT_MD, renderMarkdown(report, checks))

const counts = {}
for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1
console.log('\n', counts, `\n  → ${path.relative(ROOT, OUT_JSON)}\n  → ${path.relative(ROOT, OUT_MD)}`)
