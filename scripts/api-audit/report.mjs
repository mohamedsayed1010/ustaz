/**
 * Renders Backedn/docs/frontend-api-coverage.md from the audit JSON. Every
 * number here is counted from `report.operations`; the totals are reconciled
 * against the operation count and the render fails if they do not add up.
 */
import { CHANGES } from './changes.mjs'

export const STATUS = {
  verified: 'Integrated and verified',
  'test-failed': 'Integrated, test failed',
  unverified: 'Integrated, unverified',
  partial: 'Partially integrated',
  'client-only': 'Client function only',
  'not-integrated': 'Not integrated',
  blocked: 'Blocked',
  'not-applicable': 'Not applicable to the current frontend',
}
const ORDER = Object.keys(STATUS)
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

export function renderMarkdown(report, checks = []) {
  const ops = report.operations
  const total = ops.length
  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`
  const count = (pred) => ops.filter(pred).length
  const by = (status) => count((o) => o.status === status)

  // Primary classification must account for every operation exactly once.
  const primary = Object.fromEntries(ORDER.map((s) => [s, by(s)]))
  const sum = Object.values(primary).reduce((a, b) => a + b, 0)
  if (sum !== total) throw new Error(`Status counts (${sum}) do not reconcile with ${total} operations`)

  const withFunction = count((o) => o.frontend.length > 0)
  const contractPass = count((o) => o.frontend.length > 0 && o.contract.length > 0 && o.contract.every((c) => c.pass))
  const withUi = count((o) => o.consumers.length > 0)
  const integrated = (o) => o.consumers.length > 0 && o.status !== 'not-applicable'
  const liveOk = (o) => o.status === 'verified'
  const contractOnly = (o) => integrated(o) && !liveOk(o) && o.contract.length > 0 && o.contract.every((c) => c.pass)
  const authEnforced = count((o) => !o.auth.public && o.live?.tests?.[0]?.status === 401)
  const protectedOps = count((o) => !o.auth.public)
  const redundant = ops.filter((o) => o.status === 'client-only' && o.note?.startsWith('Covered by'))
  const realGaps = ops.filter(
    (o) => (o.status === 'client-only' && !o.note?.startsWith('Covered by')) || o.status === 'not-integrated',
  )
  const blockers = {}
  for (const o of ops.filter((x) => x.status === 'blocked')) blockers[o.blocker] = (blockers[o.blocker] ?? 0) + 1
  const live = ops.flatMap((o) => (o.live?.tests ?? []).map((t) => ({ ...t, id: o.id })))
  const serverErrors = live.filter((t) => t.serverError)
  const nav = report.notificationLinks?.checks ?? []

  const L = []
  const p = (s = '') => L.push(s)
  const table = (head, rows) => {
    p(`| ${head.join(' | ')} |`)
    p(`|${head.map(() => '---').join('|')}|`)
    for (const r of rows) p(`| ${r.map((c) => String(c ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`)
    p()
  }

  p('# Frontend ⇄ API coverage')
  p()
  p(`Generated ${report.generatedAt} by \`node scripts/audit-api-coverage.mjs\` — do not edit by hand.`)
  p('The machine-readable twin, one row per operation, is [`frontend-api-coverage.json`](frontend-api-coverage.json).')
  p()

  /* ------------------------------- 1. inventory ------------------------------- */
  p('## 1. Swagger inventory')
  p()
  table(
    ['', ''],
    [
      ['Source', `${report.spec.live ? 'Live' : 'Local'} — ${report.spec.source}`],
      ['Fetched', report.spec.fetchedAt],
      ['Document', `${report.spec.title} ${report.spec.version} (OpenAPI ${report.spec.openapi})`],
      ['**Unique operations** (method + normalized route)', `**${total}**`],
      ['Unique routes (paths, any method)', report.spec.routes],
      ['Duplicates collapsed (same method + route under two names)', report.spec.duplicatesCollapsed],
      ['Operations requiring a signed-in caller (from controller attributes)', protectedOps],
      ['Public operations', total - protectedOps],
    ],
  )
  table(
    ['Method', 'Operations'],
    [...METHODS.map((m) => [m, count((o) => o.method === m)]), ['**Total**', `**${total}**`]],
  )
  p('Auth comes from the controllers, not the spec: Swagger puts Bearer on every operation and overrides none.')
  p('Every operation was matched to exactly one controller action (`backendAction` in the JSON).')
  p()

  /* -------------------------------- 2. coverage -------------------------------- */
  p('## 2. Frontend integration coverage')
  p()
  p(`Denominator for every percentage: the ${total} Swagger operations.`)
  p()
  p('### Primary status — each operation counted exactly once')
  p()
  table(
    ['Status', 'Operations', '%'],
    [...ORDER.map((s) => [STATUS[s], primary[s], pct(primary[s])]), ['**Total**', `**${sum}**`, '100%']],
  )
  if (primary.blocked) {
    p('Blocked, by blocker:')
    p()
    table(
      ['Blocker', 'Operations'],
      Object.entries(blockers).map(([k, v]) => [
        {
          credentials: 'No test credentials — needs a signed-in role (or a real password/token)',
          'test-data': 'Public read, but production has no record to read (or returns an empty list)',
          'production-safety': 'Public mutation — a real call would write production data or send email',
          'not-callable': 'Not callable from a client',
        }[k] ?? k,
        v,
      ]),
    )
  }
  p('### Secondary metrics — these overlap, they are not a partition')
  p()
  table(
    ['Metric', 'Operations', '%'],
    [
      ['Have a typed API function in `src/api`', withFunction, pct(withFunction)],
      ['…whose request passes the contract test (method, path, query, body, headers)', contractPass, pct(contractPass)],
      ['Called from a reachable screen (route → page → component, via the import graph)', withUi, pct(withUi)],
      ['Verified against the live API with real data', primary.verified, pct(primary.verified)],
      ['Protected operations whose auth requirement was confirmed live (anonymous → 401)', `${authEnforced} of ${protectedOps}`, pct(authEnforced)],
      ['Client function only, and redundant (same data reaches the UI another way)', redundant.length, pct(redundant.length)],
      ['Client function only or not integrated, and a real gap', realGaps.length, pct(realGaps.length)],
    ],
  )

  /* ------------------------------- 3. by method ------------------------------- */
  p('## 3. Method-by-method')
  p()
  table(
    ['Method', 'In Swagger', 'In the UI', 'Verified live', 'Contract-tested only', 'Failed', 'Blocked / not tested', 'Not in the UI'],
    METHODS.filter((m) => count((o) => o.method === m) > 0).map((m) => {
      const mo = ops.filter((o) => o.method === m)
      return [
        m,
        mo.length,
        mo.filter(integrated).length,
        mo.filter(liveOk).length,
        mo.filter(contractOnly).length,
        mo.filter((o) => o.status === 'test-failed' || o.status === 'partial').length,
        mo.filter((o) => o.status === 'blocked' || o.status === 'unverified').length,
        mo.filter((o) => !o.consumers.length).length,
      ]
    }),
  )
  p('"Contract-tested only": the screen calls it, the wrapper\'s request matched the spec in the stubbed-fetch test, but no live call proved the behaviour. "Not in the UI" includes not-applicable, client-only and not-integrated.')
  p()

  /* --------------------------- 4. gaps and failures --------------------------- */
  p('## 4. Unintegrated and failed operations')
  p()
  const attention = ops.filter((o) => ['test-failed', 'partial', 'not-integrated'].includes(o.status) || realGaps.includes(o))
  if (!attention.length) p('None.')
  else
    table(
      ['Operation', 'operationId', 'Status', 'Expected consumer', 'What is missing / evidence', 'Next action'],
      attention.map((o) => [
        `\`${o.id}\``,
        o.operationId ?? '—',
        STATUS[o.status],
        o.consumers[0]?.routes?.[0]?.paths?.[0] ?? '—',
        o.reason,
        o.status === 'not-applicable' ? '—' : 'Build the workflow described',
      ]),
    )
  p(`### Client functions with no screen, because the data already reaches the UI (${redundant.length})`)
  p()
  table(
    ['Operation', 'Covered by'],
    redundant.map((o) => [`\`${o.id}\``, o.note.replace(/^Covered by /, '')]),
  )
  p('### Not applicable')
  p()
  table(['Operation', 'Reason'], ops.filter((o) => o.status === 'not-applicable').map((o) => [`\`${o.id}\``, o.reason]))

  /* ---------------------------- live test evidence ---------------------------- */
  p('## Live test evidence')
  p()
  p(`Environment: ${report.live.base}, run ${report.live.ranAt}, **no credentials** (anonymous only). Read-only by construction — see \`scripts/api-audit/probe.mjs\`.`)
  p()
  const groups = {}
  for (const t of live) {
    const key = `${t.scenario} — expected ${Array.isArray(t.expected) ? t.expected.join('/') : t.expected}`
    groups[key] ??= { total: 0, pass: 0, statuses: {} }
    groups[key].total++
    if (t.pass) groups[key].pass++
    groups[key].statuses[t.status] = (groups[key].statuses[t.status] ?? 0) + 1
  }
  table(
    ['Scenario', 'Requests', 'As expected', 'Observed status codes'],
    Object.entries(groups)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([k, v]) => [k, v.total, v.pass, Object.entries(v.statuses).map(([s, n]) => `${s}×${n}`).join(', ')]),
  )
  p(`Server errors (5xx or unreachable): **${serverErrors.length}**${serverErrors.length ? ` — ${serverErrors.map((t) => `\`${t.id}\` ${t.status}`).join(', ')}` : ''}.`)
  const unexpected = live.filter((t) => !t.pass && !t.serverError)
  if (unexpected.length) {
    p()
    p('Unexpected (non-5xx) results:')
    p()
    table(
      ['Operation', 'Scenario', 'Expected', 'Got', 'Code'],
      unexpected.map((t) => [`\`${t.id}\``, t.scenario, Array.isArray(t.expected) ? t.expected.join('/') : t.expected, t.status, t.code ?? '']),
    )
  }
  p(`Verified with real data: ${ops.filter(liveOk).map((o) => `\`${o.id}\``).join(', ') || 'none'}.`)
  p()

  /* ------------------------- notification destinations ------------------------- */
  p('## Notification and email destinations')
  p()
  const navFail = nav.filter((n) => !n.pass)
  p(`${report.notificationLinks?.backendPaths ?? 0} distinct link paths in the backend's notification and email catalogs, resolved for every role by \`notificationHref\` (src/lib/navigation.ts): **${nav.length - navFail.length}/${nav.length}** land on a route the router defines.`)
  p()
  if (navFail.length) table(['Backend path', 'Role', 'Resolved to'], navFail.map((n) => [n.path, n.role, n.href]))

  /* --------------------------------- 5. changes --------------------------------- */
  p('## 5. Changes made in this run')
  p()
  table(['File', 'Change'], CHANGES.files.map((c) => [`\`${c.file}\``, c.change]))
  p('### Checks executed')
  p()
  table(['Check', 'Result'], checks.map((c) => [c.name, c.result]))
  table(
    ['Automated test', 'Result'],
    [
      [
        'Contract tests (stubbed fetch, no network)',
        `${report.contractTests.passed}/${report.contractTests.total} pass — ${report.contractTests.total - report.contractTests.extra.length} wrapper calls + ${report.contractTests.extra.length} token-refresh flows`,
      ],
      ['Notification-destination checks', `${nav.length - navFail.length}/${nav.length} pass`],
      ['Live probes', `${live.filter((t) => t.pass).length}/${live.length} as expected`],
    ],
  )
  if (CHANGES.browser?.length) {
    p('### Browser checks (Chrome, dev server proxied to the live API)')
    p()
    table(['Screen', 'What was checked', 'Result'], CHANGES.browser.map((b) => [b.screen, b.checked, b.result]))
  }

  /* -------------------------------- 6. conclusion -------------------------------- */
  p('## 6. Conclusion')
  p()
  const n = (x) => `**${x}**`
  p(`1. Operations in Swagger: ${n(total)} (${METHODS.map((m) => `${count((o) => o.method === m)} ${m}`).join(', ')}).`)
  p(`2. With a correct frontend API function (exists and passes the contract test): ${n(contractPass)} of ${withFunction} functions present.`)
  p(`3. Connected to a reachable UI workflow: ${n(withUi)}.`)
  p(`4. Verified against the real backend with real data: ${n(primary.verified)}. A further ${authEnforced} protected operations had only their auth requirement confirmed (anonymous → 401), which does not verify their behaviour.`)
  p(`5. Not integrated into the UI: ${n(total - withUi)} — ${primary['not-applicable']} not applicable, ${redundant.length} redundant with an integrated operation, ${realGaps.length} real gap${realGaps.length === 1 ? '' : 's'}.`)
  p(`6. Failed: ${n(primary['test-failed'] + primary.partial)} (${primary['test-failed']} live failures, ${primary.partial} partial integrations). Live server errors: ${serverErrors.length}.`)
  p(`7. Unverified or blocked: ${n(primary.blocked + primary.unverified)} — ${Object.entries(blockers).map(([k, v]) => `${v} ${k}`).join(', ')}.`)
  p(`8. All relevant endpoints integrated: ${realGaps.length ? `**no** — remaining: ${realGaps.map((o) => `\`${o.id}\``).join(', ')}.` : '**yes**.'}`)
  p('9. What prevents complete real-backend verification: no test credentials or staging environment were provided, so every protected operation can only be shown to refuse anonymous callers; production holds no teachers, groups or courses, so public detail reads have nothing to return; and public mutations (registration, password reset, inquiries) would create accounts, rows or emails in production. A staging deployment with seeded test accounts for each role (student, teacher, assistant, parent, admin) would unblock all of them.')
  p()

  /* ------------------------------ appendix: all ops ------------------------------ */
  p('## Appendix — every operation')
  p()
  table(
    ['Operation', 'Auth', 'Status', 'Frontend function', 'Screen', 'Live'],
    ops.map((o) => [
      `\`${o.id}\``,
      o.auth.public ? 'public' : o.auth.needs.join(' / '),
      STATUS[o.status],
      o.frontend.map((f) => f.function).join(', ') || '—',
      o.consumers.flatMap((c) => c.routes.flatMap((r) => r.paths)).slice(0, 2).join(', ') || '—',
      o.live?.skipped ? 'not called' : (o.live?.tests ?? []).map((t) => t.status).join('/') || '—',
    ]),
  )
  return L.join('\n')
}
