# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-05

First stable release.

### Added

- `HoneypotModule.forRoot` / `forRootAsync` with validated options.
- Configurable protected path (default `/admin`): case-insensitive, nested,
  trailing- and repeated-slash tolerant, percent-decoded matching.
- Built-in fake admin login page, custom HTML, and 302 redirect responses.
- One log line per hit and optional `honeypotHit` events on an `EventEmitter`.
- Express and Fastify adapter support, verified by integration tests.
- ESM + CommonJS builds with TypeScript declarations; no runtime dependencies.
- VitePress documentation site with logo and brand theme.

### Security

- Matching compares percent-decoded paths, so `/%61dmin` cannot bypass the
  honeypot on Fastify; logs and events keep the raw path (no log injection).
- No request bodies or credentials are read; `X-Forwarded-For` is never trusted.
