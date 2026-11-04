# PROGRESS.md

Status tracker for AI agents. Update after every phase.

## Current stage

**Phase 4 — complete.** Phase 5 documentation site was committed earlier
(`fa9b85d`); visual polish + logo and Phase 6 release work follow.

## Phase status

| Phase | Title                                  | Status         |
| ----- | -------------------------------------- | -------------- |
| 1     | Project Foundation                     | ✅ done        |
| 2     | NestJS Module and Public API           | ✅ done        |
| 3     | Core Honeypot Functionality            | ✅ done        |
| 4     | Integration Tests + Feature Gap Review | ✅ done        |
| 5     | VitePress Documentation + README       | ⬜ not started |
| 6     | Final QA + Release Readiness           | ⬜ not started |

## Phase 1 — completed work

- pnpm project, package metadata, exports map (`.js` ESM / `.cjs` CJS with
  `.d.ts` / `.d.cts`), files list = `dist`.
- tsdown dual build; Vitest + V8 coverage; Biome (docs excluded); VitePress
  scaffold; MIT LICENSE.
- Toolchain: TypeScript ^5.9.3, tsdown 0.23, vitest 5.1, vitepress 1.6,
  biome 2.6, NestJS 12.3.2 dev deps. Node 24 dev runtime, `engines.node >= 20`.

## Phase 2 — completed work

Source files: `honeypot.constants.ts`, `honeypot.types.ts`,
`honeypot.options.ts`, `honeypot.middleware.ts`, `honeypot.module.ts`,
`index.ts`.

- `HoneypotModule.forRoot` / `forRootAsync` with `imports`, `inject`, sync and
  async factories. Options resolved + validated via a factory provider so
  invalid config fails during application initialization (compile rejects).
- Path validation: non-empty absolute path, not `/`, no `?`/`#`.
- Middleware registered via `forRoutes('*splat')` (Nest 11/12 path-to-regexp
  v8 wildcard); matches at request time: case-insensitive, trailing-slash
  equivalent, nested paths, `/administrator` not matched, query/fragment
  ignored. Placeholder 200 termination for matches (real responses in
  Phase 3).
- Public exports: `HoneypotModule`, `HoneypotModuleOptions`,
  `HoneypotModuleAsyncOptions`, `HoneypotLogger`, `HoneypotHitEvent`,
  `HONEYPOT_HIT_EVENT`. Internal token `HONEYPOT_OPTIONS` not exported.
- 35 tests pass (validation, path matching, module wiring incl. supertest
  HTTP checks through a real Nest/Express app).
- Build verified: decorators compile through tsdown (`__decorate` output),
  `@nestjs/*` externalized in both ESM and CJS, both formats importable.

### Critical findings for later phases

- **Express 5 strips `req.url` inside wildcard-mounted middleware.** Nest
  registers `forRoutes('*splat')` middleware as `app.use('/*splat', ...)`, so
  inside `use()` `req.url === '/'` while `req.originalUrl` holds the real
  request path. `HoneypotMiddleware` therefore reads
  `request.originalUrl ?? request.url` (type `HoneypotRequest`). Fastify path
  must be checked in Phase 4 — raw Node middleware may not have `originalUrl`.
- Biome needs `javascript.parser.unsafeParameterDecoratorsEnabled: true` for
  Nest constructor `@Inject` parameter decorators.
- `useFactory` in `HoneypotModuleAsyncOptions` is typed `(...args: never[])`
  so user factories with concrete parameter types stay assignable without
  `any`; the provider calls it with injected deps.

## Phase 3 — completed work

New files: `src/honeypot.path.ts` (matching + pathname extraction, moved out
of the middleware), `src/template.ts` (escapeHtml + renderDefaultLoginPage),
`test/unit/{template,middleware}.test.ts`.

- Default response: built-in HTML5 admin login page (inline CSS only, no
  external refs), POST form action = configured path, HTML-escaped, 200 +
  `text/html; charset=utf-8` + `Cache-Control: no-store`. Submitted
  credentials never read.
- `customHtml`: raw string served as-is (empty string works — checked with
  `!== undefined`, not truthiness), same headers.
- `fakeAdminUrl`: 302 + Location; precedence redirect > customHtml > default.
  Validated at config time: absolute http/https or root-relative only;
  rejects javascript:/data:/ftp:/protocol-relative; rejects relative
  destinations inside the protected path (redirect loop). Absolute URLs are
  not loop-checked (origin unknown at config time).
- Logger: one `warn` per hit — method, path, ip, user-agent truncated to 200
  chars. No bodies/credentials. Logger throw isolated with try/catch.
- Events: `HONEYPOT_HIT_EVENT` = 'honeypotHit' via options.eventEmitter for
  every response mode, once per request; payload `{ ip, userAgent, method,
  path, timestamp }` (ISO 8601, no query/body). Listener throws isolated.
- IP: `request.ip` if a non-empty string, else `socket.remoteAddress`, else
  null. X-Forwarded-For never parsed.

80 tests pass; coverage ~99% statements. Commit
`feat: implement honeypot responses, logging, events, and url validation`.

## Phase 4 — completed work

`test/integration/express.test.ts` (19 tests) and
`test/integration/fastify.test.ts` (18 tests), real Nest apps through
supertest. Total suite: 123 tests.

Covered on **both** adapters: default + custom path, nested paths, trailing
slash, case-insensitivity, all HTTP methods, HEAD, unrelated paths (incl.
`/administrator`) reaching their controllers, query strings ignored, default
template + headers, custom HTML, 302 redirect, logger (once per hit, not on
other routes), events (once per hit, also on redirects), `forRootAsync`,
global prefix (`/api/admin`, bare `/admin` not intercepted), raw-socket
request without User-Agent (IP falls back to the socket address).

### Fastify findings

- `req.originalUrl` **is** available on Fastify middleware requests (Nest's
  Fastify adapter mounts middleware through `@fastify/middie`, which sets
  it), and the `req.url ?? originalUrl` fallback is not needed. The
  `originalUrl ?? url` read in `HoneypotMiddleware` works on both adapters;
  no production change was required.
- Fastify middleware receives the raw Node `IncomingMessage`, which has no
  `ip`; the IP therefore comes from `socket.remoteAddress` on Fastify and
  from `request.ip` on Express. Behind a proxy both report the proxy unless
  the app is configured for trusted proxies (documented in `security.md`).
- Fastify instances must be `ready()` before supertest can use
  `getHttpServer()`; the test helper `initFastifyApp` does this.

### Feature gap review

| Requirement                                    | Status                                   |
| ---------------------------------------------- | ---------------------------------------- |
| Configurable path, default `/admin`            | ✅ validated, case/slash/nested matching |
| Default fake login page, no external assets    | ✅ escaped, `no-store`                   |
| `customHtml` served as-is                      | ✅ incl. empty string                    |
| `fakeAdminUrl` 302, beats `customHtml`         | ✅ scheme/loop validation                |
| Logger integration (default Nest `Logger`)     | ✅ one `warn` per hit, error-isolated    |
| EventEmitter `honeypotHit` events              | ✅ every response mode, error-isolated   |
| `forRoot` / `forRootAsync`                     | ✅ both adapters                         |
| Express + Fastify support                      | ✅ verified by integration tests         |
| No runtime dependencies, ESM + CJS + types     | ✅ (consumer check in Phase 6)           |
| Never reads bodies/credentials, no XFF parsing | ✅                                       |

Gap found and fixed during the review (`fix: match encoded and repeated-slash
request paths`):

- Fastify decodes the URL before routing, so `/%61dmin` bypassed the honeypot
  and reached a real `/admin` route; `//admin` and configured non-ASCII paths
  (request side is percent-encoded UTF-8) were never matched either. Matching
  now compares percent-decoded paths with repeated slashes collapsed
  (`honeypot.path.ts`, malformed escapes fall back to ASCII-only decoding).
  Only the comparison is normalized: logs and events keep the raw pathname,
  so `%0A` cannot inject lines into log output. Regression tests: unit +
  both adapters with a shadowed real `/admin` controller.

Known limitations (no code change):

- Dot segments (`/./admin`) and path parameters (`/admin;x=1`) are compared
  literally. Mainstream clients normalize dot segments before sending, and
  neither adapter routes `;` variants to the real `/admin` route.
- Absolute `fakeAdminUrl` values are not loop-checked (origin unknown at
  configuration time).

## Definition of done (final, phase 6)

See AGENTS.md phase list; all commands green; `pnpm pack` archive clean; ESM +
CJS consumers verified; no publishing.
