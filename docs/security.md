# Security

## What the honeypot is for

The package detects and distracts. A request to the decoy path is a reliable
hostile-intent signal, useful for alerting and analysis. The fake page keeps
the visitor busy and makes your application look like a candidate target.

## What it is not

- **Not an authentication or access-control mechanism.** The fake login page
  accepts and discards whatever is submitted; it grants nothing.
- **Not blocking.** Honeypot visitors are answered, not banned. Repeat
  offenders keep receiving the decoy. If you want blocking, act on the
  [`honeypotHit`](/events) event in your own infrastructure (firewall rules,
  WAF, rate limiter).
- **Not a WAF or IPS.** It inspects one thing — the request path.

## Client IP detection

The event and log line report the client IP with this precedence:

1. `request.ip` — only when the HTTP adapter genuinely exposes it,
2. `request.socket.remoteAddress`,
3. `null` when neither is available.

The package **never** parses `X-Forwarded-For` or similar headers. That
header is client-controlled input; trusting it would let an attacker forge
the reported IP.

### Reverse proxy considerations

Behind a reverse proxy or load balancer, the socket address (and a naive
`request.ip`) is the proxy's address, not the visitor's. NestJS can compute
the real client IP when you configure your trust level on the underlying
adapter — for Express:

```ts
const app = await NestFactory.create<NestExpressApplication>(AppModule)
app.getHttpAdapter().getInstance().set('trust proxy', true)
```

Only enable this if you actually terminate connections at a trusted proxy,
and configure the number of trusted hops rather than `true` where possible.
The package reports whatever the platform resolves — it does not pretend to
see through proxies on its own, and adds no proxy configuration of its own.

## Sensitive data handling

- Submitted form values are never read. The middleware inspects the request
  line and headers only; there is no body parsing.
- Logs contain method, path, IP and a truncated user agent — never
  passwords, cookies, or authorization headers.
- Event payloads contain no query strings, bodies, or credentials.
- The built-in page has no external assets: it leaks nothing about your
  stack, and a decoy that never phones home cannot be used to fingerprint
  your real application.

## Deployment tips

- Choose a path that no legitimate user or health check ever requests.
- Point `fakeAdminUrl` at a different host if you want to shift attention
  away from the application (and to avoid leaking your origin to the decoy
  visitor).
- Treat each `honeypotHit` as a signal, not an incident: scanners hit these
  paths constantly.
