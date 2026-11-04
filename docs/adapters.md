# Adapters

nestjs-honeypot integrates through NestJS middleware APIs, not through a
specific HTTP framework. It avoids Express- and Fastify-specific request or
response methods and works with the common Node.js HTTP contract.

## ExpressAdapter

Works out of the box — `createNestApplication()` uses Express by default.

```ts
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(3000)
}
```

## FastifyAdapter

Pass the adapter when creating the application:

```ts
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter())
  await app.listen(3000)
}
```

Compatibility is verified with real integration tests against both adapters
in this repository's test suite.

## Global prefix

If your application uses `app.setGlobalPrefix()`, the prefix is part of the
externally requested pathname — include it in the honeypot path:

```ts
import { NestFactory } from '@nestjs/core'
import { Module } from '@nestjs/common'
import { HoneypotModule } from 'nestjs-honeypot'

@Module({
  imports: [HoneypotModule.forRoot({ path: '/api/admin' })],
})
export class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  await app.listen(3000)
}
```

With this configuration, requests to `/api/admin` and
`/api/admin/anything` are intercepted; `/admin` (without the prefix) is not.

## Middleware behavior

The module registers a single class-based middleware on a wildcard route
during the standard NestJS `NestModule` / `MiddlewareConsumer` lifecycle —
you never register it yourself, and it works identically for `forRoot` and
`forRootAsync`.

At request time the middleware:

1. extracts the pathname (query strings and fragments are ignored),
2. calls `next()` for unrelated paths — zero overhead for normal traffic,
3. for honeypot paths: records the hit, then terminates the response
   according to the [configured strategy](/configuration#response-precedence).

Because matching happens at request time, the path may safely come from an
asynchronous configuration factory. No controller is needed at the honeypot
path; requests are answered before routing.

**Import order matters** (standard NestJS rule): middleware registered in a
module applies to the routes of modules imported **after** it. Import
`HoneypotModule` first in your `AppModule` imports array.
