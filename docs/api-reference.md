# API Reference

All names are exported from the package root:

```ts
import {
  HONEYPOT_HIT_EVENT,
  HoneypotModule,
  type HoneypotHitEvent,
  type HoneypotLogger,
  type HoneypotModuleAsyncOptions,
  type HoneypotModuleOptions,
} from 'nestjs-honeypot'
```

## HoneypotModule

Dynamic module registering the honeypot middleware.

### `HoneypotModule.forRoot(options: HoneypotModuleOptions): DynamicModule`

Registers the middleware with a static configuration object.

### `HoneypotModule.forRootAsync(options: HoneypotModuleAsyncOptions): DynamicModule`

Registers the middleware with options produced by an injected factory.

```ts
HoneypotModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    path: config.getOrThrow<string>('HONEYPOT_PATH'),
  }),
})
```

## HONEYPOT_HIT_EVENT

- **Type:** `string`
- **Value:** `'honeypotHit'`

Name of the event emitted on the configured `EventEmitter` for every
intercepted request. See [Events](/events).

## HoneypotModuleOptions

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `path` | `string` | `'/admin'` | Protected pathname (absolute, not `/`) |
| `fakeAdminUrl` | `string` | `undefined` | 302 redirect target |
| `customHtml` | `string` | `undefined` | Raw HTML response |
| `logger` | [`HoneypotLogger`](#honypotlogger) | NestJS `Logger` | Hit logger |
| `eventEmitter` | `EventEmitter` | `undefined` | Emits `honeypotHit` events |

Response precedence: `fakeAdminUrl` → `customHtml` → built-in page. See
[Configuration](/configuration).

## HoneypotModuleAsyncOptions

| Option | Type | Description |
| --- | --- | --- |
| `imports` | `ModuleMetadata['imports']` | Modules whose providers the factory needs |
| `inject` | `InjectionToken[]` | Tokens injected into the factory |
| `useFactory` | `(...args) => HoneypotModuleOptions \| Promise<HoneypotModuleOptions>` | Produces the options |

## HoneypotLogger

Minimal structural logger contract:

```ts
interface HoneypotLogger {
  warn(message: string): void
}
```

The default NestJS `Logger` satisfies it. Wrap an existing logger in a
one-method adapter if its signature differs:

```ts
import { Logger } from '@nestjs/common'
import type { HoneypotLogger } from 'nestjs-honeypot'

const honeypotLogger: HoneypotLogger = {
  warn: (message) => new MyLogPipeline().warn(message),
}
```

## HoneypotHitEvent

```ts
interface HoneypotHitEvent {
  ip: string | null
  userAgent: string
  method: string
  path: string
  timestamp: string
}
```

Emitted with `HONEYPOT_HIT_EVENT` for every intercepted request, in every
response mode. No query strings, bodies, or credentials are included.
