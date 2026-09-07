import { describe, expect, it } from 'vitest'
import { appendSignature, htmlToText, renderBody, replySubject, textToHtml } from './render'

describe('renderBody', () => {
  it('turns plain text into escaped paragraphs', () => {
    const { html, text } = renderBody('Hi <Ana>,\n\nQuick one.\nSecond line.', 'text')
    expect(text).toBe('Hi <Ana>,\n\nQuick one.\nSecond line.')
    expect(html).toContain('Hi &lt;Ana&gt;,</p>')
    expect(html).toContain('Quick one.<br>Second line.')
  })

  it('renders markdown to html and a readable text fallback', () => {
    const { html, text } = renderBody('**Bold** and a [link](https://x.io)\n\n- one\n- two', 'markdown')
    expect(html).toContain('<strong>Bold</strong>')
    expect(html).toContain('href="https://x.io"')
    expect(text).toBe('Bold and a link (https://x.io)\n\n- one\n- two')
  })

  it('derives text from html bodies', () => {
    expect(htmlToText('<p>Hello<br>there</p><p>Bye &amp; thanks</p>')).toBe('Hello\nthere\n\nBye & thanks')
  })
})

describe('appendSignature', () => {
  it('adds the signature to both parts and skips when empty', () => {
    const base = renderBody('Body', 'text')
    expect(appendSignature(base, '   ')).toEqual(base)
    const signed = appendSignature(base, 'Daniel\nPigeon Labs')
    expect(signed.text).toBe('Body\n\nDaniel\nPigeon Labs')
    expect(signed.html).toContain('Daniel\nPigeon Labs</p></div>')
  })
})

describe('helpers', () => {
  it('prefixes Re: once', () => {
    expect(replySubject('Quick question')).toBe('Re: Quick question')
    expect(replySubject('RE: Quick question')).toBe('RE: Quick question')
  })

  it('wraps text in a styled container', () => {
    expect(textToHtml('x')).toMatch(/^<div style=/)
  })
})
