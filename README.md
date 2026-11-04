# nestjs-honeypot

Admin-route honeypot for [NestJS](https://nestjs.com) applications.

Intercepts requests to a configurable path (default `/admin`), records the
intrusion attempt, and answers with a fake admin page or a redirect. Legitimate
users never request a decoy admin path — only scanners and attackers do, which
makes every hit a strong hostile-intent signal.

## Features

- **Decoy admin page** — built-in HTML5 login page, no external assets, form
  action derived from the configured path
- **Custom responses** — raw custom HTML or a 302 redirect to any
  http/https URL or relative path
- **Intrusion signals** — one log line per hit and an optional
  `honeypotHit` event (method, path, IP, user agent, timestamp) on a
  standard Node.js `EventEmitter`
- **Nest-native** — `HoneypotModule.forRoot()` / `forRootAsync()`, class
  middleware registered through the standard `MiddlewareConsumer` lifecycle
- **Adapter-agnostic** — works with the Express and Fastify adapters; uses
  only the common Node.js HTTP contract
- **Safe by design** — no request bodies are read, no credentials are
  collected, no `X-Forwarded-For` is trusted

## Installation

```sh
npm install nestjs-honeypot
```

Node.js 20+ and NestJS 11 or 12. No runtime dependencies.

## Quick start

```ts
import { Module } from '@nestjs/common'
import { HoneypotModule } from 'nestjs-honeypot'

@Module({
  imports: [HoneypotModule.forRoot({ path: '/admin' })],
})
export class AppModule {}
```

Requests to `/admin` (and nested paths like `/admin/login`, any case, any
HTTP method) now get the decoy page and are logged:

```
Honeypot hit: GET /admin from 203.0.113.7 (user-agent: Mozilla/5.0 …)
```

## Alerts on hits

```ts
import { EventEmitter } from 'node:events'
import { HONEYPOT_HIT_EVENT, type HoneypotHitEvent } from 'nestjs-honeypot'

const emitter = new EventEmitter()
emitter.on(HONEYPOT_HIT_EVENT, (hit: HoneypotHitEvent) => {
  notifySecurityTeam(`hit on ${hit.path} from ${hit.ip ?? 'unknown'}`)
})

@Module({
  imports: [HoneypotModule.forRoot({ path: '/admin', eventEmitter: emitter })],
})
export class AppModule {}
```

## Documentation

Full documentation — configuration, events, adapters, security notes, and
API reference — lives in the `docs/` directory (VitePress site).

## License

[MIT](./LICENSE)
