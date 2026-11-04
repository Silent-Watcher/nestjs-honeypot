import { describe, expect, it } from 'vitest'
import { isHoneypotPath, requestPathname } from '../../src/honeypot.path'

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

describe('isHoneypotPath normalization', () => {
  it('matches percent-encoded ASCII variants', () => {
    expect(isHoneypotPath('/%61dmin', '/admin')).toBe(true)
    expect(isHoneypotPath('/%41DMIN/login', '/admin')).toBe(true)
    expect(isHoneypotPath('/admin%2Flogin', '/admin')).toBe(true)
  })

  it('collapses repeated slashes', () => {
    expect(isHoneypotPath('//admin', '/admin')).toBe(true)
    expect(isHoneypotPath('/admin//login', '/admin')).toBe(true)
    expect(isHoneypotPath('///admin///', '/admin')).toBe(true)
  })

  it('matches a configured non-ASCII path against its encoded request form', () => {
    expect(isHoneypotPath('/%D9%BE%D9%86%D9%84', '/پنل')).toBe(true)
    expect(isHoneypotPath('/%D9%BE%D9%86%D9%84/login', '/پنل')).toBe(true)
  })

  it('still decodes ASCII escapes when other escapes are malformed', () => {
    expect(isHoneypotPath('/%61dmin%E0%A4%A', '/admin')).toBe(false)
    expect(isHoneypotPath('/%61dmin/%E0%A4%A', '/admin')).toBe(true)
  })

  it('does not widen matching to lookalike paths', () => {
    expect(isHoneypotPath('/%61dministrator', '/admin')).toBe(false)
    expect(isHoneypotPath('/x/admin', '/admin')).toBe(false)
  })
})
