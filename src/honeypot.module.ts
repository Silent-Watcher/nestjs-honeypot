import type { DynamicModule, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { Module } from '@nestjs/common'
import { HONEYPOT_OPTIONS } from './honeypot.constants'
import { HoneypotMiddleware } from './honeypot.middleware'
import { resolveHoneypotOptions } from './honeypot.options'
import type { HoneypotModuleAsyncOptions, HoneypotModuleOptions } from './honeypot.types'

/**
 * Registers the honeypot middleware for the whole application.
 *
 * The middleware itself decides at request time whether a request hits the
 * protected path, because with `forRootAsync` the path is only known after
 * dependency injection. All imports of this module must therefore come first:
 * global middleware registered through `configure()` applies to routes of
 * modules imported afterwards.
 */
@Module({})
export class HoneypotModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Named wildcard (path-to-regexp v8 syntax, NestJS 11+): matches every
    // request path so the middleware can apply its own path matching.
    consumer.apply(HoneypotMiddleware).forRoutes('*splat')
  }

  static forRoot(options: HoneypotModuleOptions): DynamicModule {
    return {
      module: HoneypotModule,
      providers: [
        {
          provide: HONEYPOT_OPTIONS,
          // Factory, not useValue: validation must fail during application
          // initialization, not silently at module-definition time.
          useFactory: () => resolveHoneypotOptions(options),
        },
      ],
    }
  }

  static forRootAsync(options: HoneypotModuleAsyncOptions): DynamicModule {
    const { useFactory, inject, imports } = options
    return {
      module: HoneypotModule,
      imports,
      providers: [
        {
          provide: HONEYPOT_OPTIONS,
          inject: inject ?? [],
          useFactory: async (...deps: never[]) => resolveHoneypotOptions(await useFactory(...deps)),
        },
      ],
    }
  }
}
