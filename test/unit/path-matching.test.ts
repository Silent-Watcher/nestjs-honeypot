import { describe, expect, it } from 'vitest'
import { isHoneypotPath, requestPathname } from '../../src/honeypot.middleware'

describe('isHoneypotPath with configured path /admin', () => {
  const target = '/admin'

  it('matches the exact path', () => {
    expect(isHoneypotPath('/admin', target)).toBe(true)
  })

  it('matches nested paths', () => {
    expect(isHoneypotPath('/admin/login', target)).toBe(true)
    expect(isHoneypotPath('/admin/deep/nested/url', target)).toBe(true)
  })

  it('matches case-insensitively', () => {
    expect(isHoneypotPath('/ADMIN', target)).toBe(true)
    expect(isHoneypotPath('/Admin/Login', target)).toBe(true)
  })

  it('treats trailing slashes as equivalent', () => {
    expect(isHoneypotPath('/admin/', target)).toBe(true)
    expect(isHoneypotPath('/admin/login/', target)).toBe(true)
  })

  it('does not match paths merely starting with the same text', () => {
    expect(isHoneypotPath('/administrator', target)).toBe(false)
    expect(isHoneypotPath('/adminx', target)).toBe(false)
  })

  it('does not match unrelated paths', () => {
    expect(isHoneypotPath('/', target)).toBe(false)
    expect(isHoneypotPath('/dashboard', target)).toBe(false)
  })

  it('trailing slash on the configured path changes nothing', () => {
    expect(isHoneypotPath('/admin', '/admin/')).toBe(true)
    expect(isHoneypotPath('/administrator', '/admin/')).toBe(false)
  })
})

describe('requestPathname', () => {
  it('returns "/" for a missing url', () => {
    expect(requestPathname(undefined)).toBe('/')
  })

  it('drops the query string', () => {
    expect(requestPathname('/admin?next=/home&x=1')).toBe('/admin')
  })

  it('drops the fragment', () => {
    expect(requestPathname('/admin#section')).toBe('/admin')
  })

  it('keeps a bare path untouched', () => {
    expect(requestPathname('/admin/login')).toBe('/admin/login')
  })
})
