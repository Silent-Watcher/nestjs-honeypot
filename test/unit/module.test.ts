import type { INestApplication } from '@nestjs/common'
import { Module } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { HONEYPOT_OPTIONS } from '../../src/honeypot.constants'
import { HoneypotModule } from '../../src/honeypot.module'
import type { HoneypotOptions } from '../../src/honeypot.options'

describe('HoneypotModule.forRoot', () => {
  it('registers the resolved options provider', async () => {
    const module = await Test.createTestingModule({
      imports: [HoneypotModule.forRoot({ path: '/secret-panel' })],
    }).compile()

    const options = module.get<HoneypotOptions>(HONEYPOT_OPTIONS)
    expect(options.path).toBe('/secret-panel')
    expect(options.logger).toBeDefined()
    await module.close()
  })

  it('rejects an invalid path during initialization', async () => {
    const module = Test.createTestingModule({
      imports: [HoneypotModule.forRoot({ path: 'admin' })],
    })
    await expect(module.compile()).rejects.toThrow('absolute pathname')
  })
})

describe('HoneypotModule.forRootAsync', () => {
  class ConfigService {
    get(key: string): string {
      return key === 'HONEYPOT_PATH' ? '/secret-panel' : ''
    }
  }

  @Module({ providers: [ConfigService], exports: [ConfigService] })
  class ConfigModule {}

  it('resolves options from an injected factory', async () => {
    const module = await Test.createTestingModule({
      imports: [
        HoneypotModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({ path: config.get('HONEYPOT_PATH') }),
        }),
      ],
    }).compile()

    const options = module.get<HoneypotOptions>(HONEYPOT_OPTIONS)
    expect(options.path).toBe('/secret-panel')
    await module.close()
  })

  it('supports an asynchronous factory', async () => {
    const module = await Test.createTestingModule({
      imports: [
        HoneypotModule.forRootAsync({
          useFactory: async () => ({ path: '/async-admin' }),
        }),
      ],
    }).compile()

    expect(module.get<HoneypotOptions>(HONEYPOT_OPTIONS).path).toBe('/async-admin')
    await module.close()
  })

  it('rejects an invalid factory result during initialization', async () => {
    const module = Test.createTestingModule({
      imports: [HoneypotModule.forRootAsync({ useFactory: () => ({ path: '/' }) })],
    })
    await expect(module.compile()).rejects.toThrow('entire application')
  })
})

describe('middleware registration', () => {
  let app: INestApplication

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [HoneypotModule.forRoot({ path: '/admin' })],
    }).compile()
    const nestApp = module.createNestApplication()
    await nestApp.init()
    app = nestApp
  })

  afterAll(async () => {
    await app.close()
  })

  it('terminates requests to the protected path', async () => {
    const response = await request(app.getHttpServer()).get('/admin')
    expect(response.status).toBe(200)
  })

  it('terminates nested protected paths', async () => {
    const response = await request(app.getHttpServer()).get('/admin/login')
    expect(response.status).toBe(200)
  })

  it('lets unrelated paths fall through to the router', async () => {
    const response = await request(app.getHttpServer()).get('/dashboard')
    expect(response.status).toBe(404)
  })

  it('ignores query strings when matching', async () => {
    const response = await request(app.getHttpServer()).get('/admin?next=/home')
    expect(response.status).toBe(200)
  })
})
