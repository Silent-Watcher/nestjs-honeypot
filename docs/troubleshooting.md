# Troubleshooting

## Requests to the honeypot path return 404

**The module isn't imported, or the path doesn't match.**

- Import `HoneypotModule.forRoot(...)` in your application module.
- Check the path including your global prefix: with
  `app.setGlobalPrefix('api')`, the honeypot path must be `/api/admin` to
  intercept `/api/admin`. See [Adapters](/adapters#global-prefix).
- Check the letter case: matching is case-insensitive, so that's rarely it.

## Middleware doesn't apply to my routes

NestJS middleware registered in a module only covers routes of modules
imported **after** it. Put `HoneypotModule` first in your imports array:

```ts
@Module({
  imports: [HoneypotModule.forRoot(), FeatureModule],
})
```

## "Honeypot path must be an absolute pathname starting with..."

The `path` option was relative (`'admin'`), empty, `/`, or contained `?`/`#`.
Pathnames are always absolute from the site root.

## "...would cause a redirect loop"

A root-relative `fakeAdminUrl` points inside the protected path — every
visitor would bounce forever. Pick a destination outside the honeypot path.

## My custom logger never receives anything

`HoneypotLogger` requires exactly `warn(message: string): void`. Hits are
reported through `warn` only. If your logger uses another method or extra
parameters, wrap it:

```ts
const honeypotLogger: HoneypotLogger = {
  warn: (message) => winston.warn(message),
}
```

## I get an unhandled rejection in my event listener

Node.js `EventEmitter` listeners are synchronous. If your listener starts an
async operation, attach a `.catch()` (or use `void` + internal error
handling). The package cannot await your listener. See
[Events](/events#synchronous-delivery).

## The reported IP is my load balancer's address

That's the socket address of the proxy. The package deliberately does not
parse `X-Forwarded-For`. Configure your adapter's trusted-proxy setting so
the platform exposes the real client IP via `request.ip`; see
[Security](/security#reverse-proxy-considerations).

## Fastify: requests pass through unchanged

Ensure you pass the adapter at creation and that the module is imported:

```ts
const app = await NestFactory.create(AppModule, new FastifyAdapter())
```

## TypeScript cannot find the types

The package ships `.d.ts`/`.d.cts` declarations with conditional exports.
Use a modern `moduleResolution` in your `tsconfig.json` (`bundler`,
`node16`, or `nodenext`).

## Nothing is logged but the page is served

The default logger writes through NestJS `Logger` with the `Honeypot`
context. If your log level suppresses warnings, configure the application
logger accordingly or provide your own `logger` option.
