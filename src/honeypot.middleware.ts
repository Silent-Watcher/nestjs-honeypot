import type { IncomingMessage, ServerResponse } from 'node:http'
import type { NestMiddleware } from '@nestjs/common'
import { Inject, Injectable } from '@nestjs/common'
import { HONEYPOT_OPTIONS } from './honeypot.constants'
import type { HoneypotOptions } from './honeypot.options'

/**
 * Removes the trailing slashes of a pathname (`/admin/` -> `/admin`).
 * The root `/` stays `/`.
 */
function normalizePath(path: string): string {
  let end = path.length
  while (end > 1 && path[end - 1] === '/') {
    end--
  }
  return path.slice(0, end).toLowerCase()
}

/**
 * Whether `pathname` hits the protected `configuredPath`.
 *
 * Matching is case-insensitive, treats trailing slashes as equivalent and
 * covers nested paths: `/admin` protects `/admin/login` but not
 * `/administrator`. Query strings must be stripped before calling.
 */
export function isHoneypotPath(pathname: string, configuredPath: string): boolean {
  const normalized = normalizePath(pathname)
  const target = normalizePath(configuredPath)
  return normalized === target || normalized.startsWith(`${target}/`)
}

/** Extracts the pathname of a raw request URL, dropping query and fragment. */
export function requestPathname(url: string | undefined): string {
  const raw = url ?? '/'
  const end = [raw.indexOf('?'), raw.indexOf('#')]
    .filter((index) => index !== -1)
    .reduce((min, index) => Math.min(min, index), raw.length)
  return raw.slice(0, end) || '/'
}

/**
 * Request type carrying `originalUrl`: Express (and adapters mounting the
 * middleware on a wildcard path) strip the matched prefix from `req.url`,
 * so the full externally requested path only survives in `originalUrl`.
 */
export type HoneypotRequest = IncomingMessage & { originalUrl?: string }

@Injectable()
export class HoneypotMiddleware implements NestMiddleware {
  // Explicit token: Nest records it in its own metadata, so this class works
  // even in builds that do not emit decorator metadata.
  constructor(@Inject(HONEYPOT_OPTIONS) private readonly options: HoneypotOptions) {}

  use(request: HoneypotRequest, response: ServerResponse, next: () => void): void {
    const pathname = requestPathname(request.originalUrl ?? request.url)
    if (!isHoneypotPath(pathname, this.options.path)) {
      next()
      return
    }
    // Placeholder termination — response strategies are implemented in the
    // next phase.
    response.statusCode = 200
    response.end()
  }
}
