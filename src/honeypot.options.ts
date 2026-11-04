import type { EventEmitter } from 'node:events'
import { Logger } from '@nestjs/common'
import type { HoneypotLogger, HoneypotModuleOptions } from './honeypot.types'

/** Fully resolved runtime options after defaults and validation. */
export interface HoneypotOptions {
  path: string
  fakeAdminUrl?: string
  customHtml?: string
  logger: HoneypotLogger
  eventEmitter?: EventEmitter
}

/** Applies defaults and validates the user-supplied options. */
export function resolveHoneypotOptions(options: HoneypotModuleOptions): HoneypotOptions {
  const resolved: HoneypotOptions = {
    ...options,
    path: options.path ?? '/admin',
    logger: options.logger ?? new Logger('Honeypot'),
  }
  validateHoneypotPath(resolved.path)
  return resolved
}

/** Throws on configuration that would make the honeypot useless or broken. */
export function validateHoneypotPath(path: string): void {
  if (typeof path !== 'string' || path.length === 0) {
    throw new Error('Honeypot path must be a non-empty string.')
  }
  if (!path.startsWith('/')) {
    throw new Error(`Honeypot path must be an absolute pathname starting with "/", got "${path}".`)
  }
  if (path === '/') {
    throw new Error(
      'Honeypot path must not be "/": that would turn the entire application into a honeypot.',
    )
  }
  if (path.includes('?') || path.includes('#')) {
    throw new Error(`Honeypot path must not contain a query string or fragment, got "${path}".`)
  }
}
