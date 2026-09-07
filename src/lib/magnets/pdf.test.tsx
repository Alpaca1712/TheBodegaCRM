// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Lead, LeadMagnet } from '@/types'
import { magnetFilename, renderLeadMagnetPdf, renderMagnetMarkdown } from './pdf'

const lead = {
  id: 'l1',
  email: 'ana@acme.io',
  first_name: 'Ana',
  full_name: 'Ana Ruiz',
  company_name: 'Acme',
  research: {},
} as unknown as Lead

const magnet: LeadMagnet = {
  id: 'm1',
  name: 'Pentest Readiness Checklist',
  slug: 'pentest-readiness',
  description: null,
  body_markdown: '# Hi {{first_name}}\n\nA checklist for **{{company_name}}**.\n\n- Inventory your [attack surface](https://pigeonlabs.nyc)\n- Rotate keys\n\n> Prepared by Pigeon Labs',
  filename_template: '{{company_name}} - {{name}}.pdf',
  created_at: '',
  updated_at: '',
}

describe('lead magnet PDF', () => {
  it('personalises the markdown and filename', () => {
    expect(renderMagnetMarkdown(magnet, lead)).toContain('# Hi Ana')
    expect(renderMagnetMarkdown(magnet, lead)).toContain('**Acme**')
    expect(magnetFilename(magnet, lead)).toBe('Acme - Pentest Readiness Checklist.pdf')
  })

  it('renders a real PDF buffer', async () => {
    const { content, filename } = await renderLeadMagnetPdf(magnet, lead)
    expect(filename.endsWith('.pdf')).toBe(true)
    expect(content.subarray(0, 5).toString()).toBe('%PDF-')
    expect(content.byteLength).toBeGreaterThan(1000)
  }, 20_000)
})
