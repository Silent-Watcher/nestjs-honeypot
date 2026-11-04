# Getting Started

## Installation

```sh
npm install nestjs-honeypot
# or
pnpm add nestjs-honeypot
```

Requirements: Node.js 20+, NestJS 11 or 12. No other runtime dependencies.

## Basic usage

Import `HoneypotModule.forRoot()` in your root module:

```ts
import { Module } from '@nestjs/common'
import { HoneypotModule } from 'nestjs-honeypot'

@Module({
  imports: [
    HoneypotModule.forRoot({
      path: '/admin',
    }),
  ],
})
export class AppModule {}
```

That's it. Requests to `/admin` (and any nested path such as
`/admin/login`, in any letter case) now receive a fake admin login page
instead of a 404, and every hit is logged:

```
Honeypot hit: GET /admin from 203.0.113.7 (user-agent: Mozilla/5.0 …)
```

## Asynchronous configuration

When the honeypot path comes from the environment or a config service, use
`forRootAsync`. The factory can be synchronous or asynchronous:

```ts
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { HoneypotModule } from 'nestjs-honeypot'

@Module({
  imports: [
    ConfigModule.forRoot(),
    HoneypotModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        path: config.getOrThrow<string>('HONEYPOT_PATH'),
      }),
    }),
  ],
})
export class AppModule {}
```

`@nestjs/config` is used here only for illustration — the honeypot module
itself has no dependency on it. Any provider you list in `inject` must be
imported (or otherwise available) inside the dynamic module through the
`imports` option.

## Choosing a path

Pick a path that:

- no real route of your application handles,
- attackers plausibly probe (`/admin`, `/administrator`, `/wp-admin`,
  `/phpmyadmin`, `/panel` …),
- includes your [global prefix](/adapters#global-prefix) if you set one —
  the path is matched against the full externally requested pathname.

## Next steps

- Tune the response: [Configuration](/configuration)
- Alert on hits: [Events](/events)
