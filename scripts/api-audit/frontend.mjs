/**
 * Static analysis of the frontend's API layer, done with the TypeScript compiler
 * so it sees what the type checker sees rather than what a regex guesses:
 *
 * - every HTTP call in src/api (method, path template, query/body types, options)
 * - the `xxxApi.fn` wrapper each call lives in
 * - every reference to that wrapper outside src/api (via the language service,
 *   so aliases and destructuring are followed)
 * - whether each referencing file is reachable from src/main.tsx, and which
 *   routes (with their role guards) pull it in
 */
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const HTTP_HELPERS = new Set(['get', 'post', 'put', 'patch', 'delete', 'upload', 'download'])

export function analyzeFrontend(root) {
  const src = path.join(root, 'src')
  const configPath = path.join(root, 'tsconfig.app.json')
  const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'))
    },
  })
  const options = parsed.options
  const fileNames = parsed.fileNames.map(norm)

  const host = {
    getScriptFileNames: () => fileNames,
    getScriptVersion: () => '1',
    getScriptSnapshot: (f) =>
      fs.existsSync(f) ? ts.ScriptSnapshot.fromString(fs.readFileSync(f, 'utf8')) : undefined,
    getCurrentDirectory: () => root,
    getCompilationSettings: () => options,
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  }
  const service = ts.createLanguageService(host, ts.createDocumentRegistry())
  const program = service.getProgram()
  const checker = program.getTypeChecker()
  const rel = (f) => path.relative(root, f).split(path.sep).join('/')

  /* ------------------------------ import graph ----------------------------- */

  const graph = new Map() // file -> Set(files), static + dynamic
  const staticGraph = new Map() // file -> Set(files), static only
  for (const sf of program.getSourceFiles()) {
    const file = norm(sf.fileName)
    if (!file.startsWith(norm(src))) continue
    const all = new Set()
    const stat = new Set()
    const add = (spec, isStatic) => {
      const r = ts.resolveModuleName(spec, sf.fileName, options, ts.sys).resolvedModule
      if (!r || r.isExternalLibraryImport) return
      const target = norm(r.resolvedFileName)
      all.add(target)
      if (isStatic) stat.add(target)
    }
    const visit = (node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        // `import type` never reaches the bundle.
        const typeOnly = ts.isImportDeclaration(node)
          ? node.importClause?.isTypeOnly
          : node.isTypeOnly
        if (!typeOnly) add(node.moduleSpecifier.text, true)
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        add(node.arguments[0].text, false)
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    graph.set(file, all)
    staticGraph.set(file, stat)
  }

  const closure = (starts, g) => {
    const seen = new Set()
    const stack = [...starts]
    while (stack.length) {
      const f = stack.pop()
      if (seen.has(f)) continue
      seen.add(f)
      for (const n of g.get(f) ?? []) stack.push(n)
    }
    return seen
  }
  const reachable = closure([norm(path.join(src, 'main.tsx'))], graph)

  /* --------------------------------- routes -------------------------------- */

  const routes = analyzeRoutes(program, norm(path.join(src, 'routes', 'index.tsx')), options)
  for (const r of routes) r.files = closure(r.entryFiles, staticGraph)

  /* ------------------------------- API calls ------------------------------- */

  const calls = []
  const apiDir = norm(path.join(src, 'api'))
  for (const sf of program.getSourceFiles()) {
    const file = norm(sf.fileName)
    if (!file.startsWith(apiDir) || file.endsWith('schema.ts')) continue
    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        const call = readCall(node, sf, checker)
        if (call) calls.push({ ...call, file: rel(file) })
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }

  /* ------------------------------ consumers -------------------------------- */

  for (const call of calls) {
    call.consumers = []
    if (!call.declPos) continue
    const refs = service.findReferences(path.join(root, call.file), call.declPos) ?? []
    const seen = new Set()
    for (const group of refs) {
      for (const ref of group.references) {
        if (ref.isDefinition) continue
        const f = norm(ref.fileName)
        // References inside the API layer are re-exports, not consumers — except
        // client.ts, which is where the silent token refresh is wired in.
        if (f.startsWith(apiDir) && !f.endsWith(`${path.sep}client.ts`)) continue
        const sf = program.getSourceFile(ref.fileName)
        const { line } = sf.getLineAndCharacterOfPosition(ref.textSpan.start)
        const key = `${f}:${line}`
        if (seen.has(key)) continue
        seen.add(key)
        call.consumers.push({
          file: rel(f),
          line: line + 1,
          reachable: reachable.has(f),
          routes: routes
            .filter((r) => r.files.has(f))
            .map((r) => ({ path: r.path, roles: r.roles })),
        })
      }
    }
    delete call.declPos
  }

  return { calls, routes: routes.map(({ files, entryFiles, ...r }) => r) }
}

/* -------------------------------------------------------------------------- */

function norm(f) {
  return path.normalize(f)
}

/** One `api.x(...)`, `request(...)` or `fetch(buildUrl(...))` call, or null. */
function readCall(node, sf, checker) {
  const callee = node.expression
  let method
  let pathArg
  let queryExpr
  let bodyExpr
  let optionsExpr
  let helper

  if (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === 'api' &&
    HTTP_HELPERS.has(callee.name.text)
  ) {
    helper = callee.name.text
    method = helper === 'upload' ? 'POST' : helper === 'download' ? 'GET' : helper.toUpperCase()
    pathArg = node.arguments[0]
    if (helper === 'get') {
      queryExpr = node.arguments[1]
      optionsExpr = node.arguments[2]
    } else if (helper === 'delete' || helper === 'download') {
      optionsExpr = node.arguments[1]
    } else {
      bodyExpr = node.arguments[1]
      optionsExpr = node.arguments[2]
    }
  } else if (ts.isIdentifier(callee) && callee.text === 'request') {
    helper = 'request'
    pathArg = node.arguments[0]
    optionsExpr = node.arguments[1]
    method = 'GET'
  } else if (
    ts.isIdentifier(callee) &&
    callee.text === 'fetch' &&
    node.arguments[0] &&
    ts.isCallExpression(node.arguments[0]) &&
    ts.isIdentifier(node.arguments[0].expression) &&
    node.arguments[0].expression.text === 'buildUrl'
  ) {
    helper = 'fetch'
    pathArg = node.arguments[0].arguments[0]
    optionsExpr = node.arguments[1]
    method = 'GET'
  } else {
    return null
  }

  const template = pathTemplate(pathArg)
  if (!template) return null

  const opts = {}
  if (optionsExpr && ts.isObjectLiteralExpression(optionsExpr)) {
    for (const p of optionsExpr.properties) {
      if (!ts.isPropertyAssignment(p) && !ts.isShorthandPropertyAssignment(p)) continue
      const name = p.name.getText(sf)
      const init = ts.isPropertyAssignment(p) ? p.initializer : p.name
      if (name === 'method' && ts.isStringLiteral(init)) method = init.text
      else if (name === 'query') queryExpr = init
      else if (name === 'body') bodyExpr = init
      else if (name === 'form') opts.form = true
      else if (name === 'anonymous') opts.anonymous = init.kind === ts.SyntaxKind.TrueKeyword
      else if (name === 'raw') opts.raw = init.kind === ts.SyntaxKind.TrueKeyword
    }
  }
  if (helper === 'upload') opts.form = true
  if (helper === 'fetch') {
    // The refresh call hand-builds its init; read the method off it.
    const m = optionsExpr?.getText(sf).match(/method:\s*'(\w+)'/)
    if (m) method = m[1]
  }

  const owner = ownerName(node, sf)
  return {
    method,
    template: template.replace(/\?.*$/, ''),
    helper,
    fn: owner.name,
    declPos: owner.pos,
    // Only the outermost wrapper (the `xxxApi.fn` itself) can be called from outside.
    sampleArgs: owner.fnNode ? sampleArgs(owner.fnNode, checker) : null,
    line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
    anonymous: !!opts.anonymous,
    multipart: !!opts.form,
    raw: !!opts.raw,
    queryKeys: queryExpr ? keysOf(queryExpr, checker) : null,
    bodyKeys: bodyExpr && !opts.form ? keysOf(bodyExpr, checker) : null,
    hasBody: !!bodyExpr || !!opts.form,
    bodyText: bodyExpr ? bodyExpr.getText(sf).slice(0, 80) : null,
  }
}

/** '/x/${id}/y' → '/x/{}/y'. Null for anything not built from literals. */
function pathTemplate(arg) {
  if (!arg) return null
  if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) return arg.text
  if (ts.isTemplateExpression(arg)) {
    let out = arg.head.text
    for (const span of arg.templateSpans) out += `{}${span.literal.text}`
    return out
  }
  return null
}

/** Property names a query/body expression can carry, from its static type. */
function keysOf(expr, checker) {
  let e = expr
  // JSON.stringify({ … }) (the hand-built refresh call) → the object itself.
  if (
    ts.isCallExpression(e) &&
    ts.isPropertyAccessExpression(e.expression) &&
    e.expression.getText() === 'JSON.stringify'
  ) {
    e = e.arguments[0]
  }
  // params(query) → look at what was passed in.
  if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'params') {
    e = e.arguments[0]
  }
  if (!e) return null
  if (ts.isObjectLiteralExpression(e)) {
    const keys = []
    for (const p of e.properties) {
      if (ts.isSpreadAssignment(p)) {
        keys.push(...(keysOfType(checker.getTypeAtLocation(p.expression), checker) ?? []))
      } else if (p.name) {
        keys.push(p.name.getText())
      }
    }
    return [...new Set(keys)]
  }
  return keysOfType(checker.getTypeAtLocation(e), checker)
}

function keysOfType(type, checker) {
  if (!type) return null
  const flags = type.getFlags()
  if (flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return null
  // Primitive and array bodies have no keys to compare.
  if (flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BooleanLike)) return []
  if (checker.isArrayType?.(type)) return []
  const props = type.isUnion()
    ? [...new Set(type.types.flatMap((t) => checker.getPropertiesOfType(t).map((p) => p.name)))]
    : checker.getPropertiesOfType(type).map((p) => p.name)
  return props
}

/** `teachersApi.list` for a call nested in `export const teachersApi = { list: () => … }`. */
function ownerName(node, sf) {
  const names = []
  let pos
  let fnNode
  let n = node.parent
  while (n) {
    if (ts.isPropertyAssignment(n) || ts.isMethodDeclaration(n)) {
      names.unshift(n.name.getText(sf))
      pos ??= n.name.getStart(sf)
      if (!fnNode) {
        const init = ts.isPropertyAssignment(n) ? n.initializer : n
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init) || ts.isMethodDeclaration(init))
          fnNode = init
      }
    } else if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      // `const response = await fetch(...)` is a local, not the wrapper's name.
      n.initializer &&
      (ts.isObjectLiteralExpression(n.initializer) ||
        ts.isArrowFunction(n.initializer) ||
        ts.isFunctionExpression(n.initializer))
    ) {
      names.unshift(n.name.text)
      pos ??= n.name.getStart(sf)
      break
    } else if (ts.isFunctionDeclaration(n) && n.name) {
      names.unshift(n.name.text)
      pos ??= n.name.getStart(sf)
      fnNode ??= n
      break
    }
    n = n.parent
  }
  return { name: names.join('.'), pos, fnNode }
}

/* ------------------------------ sample arguments ----------------------------- */

let sentinel = 0
/** Distinct, valid-looking UUIDs so each path segment can be traced back to its argument. */
const nextId = () => `aaaaaaaa-0000-4000-8000-${String(++sentinel).padStart(12, '0')}`

/**
 * One JSON-safe sample per parameter of a wrapper, derived from its declared
 * type. Files are encoded as { __file: name } and rebuilt by the test harness.
 */
function sampleArgs(fn, checker) {
  return fn.parameters.map((p) => {
    const name = p.name.getText()
    const type = checker.getTypeAtLocation(p)
    return { name, optional: !!p.questionToken || !!p.initializer, value: sampleOf(type, name, checker, 0) }
  })
}

function sampleOf(type, name, checker, depth) {
  const flags = type.getFlags()
  const symName = type.getSymbol()?.getName()
  if (symName === 'File' || symName === 'Blob') return { __file: name }
  if (symName === 'FormData') return { __formData: name }
  if (type.isUnion()) {
    const parts = type.types.filter(
      (t) => !(t.getFlags() & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)),
    )
    if (parts.length && parts.every((t) => t.isLiteral() || t.getFlags() & ts.TypeFlags.BooleanLiteral)) {
      const first = parts[0]
      if (first.getFlags() & ts.TypeFlags.BooleanLiteral) return true
      return first.value
    }
    if (parts.length) return sampleOf(parts[0], name, checker, depth)
    return null
  }
  if (type.isStringLiteral() || type.isNumberLiteral()) return type.value
  if (flags & ts.TypeFlags.StringLike) {
    if (/(^id$|Id$|Ids?$|^code$|slug|token)/i.test(name)) return /code|slug|token/i.test(name) ? `s-${name}-${++sentinel}` : nextId()
    if (/(date|at|from|to|time|until|since)$/i.test(name)) return '2026-01-01T10:00:00.000Z'
    if (/email/i.test(name)) return 'audit@example.invalid'
    return `sample-${name}`
  }
  if (flags & ts.TypeFlags.NumberLike) return 1
  if (flags & ts.TypeFlags.BooleanLike) return true
  if (checker.isArrayType(type)) {
    const [elem] = checker.getTypeArguments(type)
    return elem ? [sampleOf(elem, name.replace(/s$/, ''), checker, depth + 1)] : []
  }
  if (depth > 3) return {}
  const props = checker.getPropertiesOfType(type)
  if (!props.length) return {}
  const out = {}
  for (const prop of props) {
    const decl = prop.valueDeclaration ?? prop.declarations?.[0]
    if (!decl) continue
    out[prop.name] = sampleOf(checker.getTypeOfSymbolAtLocation(prop, decl), prop.name, checker, depth + 1)
  }
  return out
}

/**
 * Walks the `routes` array in src/routes/index.tsx: full path, role guard and the
 * modules that render it (lazy page modules plus the layouts wrapped around it).
 */
function analyzeRoutes(program, routesFile, options) {
  const sf = program.getSourceFile(routesFile)
  if (!sf) return []
  const resolve = (spec) => {
    const r = ts.resolveModuleName(spec, sf.fileName, options, ts.sys).resolvedModule
    return r ? norm(r.resolvedFileName) : null
  }

  // Identifier → module file, for both `import { X }` and `const X = lazy(() => import(...))`.
  const idToFile = new Map()
  const visitTop = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const f = resolve(node.moduleSpecifier.text)
      const clause = node.importClause
      if (f && clause) {
        if (clause.name) idToFile.set(clause.name.text, f)
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const el of clause.namedBindings.elements) idToFile.set(el.name.text, f)
        }
      }
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const text = node.initializer.getText(sf)
      const m = text.match(/^lazy\([\s\S]*?import\('([^']+)'\)/)
      if (m) {
        const f = resolve(m[1])
        if (f) idToFile.set(node.name.text, f)
      }
    }
    ts.forEachChild(node, visitTop)
  }
  visitTop(sf)

  const out = []
  const walkRoute = (obj, parentPath, parentRoles, parentEntries) => {
    let p = parentPath
    let roles = parentRoles
    const entries = [...parentEntries]
    let isIndex = false
    let children
    for (const prop of obj.properties) {
      if (!ts.isPropertyAssignment(prop)) continue
      const name = prop.name.getText(sf)
      if (name === 'path' && ts.isStringLiteral(prop.initializer)) {
        const seg = prop.initializer.text
        p = seg.startsWith('/') ? seg : `${parentPath.replace(/\/$/, '')}/${seg}`
      } else if (name === 'index') {
        isIndex = true
      } else if (name === 'element') {
        const text = prop.initializer.getText(sf)
        const rm = text.match(/RequireRole\s+roles=\{\[([^\]]*)\]\}/)
        if (rm) roles = rm[1].split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean)
        for (const id of text.matchAll(/\b([A-Z][A-Za-z0-9]+)\b/g)) {
          const f = idToFile.get(id[1])
          if (f) entries.push(f)
        }
      } else if (name === 'children' && ts.isArrayLiteralExpression(prop.initializer)) {
        children = prop.initializer
      }
    }
    if (children) {
      for (const c of children.elements) {
        if (ts.isObjectLiteralExpression(c)) walkRoute(c, p, roles, entries)
      }
    } else {
      out.push({ path: isIndex ? parentPath : p, roles: roles ?? ['public'], entryFiles: entries })
    }
  }
  const visitRoutes = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'routes' &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      for (const el of node.initializer.elements) {
        if (ts.isObjectLiteralExpression(el)) walkRoute(el, '', null, [])
      }
      return
    }
    ts.forEachChild(node, visitRoutes)
  }
  visitRoutes(sf)
  return out
}
