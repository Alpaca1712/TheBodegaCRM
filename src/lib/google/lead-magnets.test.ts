import { describe, expect, it } from 'vitest'
import { safePdfFilename } from './lead-magnets'

describe('safePdfFilename', () => {
  it('separates the company and lead magnet with one hyphen and no spaces', () => {
    expect(safePdfFilename("Zeme - Don't Let Security Reviews Kill Your Deals.pdf"))
      .toBe('Zeme-Dont-Let-Security-Reviews-Kill-Your-Deals.pdf')
  })

  it('normalizes punctuation, accents, and repeated separators', () => {
    expect(safePdfFilename('Café / Security   Guide.pdf.pdf'))
      .toBe('Cafe-Security-Guide.pdf')
  })

  it('uses a readable fallback for an empty filename', () => {
    expect(safePdfFilename(' .pdf')).toBe('lead-magnet.pdf')
  })
})
