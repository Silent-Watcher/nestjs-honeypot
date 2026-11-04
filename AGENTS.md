# AGENTS.md — nestjs-honeypot

Guidance for AI agents working on this repository. Read this before changing anything.

## What this project is

`nestjs-honeypot` — an npm library providing an admin-route honeypot for NestJS
applications. It intercepts requests to a configurable path (default `/admin`),
logs the hit, emits an optional event, and responds with a fake admin page or a
redirect. The complete product specification was supplied by the repository
owner in a single prompt (reproduced in the original session); the phase plan
below is the authoritative breakdown.

## Stack (fixed by spec)

- TypeScript (strict, ^5.9), NestJS (peer `^11 || ^12`, dev against 12)
- tsdown (build, ESM + CJS), Vitest + V8 coverage, Biome (lint/format), pnpm
- VitePress docs, Supertest for HTTP tests
- No runtime dependencies. No Express/Fastify imports in production source —
  use Node `IncomingMessage`/`ServerResponse` contract.

## Engineering rules

- Correctness > Maintainability > Simplicity > Extensibility. No speculative
  abstractions; no dependency without strong justification.
- Strict TS, no `any` in production source.
- Never publish to npm or create releases without explicit owner approval.
- Follow the phase plan; finish a phase, report, wait for approval.
- Commits: conventional commits (feat/fix/chore/docs/test/build), one logical
  step per commit, owner-approved workflow.

## Development phases (from the owner's specification)

1. **Project Foundation** — DONE (see PROGRESS.md)
2. **NestJS Module and Public API** — types, options validation,
   `forRoot`/`forRootAsync`, DI tokens, wildcard middleware registration
3. **Core Honeypot Functionality** — path matching finalization, default HTML
   template, custom HTML, redirect (302, beats customHtml), logger integration,
   EventEmitter events (`honeypotHit`), IP extraction, error isolation
4. **Integration Tests + Feature Gap Review** — real Express AND Fastify apps
5. **VitePress Documentation + README**
6. **Final QA + Release Readiness** — `pnpm pack` validation, consumer smoke
   test, final review. Do NOT publish.

## Key implementation decisions already made

- tsdown reports ESM format as `"es"` internally — `outExtensions` branches on
  `!== 'cjs'` to get `dist/index.js` + `dist/index.cjs` under `type: module`.
- Biome must NOT format `docs/**` — it corrupts VitePress YAML frontmatter.
- Middleware registers via `forRoutes('*splat')` (Nest 11/12 path-to-regexp v8
  syntax) because the honeypot path may come from an async factory; the
  middleware matches the configured path at request time.
- DI works without `emitDecoratorMetadata` because the middleware's single
  constructor dependency uses an explicit `@Inject(HONEYPOT_OPTIONS)` token
  (Nest stores that in its own metadata). If adding constructor deps, add
  explicit `@Inject()` to each.
- `useFactory` in async options is typed `(...args: never[]) => ...` so user
  factories with specific parameter types remain assignable without `any`.
- TypeScript pinned to ^5 (npm's latest 7.0.2 is experimental with tsdown).

## Verification commands

```
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm docs:build
```

All must pass before committing. Never use `passWithNoTests`; never skip tests.
