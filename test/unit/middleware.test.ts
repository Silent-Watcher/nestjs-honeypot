import EventEmitter from 'node:events'
import type { ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { HONEYPOT_HIT_EVENT } from '../../src/honeypot.constants'
import type { HoneypotRequest } from '../../src/honeypot.middleware'
import { HoneypotMiddleware } from '../../src/honeypot.middleware'
import { resolveHoneypotOptions } from '../../src/honeypot.options'
import type { HoneypotHitEvent, HoneypotModuleOptions } from '../../src/honeypot.types'

function createMiddleware(options: HoneypotModuleOptions = {}): HoneypotMiddleware {
  return new HoneypotMiddleware(resolveHoneypotOptions({ logger: { warn: () => {} }, ...options }))
}

interface FakeRequest {
  url?: string
  originalUrl?: string
  method?: string
  userAgent?: string | string[]
  ip?: string
  remoteAddress?: string
}

function fakeRequest(overrides: FakeRequest = {}): HoneypotRequest {
  const header = overrides.userAgent
  return {
    url: overrides.originalUrl ?? overrides.url ?? '/admin',
    originalUrl: overrides.originalUrl,
    method: overrides.method ?? 'GET',
    headers: header === undefined ? {} : { 'user-agent': header },
    ip: overrides.ip,
    socket: { remoteAddress: overrides.remoteAddress },
  } as unknown as HoneypotRequest
}

interface FakeResponse {
  statusCode: number | undefined
  headers: Record<string, string>
  body: string
  ended: boolean
}

function fakeResponse(): ServerResponse & FakeResponse {
  const response = {
    statusCode: undefined,
    headers: {} as Record<string, string>,
    body: '',
    ended: false,
    setHeader(name: string, value: string) {
      this.headers[name] = value
    },
    end(body?: string) {
      if (body !== undefined) this.body = body
      this.ended = true
    },
  }
  return response as unknown as ServerResponse & FakeResponse
}

function run(middleware: HoneypotMiddleware, requestOverrides: FakeRequest = {}) {
  const request = fakeRequest(requestOverrides)
  const response = fakeResponse()
  const next = vi.fn()
  middleware.use(request, response, next)
  return { request, response, next }
}

describe('default response', () => {
  it('serves the built-in login page with the required headers', () => {
    const { response, next } = run(createMiddleware({ path: '/admin' }))
    expect(response.statusCode).toBe(200)
    expect(response.headers['Content-Type']).toBe('text/html; charset=utf-8')
    expect(response.headers['Cache-Control']).toBe('no-store')
    expect(response.body).toContain('action="/admin"')
    expect(response.ended).toBe(true)
    expect(next).not.toHaveBeenCalled()
  })

  it('uses the configured path in the form action', () => {
    const { response } = run(createMiddleware({ path: '/secret-panel' }), {
      originalUrl: '/secret-panel',
    })
    expect(response.body).toContain('action="/secret-panel"')
  })

  it('intercepts every HTTP method', () => {
    for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']) {
      const { response, next } = run(createMiddleware(), { method })
      expect(response.ended, method).toBe(true)
      expect(next, method).not.toHaveBeenCalled()
    }
  })

  it('intercepts nested paths and trailing slashes', () => {
    for (const url of ['/admin', '/admin/', '/admin/login', '/ADMIN/login']) {
      const { response } = run(createMiddleware(), { originalUrl: url })
      expect(response.ended, url).toBe(true)
    }
  })

  it('lets unrelated paths through to next()', () => {
    for (const url of ['/', '/dashboard', '/administrator', '/adminx']) {
      const { response, next } = run(createMiddleware(), { originalUrl: url })
      expect(next, url).toHaveBeenCalledOnce()
      expect(response.ended, url).toBe(false)
    }
  })

  it('strips query strings and fragments before matching', () => {
    const { response } = run(createMiddleware(), { originalUrl: '/admin?next=/home#top' })
    expect(response.ended).toBe(true)
  })
})

describe('customHtml', () => {
  it('serves the raw HTML as-is', () => {
    const { response } = run(createMiddleware({ customHtml: '<p>decoy</p>' }))
    expect(response.body).toBe('<p>decoy</p>')
    expect(response.headers['Content-Type']).toBe('text/html; charset=utf-8')
  })

  it('serves an empty string instead of the default template', () => {
    const { response } = run(createMiddleware({ customHtml: '' }))
    expect(response.body).toBe('')
    expect(response.body).not.toContain('<form')
  })

  it('keeps HTML markup intact', () => {
    const custom = '<script>document.title="x"</script><img src=x onerror=alert(1)>'
    const { response } = run(createMiddleware({ customHtml: custom }))
    expect(response.body).toBe(custom)
  })
})

describe('fakeAdminUrl redirect', () => {
  it('redirects with 302 and a Location header', () => {
    const { response } = run(createMiddleware({ fakeAdminUrl: 'https://decoy.example.com' }))
    expect(response.statusCode).toBe(302)
    expect(response.headers.Location).toBe('https://decoy.example.com')
    expect(response.body).toBe('')
  })

  it('supports relative destinations', () => {
    const { response } = run(createMiddleware({ fakeAdminUrl: '/moved' }))
    expect(response.statusCode).toBe(302)
    expect(response.headers.Location).toBe('/moved')
  })

  it('takes precedence over customHtml', () => {
    const { response } = run(
      createMiddleware({ fakeAdminUrl: '/moved', customHtml: '<p>ignored</p>' }),
    )
    expect(response.statusCode).toBe(302)
    expect(response.headers.Location).toBe('/moved')
    expect(response.body).toBe('')
  })
})

describe('event emission', () => {
  function collectHits(options: HoneypotModuleOptions = {}, requestOverrides: FakeRequest = {}) {
    const eventEmitter = new EventEmitter()
    const hits: HoneypotHitEvent[] = []
    eventEmitter.on(HONEYPOT_HIT_EVENT, (hit: HoneypotHitEvent) => hits.push(hit))
    const middleware = createMiddleware({ ...options, eventEmitter })
    const result = run(middleware, requestOverrides)
    return { hits, ...result }
  }

  it('emits one event per intercepted request', () => {
    const { hits } = collectHits({}, { originalUrl: '/admin' })
    expect(hits).toHaveLength(1)
  })

  it('carries method, path, user agent, ip and an ISO timestamp', () => {
    const timestamp = new Date().toISOString()
    const { hits } = collectHits(
      {},
      { originalUrl: '/admin/login?x=1', method: 'POST', userAgent: 'curl/8.0', ip: '203.0.113.7' },
    )
    const hit = hits[0]
    if (!hit) throw new Error('expected a honeypot hit event')
    expect(hit).toMatchObject({
      ip: '203.0.113.7',
      userAgent: 'curl/8.0',
      method: 'POST',
      path: '/admin/login',
    })
    expect(hit.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(new Date(hit.timestamp).toISOString()).toBe(hit.timestamp)
    expect(timestamp).toBeTruthy()
  })

  it('falls back to socket.remoteAddress and reports null without any address', () => {
    const { hits } = collectHits({}, { remoteAddress: '192.0.2.10' })
    expect(hits[0]?.ip).toBe('192.0.2.10')
    const none = collectHits({}, {})
    expect(none.hits[0]?.ip).toBeNull()
  })

  it('reports an empty user agent when the header is missing', () => {
    const { hits } = collectHits({}, {})
    expect(hits[0]?.userAgent).toBe('')
  })

  it('emits for redirect and custom HTML responses too', () => {
    expect(collectHits({ fakeAdminUrl: '/moved' }).hits).toHaveLength(1)
    expect(collectHits({ customHtml: '<p>x</p>' }).hits).toHaveLength(1)
  })

  it('does not emit for unrelated paths', () => {
    const { hits } = collectHits({}, { originalUrl: '/dashboard' })
    expect(hits).toHaveLength(0)
  })

  it('survives a throwing listener', () => {
    const eventEmitter = new EventEmitter()
    eventEmitter.on(HONEYPOT_HIT_EVENT, () => {
      throw new Error('listener exploded')
    })
    const { response } = run(createMiddleware({ eventEmitter }))
    expect(response.ended).toBe(true)
    expect(response.statusCode).toBe(200)
  })

  it('emits exactly one event for a single request even with many listeners', () => {
    const eventEmitter = new EventEmitter()
    let total = 0
    eventEmitter.on(HONEYPOT_HIT_EVENT, () => {
      total++
    })
    eventEmitter.on(HONEYPOT_HIT_EVENT, () => {
      total++
    })
    run(createMiddleware({ eventEmitter }))
    expect(total).toBe(2)
  })
})

describe('logger', () => {
  it('warns once per hit with method, path and ip', () => {
    const warn = vi.fn()
    run(createMiddleware({ logger: { warn } }), {
      originalUrl: '/admin',
      method: 'GET',
      ip: '203.0.113.7',
      userAgent: 'curl/8.0',
    })
    expect(warn).toHaveBeenCalledOnce()
    const message = warn.mock.calls[0]?.[0] as string
    expect(message).toContain('GET')
    expect(message).toContain('/admin')
    expect(message).toContain('203.0.113.7')
    expect(message).toContain('curl/8.0')
  })

  it('truncates long user agents in log lines', () => {
    const warn = vi.fn()
    run(createMiddleware({ logger: { warn } }), { userAgent: 'a'.repeat(5000) })
    const message = warn.mock.calls[0]?.[0]
    expect(typeof message).toBe('string')
    expect((message as string).length).toBeLessThan(300)
  })

  it('never includes request bodies or credentials', () => {
    const warn = vi.fn()
    const request = fakeRequest({ originalUrl: '/admin', method: 'POST' })
    ;(request as { body?: unknown }).body = { username: 'root', password: 'hunter2' }
    const middleware = createMiddleware({ logger: { warn } })
    middleware.use(request, fakeResponse(), vi.fn())
    expect(warn.mock.calls[0]?.[0]).not.toContain('hunter2')
  })

  it('survives a throwing logger', () => {
    const middleware = createMiddleware({
      logger: {
        warn: () => {
          throw new Error('logger exploded')
        },
      },
    })
    const { response } = run(middleware)
    expect(response.ended).toBe(true)
    expect(response.statusCode).toBe(200)
  })

  it('does not log unrelated paths', () => {
    const warn = vi.fn()
    run(createMiddleware({ logger: { warn } }), { originalUrl: '/dashboard' })
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('HoneypotMiddleware with encoded request paths', () => {
  it('intercepts but reports the raw pathname, never the decoded one', () => {
    const emitter = new EventEmitter()
    const hits: HoneypotHitEvent[] = []
    emitter.on(HONEYPOT_HIT_EVENT, (hit: HoneypotHitEvent) => hits.push(hit))
    const middleware = createMiddleware({ path: '/admin', eventEmitter: emitter })
    const response = fakeResponse()
    const next = vi.fn()
    middleware.use(fakeRequest({ originalUrl: '/%61dmin/%0Alogin?x=1' }), response, next)
    expect(next).not.toHaveBeenCalled()
    expect(response.statusCode).toBe(200)
    expect(hits).toHaveLength(1)
    expect(hits[0]?.path).toBe('/%61dmin/%0Alogin')
  })
})
