import type { EventEmitter } from 'node:events'
import { Logger } from '@nestjs/common'
import { isHoneypotPath } from './honeypot.path'
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
  if (resolved.fakeAdminUrl !== undefined) {
    validateFakeAdminUrl(resolved.fakeAdminUrl, resolved.path)
  }
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

/**
 * Accepts root-relative paths and absolute http/https URLs. Rejects other
 * schemes (e.g. `javascript:`), protocol-relative URLs and relative
 * destinations inside the protected path, which would redirect-loop.
 * Absolute URLs are not loop-checked: the application's own origin is not
 * known at configuration time.
 */
export function validateFakeAdminUrl(url: string, honeypotPath: string): void {
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('Honeypot fakeAdminUrl must be a non-empty string.')
  }
  if (url.startsWith('//')) {
    throw new Error('Honeypot fakeAdminUrl must not be a protocol-relative URL.')
  }
  const isAbsolute = /^https?:\/\//i.test(url)
  const isRelative = url === '/' || /^\/[^/]/.test(url)
  if (!isAbsolute && !isRelative) {
    throw new Error(
      `Honeypot fakeAdminUrl must be an absolute http/https URL or a root-relative path, got "${url}".`,
    )
  }
  if (!isAbsolute) {
    const parsed = new URL(url, 'http://localhost')
    if (isHoneypotPath(parsed.pathname || '/', honeypotPath)) {
      throw new Error(
        `Honeypot fakeAdminUrl "${url}" points inside the protected path "${honeypotPath}" and would cause a redirect loop.`,
      )
    }
  }
}
