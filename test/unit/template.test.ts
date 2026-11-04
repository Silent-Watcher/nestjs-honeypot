import { describe, expect, it } from 'vitest'
import { escapeHtml, renderDefaultLoginPage } from '../../src/template'

describe('escapeHtml', () => {
  it('escapes characters meaningful in HTML text and attributes', () => {
    expect(escapeHtml('<script>"a"&\'b\'</script>')).toBe(
      '&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/script&gt;',
    )
  })

  it('leaves plain paths untouched', () => {
    expect(escapeHtml('/admin/login')).toBe('/admin/login')
  })
})

describe('renderDefaultLoginPage', () => {
  it('produces an HTML5 document with a login form', () => {
    const html = renderDefaultLoginPage('/admin')
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('<form method="POST" action="/admin">')
    expect(html).toContain('name="username"')
    expect(html).toContain('name="password"')
    expect(html).toContain('type="password"')
    expect(html).toContain('<button type="submit">')
  })

  it('uses the configured path as form action', () => {
    const html = renderDefaultLoginPage('/secret-panel')
    expect(html).toContain('action="/secret-panel"')
    expect(html).not.toContain('action="/admin"')
  })

  it('escapes a path containing HTML-special characters', () => {
    const html = renderDefaultLoginPage('/a"b')
    expect(html).toContain('action="/a&quot;b"')
    expect(html).not.toContain('action="/a"b"')
  })

  it('contains no external references', () => {
    const html = renderDefaultLoginPage('/admin')
    expect(html).not.toMatch(/https?:\/\//)
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<link')
  })
})
