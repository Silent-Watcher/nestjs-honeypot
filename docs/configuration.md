# Configuration

All options are passed to `HoneypotModule.forRoot()` (or produced by the
`useFactory` of `forRootAsync`). Every option is optional.

## Options

### `path`

- **Type:** `string`
- **Default:** `'/admin'`
- **Required:** absolute pathname starting with `/`; must not be empty, must
  not be `/`, must not contain `?` or `#`

The protected pathname, matched against the full externally requested path —
including a [global prefix](/adapters#global-prefix) if you set one. Matching
is case-insensitive, ignores query strings and fragments, treats trailing
and repeated slashes as equivalent, compares percent-decoded paths (so
`/%61dmin` is caught too), and covers nested paths. With the default `/admin`,
the paths `/admin`, `/admin/`, `/ADMIN`, and `/admin/login` are all
intercepted, while `/administrator` and `/adminx` are not.

Invalid values fail during application initialization.

```ts
HoneypotModule.forRoot({ path: '/hidden-panel' })
```

### `fakeAdminUrl`

- **Type:** `string`
- **Default:** `undefined`
- **Accepted:** absolute `http`/`https` URLs and root-relative paths
  (`/moved`, `https://decoy.example.com/…`)

Redirect honeypot visitors to this URL with HTTP `302` instead of serving a
page. Relative destinations inside the protected path are rejected at
startup because they would redirect-loop. Absolute URLs are not loop-checked
— do not point one at this application.

```ts
HoneypotModule.forRoot({ fakeAdminUrl: 'https://decoy.example.com/login' })
```

### `customHtml`

- **Type:** `string`
- **Default:** `undefined`

Serve this raw HTML instead of the built-in page. The string is used exactly
as provided — it is not interpreted as a file path, not sanitized and not
rewritten. An empty string is respected as "serve nothing", not "use the
default".

```ts
HoneypotModule.forRoot({
  customHtml: '<h1>404 Not Found</h1>',
})
```

### `logger`

- **Type:** [`HoneypotLogger`](/api-reference#honypotlogger)
- **Default:** a NestJS `Logger` with the `Honeypot` context

Receives one `warn(message)` call per hit with the method, path, IP and a
truncated user agent. Passwords, request bodies, cookies and authorization
headers are never logged. A logger that throws cannot break the honeypot
response.

```ts
import { LoggerService } from '@nestjs/common'

const logger: HoneypotLogger = {
  warn: (message) => myLoggingPipeline.warn(message),
}

HoneypotModule.forRoot({ logger })
```

### `eventEmitter`

- **Type:** `EventEmitter` from `node:events`
- **Default:** `undefined`

Emits a [`honeypotHit`](/events) event for every intercepted request. See
[Events](/events).

```ts
import { EventEmitter } from 'node:events'

const emitter = new EventEmitter()

HoneypotModule.forRoot({ eventEmitter: emitter })
```

## Response precedence

When several response options are configured, exactly one applies:

1. `fakeAdminUrl` — 302 redirect (highest priority)
2. `customHtml` — raw HTML response
3. built-in fake admin login page (default)

The `honeypotHit` event and the log line are emitted in every mode.

## Initialization errors

Invalid configuration fails fast during application initialization, for both
`forRoot` and `forRootAsync`:

| Problem | Error |
| --- | --- |
| empty, relative, `/`, query or fragment in `path` | invalid honeypot path |
| empty, relative, or non-http(s) `fakeAdminUrl` | invalid redirect URL |
| relative `fakeAdminUrl` inside the protected path | redirect loop |
