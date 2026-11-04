# PROGRESS.md

Status tracker for AI agents. Update after every phase.

## Current stage

**Phase 3 — Core Honeypot Functionality** (next; Phase 2 complete, awaiting
owner approval to continue)

## Phase status

| Phase | Title                                  | Status         |
| ----- | -------------------------------------- | -------------- |
| 1     | Project Foundation                     | ✅ done        |
| 2     | NestJS Module and Public API           | ✅ done        |
| 3     | Core Honeypot Functionality            | ⬜ next        |
| 4     | Integration Tests + Feature Gap Review | ⬜ not started |
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

## Phase 3 — what to do

In `src/`:

1. Finalize response behavior in `HoneypotMiddleware`:
   - default built-in HTML admin login page (`template.ts`): valid HTML5,
     username/password inputs, POST form whose action uses the CONFIGURED
     path (never hardcoded `/admin`), HTML-escape interpolated values, status
     200, `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-store`.
   - `customHtml`: raw HTML as-is, correct content type, empty string wins
     over default (do not treat '' as falsy-default), no filesystem APIs.
   - `fakeAdminUrl`: 302 redirect to Location header; relative paths and
     absolute http/https only; reject unsafe schemes; consider redirect-loop
     when destination is inside the protected path; precedence redirect >
     customHtml > default (document + test).
2. Logger: `logger.warn(...)` on every hit with method, path, ip (metadata
   only — never bodies/credentials/cookies/auth headers; bound user-agent).
   Logger failure must not break the response (try/catch).
3. Events: optional `EventEmitter`, emit `HONEYPOT_HIT_EVENT` =
   `'honeypotHit'` for EVERY response mode, at most once per request, payload
   `HoneypotHitEvent` (ip|null, userAgent, method, path, ISO timestamp, no
   query/body). Isolate listener sync exceptions. Skip when not configured.
4. IP: `request.ip` only if genuinely present, else `socket.remoteAddress`,
   else null. Never parse X-Forwarded-For. Do NOT read request body anywhere.
5. Error isolation around logging and emission; never leak user-agent into
   logs unbounded (truncate).

Unit tests alongside. Do not break Phase 2 wiring tests.

## Definition of done (final, phase 6)

See AGENTS.md phase list; all commands green; `pnpm pack` archive clean; ESM +
CJS consumers verified; no publishing.
