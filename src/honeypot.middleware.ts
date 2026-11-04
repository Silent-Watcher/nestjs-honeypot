import type { IncomingMessage, ServerResponse } from 'node:http'
import type { NestMiddleware } from '@nestjs/common'
import { Inject, Injectable } from '@nestjs/common'
import { HONEYPOT_HIT_EVENT, HONEYPOT_OPTIONS } from './honeypot.constants'
import type { HoneypotOptions } from './honeypot.options'
import { isHoneypotPath, requestPathname } from './honeypot.path'
import type { HoneypotHitEvent } from './honeypot.types'
import { renderDefaultLoginPage } from './template'

/**
 * Request type carrying `originalUrl`: Express (and adapters mounting the
 * middleware on a wildcard path) strip the matched prefix from `req.url`,
 * so the full externally requested path only survives in `originalUrl`.
 */
export type HoneypotRequest = IncomingMessage & { originalUrl?: string }

/** Caps user-agent length in log lines; event payloads keep the full value. */
const LOG_USER_AGENT_LIMIT = 200

/** Client IP: request `ip` when genuinely present, else the socket address. */
function clientIp(request: HoneypotRequest): string | null {
  const ip = (request as { ip?: unknown }).ip
  if (typeof ip === 'string' && ip.length > 0) {
    return ip
  }
  return request.socket?.remoteAddress ?? null
}

function requestUserAgent(request: IncomingMessage): string {
  const header = request.headers['user-agent']
  if (Array.isArray(header)) {
    return header[0] ?? ''
  }
  return header ?? ''
}

function truncate(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit)}…` : value
}

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

    const hit: HoneypotHitEvent = {
      ip: clientIp(request),
      userAgent: requestUserAgent(request),
      method: request.method ?? '',
      path: pathname,
      timestamp: new Date().toISOString(),
    }
    this.reportHit(hit)

    if (this.options.fakeAdminUrl !== undefined) {
      response.statusCode = 302
      response.setHeader('Location', this.options.fakeAdminUrl)
      response.end()
      return
    }

    const html =
      this.options.customHtml !== undefined
        ? this.options.customHtml
        : renderDefaultLoginPage(this.options.path)
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')
    response.end(html)
  }

  /** Logs and emits the hit; neither failure may block the response. */
  private reportHit(hit: HoneypotHitEvent): void {
    try {
      this.options.logger.warn(
        `Honeypot hit: ${hit.method} ${hit.path} from ${hit.ip ?? 'unknown ip'} ` +
          `(user-agent: ${truncate(hit.userAgent, LOG_USER_AGENT_LIMIT)})`,
      )
    } catch {
      // A broken logger must not prevent the honeypot response.
    }
    const { eventEmitter } = this.options
    if (eventEmitter) {
      try {
        eventEmitter.emit(HONEYPOT_HIT_EVENT, hit)
      } catch {
        // A throwing listener must not prevent the honeypot response.
      }
    }
  }
}
