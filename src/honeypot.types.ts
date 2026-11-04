import type { EventEmitter } from 'node:events'
import type { InjectionToken, ModuleMetadata } from '@nestjs/common'

/**
 * Minimal structural logger contract the package requires.
 *
 * The default NestJS `Logger` satisfies it. Wrap an existing logger in a
 * one-method adapter if its signature differs.
 */
export interface HoneypotLogger {
  warn(message: string): void
}

/** Payload emitted with every {@link HONEYPOT_HIT_EVENT} occurrence. */
export interface HoneypotHitEvent {
  /** Client IP if determinable, `null` otherwise. */
  ip: string | null
  /** Raw `User-Agent` header value, empty string when absent. */
  userAgent: string
  /** HTTP method of the intercepted request. */
  method: string
  /** Request pathname, without query string. */
  path: string
  /** ISO 8601 timestamp of the interception. */
  timestamp: string
}

export interface HoneypotModuleOptions {
  /** Protected pathname, including any global prefix. Must be absolute. */
  path?: string
  /**
   * URL to redirect honeypot visitors to instead of serving a page.
   * Takes precedence over `customHtml`. Relative paths and absolute
   * `http`/`https` URLs are accepted.
   */
  fakeAdminUrl?: string
  /** Raw HTML served instead of the built-in decoy page. Used as-is. */
  customHtml?: string
  /** Custom logger; defaults to the NestJS `Logger`. */
  logger?: HoneypotLogger
  /**
   * Optional `EventEmitter` receiving a `honeypotHit` event for every
   * intercepted request, regardless of the response strategy.
   */
  eventEmitter?: EventEmitter
}

export interface HoneypotModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  /** Dependencies injected into `useFactory`. */
  inject?: InjectionToken[]
  /**
   * Factory producing the module options, optionally asynchronous. Declared
   * with `never[]` rest parameters so factories with concrete parameter
   * types stay assignable without weakening to `any`.
   */
  useFactory: (...args: never[]) => HoneypotModuleOptions | Promise<HoneypotModuleOptions>
}
