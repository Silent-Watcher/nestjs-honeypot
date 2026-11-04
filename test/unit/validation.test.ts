import { Logger } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { resolveHoneypotOptions, validateHoneypotPath } from '../../src/honeypot.options'

describe('validateHoneypotPath', () => {
  it.each(['/admin', '/secret-panel', '/api/admin'])('accepts %s', (path) => {
    expect(() => validateHoneypotPath(path)).not.toThrow()
  })

  it.each([
    ['empty string', ''],
    ['relative path', 'admin'],
    ['root', '/'],
    ['query string', '/admin?x=1'],
    ['fragment', '/admin#top'],
  ])('rejects %s', (_name, path) => {
    expect(() => validateHoneypotPath(path)).toThrow()
  })
})

describe('resolveHoneypotOptions', () => {
  it('defaults the path to /admin', () => {
    expect(resolveHoneypotOptions({}).path).toBe('/admin')
  })

  it('keeps a custom path', () => {
    expect(resolveHoneypotOptions({ path: '/secret-panel' }).path).toBe('/secret-panel')
  })

  it('defaults the logger to the NestJS Logger', () => {
    expect(resolveHoneypotOptions({}).logger).toBeInstanceOf(Logger)
  })

  it('keeps a custom logger', () => {
    const logger = { warn: () => {} }
    expect(resolveHoneypotOptions({ logger }).logger).toBe(logger)
  })

  it('passes through eventEmitter and response options', () => {
    const eventEmitter = {} as never
    const resolved = resolveHoneypotOptions({
      fakeAdminUrl: 'https://example.com',
      customHtml: '<p>hi</p>',
      eventEmitter,
    })
    expect(resolved.fakeAdminUrl).toBe('https://example.com')
    expect(resolved.customHtml).toBe('<p>hi</p>')
    expect(resolved.eventEmitter).toBe(eventEmitter)
  })

  it('rejects an invalid path', () => {
    expect(() => resolveHoneypotOptions({ path: 'admin' })).toThrow('absolute pathname')
  })
})
