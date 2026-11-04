import { EventEmitter } from 'node:events'
import net from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { Controller, Get, Module } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { HONEYPOT_HIT_EVENT } from '../../src/honeypot.constants'
import { HoneypotModule } from '../../src/honeypot.module'
import type { HoneypotHitEvent } from '../../src/honeypot.types'

@Controller()
class HealthController {
  @Get('health')
  health(): string {
    return 'ok'
  }
}

@Module({
  controllers: [HealthController],
})
class FeatureModule {}

function createFastifyApp(options: Parameters<typeof HoneypotModule.forRoot>[0]) {
  return Test.createTestingModule({
    imports: [HoneypotModule.forRoot(options), FeatureModule],
  })
    .compile()
    .then((module) => module.createNestApplication(new FastifyAdapter()))
}

/** Fastify only serves requests through supertest once its instance is ready. */
async function initFastifyApp(app: INestApplication): Promise<INestApplication> {
  await app.init()
  const instance = app.getHttpAdapter().getInstance() as { ready: () => Promise<unknown> }
  await instance.ready()
  return app
}

describe('Honeypot integration (Fastify)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createFastifyApp({ path: '/admin' })
    await initFastifyApp(app)
  })

  afterAll(async () => {
    await app.close()
  })

  it('serves the default template with correct headers', async () => {
    const response = await request(app.getHttpServer()).get('/admin')
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('text/html; charset=utf-8')
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.text).toContain('action="/admin"')
    expect(response.text).toContain('type="password"')
  })

  it('intercepts nested paths, trailing slashes, case-insensitively', async () => {
    for (const path of ['/admin/', '/admin/login', '/ADMIN/Login', '/admin/deep/inside']) {
      const response = await request(app.getHttpServer()).get(path)
      expect(response.status, path).toBe(200)
    }
  })

  it('intercepts every HTTP method', async () => {
    for (const method of ['post', 'put', 'patch', 'delete', 'options'] as const) {
      const response = await request(app.getHttpServer())[method]('/admin')
      expect(response.status, method).toBe(200)
    }
  })

  it('answers HEAD requests', async () => {
    const response = await request(app.getHttpServer()).head('/admin')
    expect(response.status).toBe(200)
  })

  it('lets unrelated paths reach their controllers', async () => {
    const response = await request(app.getHttpServer()).get('/health')
    expect(response.status).toBe(200)
    expect(response.text).toBe('ok')
    const miss = await request(app.getHttpServer()).get('/administrator')
    expect(miss.status).toBe(404)
  })

  it('ignores query strings when matching', async () => {
    const response = await request(app.getHttpServer()).get('/admin?x=1')
    expect(response.status).toBe(200)
  })

  it('redirects with 302 and Location header', async () => {
    const redirectApp = await createFastifyApp({ path: '/admin', fakeAdminUrl: '/moved-away' })
    await initFastifyApp(redirectApp)
    try {
      const response = await request(redirectApp.getHttpServer()).get('/admin/login')
      expect(response.status).toBe(302)
      expect(response.headers.location).toBe('/moved-away')
    } finally {
      await redirectApp.close()
    }
  })

  it('serves custom HTML as-is', async () => {
    const customApp = await createFastifyApp({ path: '/admin', customHtml: '<h1>Nothing</h1>' })
    await initFastifyApp(customApp)
    try {
      const response = await request(customApp.getHttpServer()).get('/admin')
      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toBe('text/html; charset=utf-8')
      expect(response.text).toBe('<h1>Nothing</h1>')
    } finally {
      await customApp.close()
    }
  })

  it('emits one event per hit with correct path and user agent', async () => {
    const emitter = new EventEmitter()
    const hits: HoneypotHitEvent[] = []
    emitter.on(HONEYPOT_HIT_EVENT, (hit: HoneypotHitEvent) => hits.push(hit))
    const eventApp = await createFastifyApp({ path: '/admin', eventEmitter: emitter })
    await initFastifyApp(eventApp)
    try {
      await request(eventApp.getHttpServer())
        .post('/admin/login')
        .set('user-agent', 'honeyprobe/1.0')
      expect(hits).toHaveLength(1)
      const hit = hits[0]
      if (!hit) throw new Error('no hit event')
      expect(hit.method).toBe('POST')
      expect(hit.path).toBe('/admin/login')
      expect(hit.userAgent).toBe('honeyprobe/1.0')
    } finally {
      await eventApp.close()
    }
  })

  it('emits events for redirect responses too', async () => {
    const emitter = new EventEmitter()
    const hits: HoneypotHitEvent[] = []
    emitter.on(HONEYPOT_HIT_EVENT, (hit: HoneypotHitEvent) => hits.push(hit))
    const eventApp = await createFastifyApp({
      path: '/admin',
      fakeAdminUrl: '/elsewhere',
      eventEmitter: emitter,
    })
    await initFastifyApp(eventApp)
    try {
      await request(eventApp.getHttpServer()).get('/admin')
      expect(hits).toHaveLength(1)
    } finally {
      await eventApp.close()
    }
  })

  it('warns once per hit through the configured logger', async () => {
    const warn = vi.fn()
    const loggerApp = await createFastifyApp({ path: '/admin', logger: { warn } })
    await initFastifyApp(loggerApp)
    try {
      await request(loggerApp.getHttpServer()).get('/admin')
      await request(loggerApp.getHttpServer()).get('/health')
      expect(warn).toHaveBeenCalledOnce()
      expect(warn.mock.calls[0]?.[0]).toContain('GET /admin')
    } finally {
      await loggerApp.close()
    }
  })
})

describe('Honeypot integration (Fastify, custom path)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createFastifyApp({ path: '/secret-panel' })
    await initFastifyApp(app)
  })

  afterAll(async () => {
    await app.close()
  })

  it('serves the decoy with the configured form action', async () => {
    const response = await request(app.getHttpServer()).get('/Secret-Panel/login')
    expect(response.status).toBe(200)
    expect(response.text).toContain('action="/secret-panel"')
  })

  it('does not intercept the default path anymore', async () => {
    const response = await request(app.getHttpServer()).get('/admin')
    expect(response.status).toBe(404)
  })
})

describe('Honeypot integration (Fastify, global prefix)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [HoneypotModule.forRoot({ path: '/api/admin' }), FeatureModule],
    }).compile()
    app = module.createNestApplication(new FastifyAdapter())
    app.setGlobalPrefix('api')
    await initFastifyApp(app)
  })

  afterAll(async () => {
    await app.close()
  })

  it('intercepts the prefixed honeypot path and nested paths', async () => {
    const root = await request(app.getHttpServer()).get('/api/admin')
    expect(root.status).toBe(200)
    expect(root.text).toContain('action="/api/admin"')
    const nested = await request(app.getHttpServer()).get('/api/admin/login')
    expect(nested.status).toBe(200)
  })

  it('does not intercept the bare path without the prefix', async () => {
    const response = await request(app.getHttpServer()).get('/admin')
    expect(response.status).toBe(404)
  })
})

describe('Honeypot integration (Fastify, forRootAsync)', () => {
  it('resolves async options and protects the resolved path', async () => {
    const module = await Test.createTestingModule({
      imports: [
        HoneypotModule.forRootAsync({
          useFactory: async () => ({ path: '/async-panel' }),
        }),
      ],
    }).compile()
    const asyncApp = module.createNestApplication(new FastifyAdapter())
    await initFastifyApp(asyncApp)
    try {
      const response = await request(asyncApp.getHttpServer()).get('/async-panel')
      expect(response.status).toBe(200)
      expect(response.text).toContain('action="/async-panel"')
      const miss = await request(asyncApp.getHttpServer()).get('/admin')
      expect(miss.status).toBe(404)
    } finally {
      await asyncApp.close()
    }
  })
})

describe('Honeypot integration (Fastify, edge requests)', () => {
  it('handles requests without a user agent and reports the socket address', async () => {
    const emitter = new EventEmitter()
    const hits: HoneypotHitEvent[] = []
    emitter.on(HONEYPOT_HIT_EVENT, (hit: HoneypotHitEvent) => hits.push(hit))
    const bareApp = await createFastifyApp({ path: '/admin', eventEmitter: emitter })
    await initFastifyApp(bareApp)
    await bareApp.listen(0, '127.0.0.1')
    try {
      const address = (bareApp.getHttpServer() as { address: () => { port: number } }).address()
      await new Promise<void>((resolve, reject) => {
        const socket = net.connect(address.port, '127.0.0.1', () => {
          socket.write('GET /admin HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n')
        })
        socket.on('data', () => resolve())
        socket.on('error', reject)
      })
      expect(hits).toHaveLength(1)
      const hit = hits[0]
      if (!hit) throw new Error('no hit event')
      expect(hit.userAgent).toBe('')
      expect(hit.ip).toBeTruthy()
    } finally {
      await bareApp.close()
    }
  })
})
