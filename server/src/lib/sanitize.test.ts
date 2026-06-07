import { describe, it, expect } from 'bun:test'
import { sanitizeEmailHtml } from './sanitize'

describe('sanitizeEmailHtml', () => {
  it('strips script tags and their content', () => {
    const result = sanitizeEmailHtml('<p>Hello</p><script>alert("xss")</script>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('<p>Hello</p>')
  })

  it('preserves allowed inline tags: strong, em, a, code', () => {
    const result = sanitizeEmailHtml('<p><strong>Bold</strong> and <em>italic</em></p>')
    expect(result).toContain('<strong>Bold</strong>')
    expect(result).toContain('<em>italic</em>')
  })

  it('forces external links to open in a new tab with security rel attributes', () => {
    const result = sanitizeEmailHtml('<a href="https://example.com">Visit</a>')
    expect(result).toContain('target="_blank"')
    expect(result).toContain('rel="noopener noreferrer"')
    expect(result).toContain('href="https://example.com"')
  })

  it('allows cid: scheme for embedded images', () => {
    const result = sanitizeEmailHtml('<img src="cid:image001@domain.com" alt="logo">')
    expect(result).toContain('src="cid:image001@domain.com"')
  })

  it('removes javascript: hrefs', () => {
    const result = sanitizeEmailHtml('<a href="javascript:void(0)">click me</a>')
    expect(result).not.toContain('javascript:')
  })

  it('strips event handler attributes like onclick', () => {
    const result = sanitizeEmailHtml('<p onclick="steal()">Text</p>')
    expect(result).not.toContain('onclick')
    expect(result).toContain('Text')
  })

  it('strips iframe tags entirely', () => {
    const result = sanitizeEmailHtml('<iframe src="https://evil.com"></iframe>Safe text')
    expect(result).not.toContain('<iframe')
    expect(result).toContain('Safe text')
  })

  it('strips style and noscript tags', () => {
    const result = sanitizeEmailHtml('<style>body{background:red}</style><p>Content</p>')
    expect(result).not.toContain('<style>')
    expect(result).toContain('<p>Content</p>')
  })
})
