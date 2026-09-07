import { describe, expect, it } from 'vitest'
import type { Lead } from '@/types'
import { findUnresolvedTokens, leadTemplateVars, renderTemplate } from './templating'

const lead = {
  id: 'l1',
  email: 'ana@acme.io',
  first_name: 'Ana',
  last_name: 'Ruiz',
  full_name: 'Ana Ruiz',
  title: 'CTO',
  company_name: 'Acme',
  company_domain: 'acme.io',
  research: { hook: 'raised a Series A', headcount: 42 },
} as unknown as Lead

describe('renderTemplate', () => {
  it('substitutes lead fields and research keys', () => {
    const vars = leadTemplateVars(lead)
    expect(renderTemplate('Hi {{first_name}} at {{company_name}} — saw you {{research.hook}} ({{research.headcount}} people)', vars))
      .toBe('Hi Ana at Acme — saw you raised a Series A (42 people)')
  })

  it('uses the fallback when the value is empty and blanks otherwise', () => {
    const vars = leadTemplateVars({ ...lead, first_name: null, full_name: null } as Lead)
    expect(renderTemplate('Hi {{first_name|there}},', vars)).toBe('Hi there,')
    expect(renderTemplate('Hi {{first_name}},', vars)).toBe('Hi ,')
  })

  it('tolerates whitespace inside braces', () => {
    expect(renderTemplate('{{ title }} / {{ company | n/a }}', leadTemplateVars(lead))).toBe('CTO / Acme')
  })
})

describe('findUnresolvedTokens', () => {
  it('lists tokens with no value and no fallback', () => {
    const vars = leadTemplateVars({ ...lead, title: null } as Lead)
    expect(findUnresolvedTokens('{{title}} {{first_name}} {{company_size|small}} {{nope}}', vars)).toEqual(['title', 'nope'])
  })
})
