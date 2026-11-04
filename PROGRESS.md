# PROGRESS.md

Status tracker for AI agents. Update after every phase.

## Current stage

**Phase 2 — NestJS Module and Public API** (in progress)

## Phase status

| Phase | Title | Status |
|---|---|---|
| 1 | Project Foundation | ✅ done |
| 2 | NestJS Module and Public API | 🚧 in progress |
| 3 | Core Honeypot Functionality | ⬜ not started |
| 4 | Integration Tests + Feature Gap Review | ⬜ not started |
| 5 | VitePress Documentation + README | ⬜ not started |
| 6 | Final QA + Release Readiness | ⬜ not started |

## Phase 1 — completed work

- pnpm project, package metadata, exports map (`.js` ESM / `.cjs` CJS with
  `.d.ts` / `.d.cts`), files list = `dist`.
- tsdown dual build; Vitest + V8 coverage; Biome (docs excluded); VitePress
  scaffold (`docs/index.md`, `docs/.vitepress/config.ts`); MIT LICENSE.
- Verified: `pnpm typecheck`, `pnpm test` (1 smoke test), `pnpm build` (ESM and
  CJS both importable via `node -e`), `pnpm test:coverage`, `pnpm docs:build`,
  `pnpm pack --dry-run` (clean tarball).
- Toolchain: TypeScript ^5.9.3, tsdown 0.23, vitest 5.1, vitepress 1.6,
  biome 2.6, NestJS 12.3.2 dev deps. Node 24 dev runtime, `engines.node >= 20`.

## Phase 2 — what to do

Implement in `src/`:

1. `honeypot.constants.ts` — `HONEYPOT_HIT_EVENT` export; internal
   `HONEYPOT_OPTIONS` DI token (not exported from index).
2. `honeypot.types.ts` — `HoneypotModuleOptions` (`path` default `/admin`,
   `fakeAdminUrl`, `customHtml`, `logger`, `eventEmitter`),
   `HoneypotModuleAsyncOptions` (`imports`, `inject`, `useFactory`),
   `HoneypotLogger` (`warn(message: string): void` only), `HoneypotHitEvent`
   payload interface.
3. `honeypot.options.ts` — resolved-options type, `resolveHoneypotOptions`
   (defaults + validation) and path validation: must start with `/`, not empty,
   not `/`, no `?`/`#`. Fail at module init.
4. `honeypot.middleware.ts` — class middleware, `@Inject(HONEYPOT_OPTIONS)`,
   strips query/fragment, path match (case-insensitive, trailing-slash
   equivalent, nested paths, no `/administrator` false positive), `next()` for
   unrelated paths, placeholder termination for matches (real responses in
   phase 3).
5. `honeypot.module.ts` — `forRoot`, `forRootAsync`,
   `configure()` registering middleware via `forRoutes('*splat')`.
6. `index.ts` — export only: `HoneypotModule`, option/event types,
   `HoneypotLogger`, `HoneypotHitEvent`, `HONEYPOT_HIT_EVENT`.

Tests: validation cases, path-matching cases, module wiring (compile-time
resolution of async options, invalid config rejects), small supertest checks
(`/admin` 200, `/dashboard` 404).

Verify then commit with conventional commits.

## Definition of done (final, phase 6)

See AGENTS.md phase list; all commands green; `pnpm pack` archive clean; ESM +
CJS consumers verified; no publishing.
