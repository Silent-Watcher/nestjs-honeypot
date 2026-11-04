# Events

The package can emit an event for every intercepted request so you can wire
hits into alerting, metrics or security pipelines — without being tied to
any specific monitoring library.

## Setup

Pass a standard Node.js `EventEmitter` (or any compatible emitter):

```ts
import { EventEmitter } from 'node:events'
import { Module } from '@nestjs/common'
import { HoneypotModule } from 'nestjs-honeypot'

export const honeypotEvents = new EventEmitter()

@Module({
  imports: [HoneypotModule.forRoot({ eventEmitter: honeypotEvents })],
})
export class AppModule {}
```

## Listening

Subscribe with the exported `HONEYPOT_HIT_EVENT` constant (its value is
`'honeypotHit'`):

```ts
import { HONEYPOT_HIT_EVENT, type HoneypotHitEvent } from 'nestjs-honeypot'
import { honeypotEvents } from './app.module'

honeypotEvents.on(HONEYPOT_HIT_EVENT, (hit: HoneypotHitEvent) => {
  console.log(`Intrusion attempt from ${hit.ip ?? 'unknown'} on ${hit.path}`)
})
```

## Event payload

`HoneypotHitEvent` contains no query strings, no request bodies and no
credentials:

| Field | Type | Description |
| --- | --- | --- |
| `ip` | `string \| null` | Client IP when determinable, otherwise `null` |
| `userAgent` | `string` | Raw `User-Agent` header, `''` when absent |
| `method` | `string` | HTTP method of the request |
| `path` | `string` | Request pathname, without query string |
| `timestamp` | `string` | ISO 8601 timestamp of the interception |

The event fires for **every** response mode — default page, custom HTML and
redirect — exactly once per request.

## Common integrations

### Alerting webhook

```ts
honeypotEvents.on(HONEYPOT_HIT_EVENT, (hit) => {
  void fetch('https://alerts.example.com/hooks/honeypot', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(hit),
  }).catch(() => {})
})
```

### Counting hits

```ts
let hits = 0
honeypotEvents.on(HONEYPOT_HIT_EVENT, () => {
  hits++
})
```

## Synchronous delivery

Node.js `EventEmitter` listeners run synchronously from the package's point
of view: the honeypot response is sent after all listeners have returned.
Consequences:

- A listener that throws synchronously is caught and isolated — it can
  neither crash the application nor block the response.
- The package cannot await asynchronous work in listeners. If your listener
  performs async operations, handle promise rejections yourself (as in the
  webhook example above), otherwise they become unhandled rejections.
- Keep listeners fast; heavy processing should be handed off inside the
  listener.
