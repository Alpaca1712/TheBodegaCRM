import type { Lead } from '@/types'

export type TemplateVars = Record<string, string | null | undefined>

/**
 * Variables available in step subjects/bodies and lead magnet templates.
 * Supports `{{first_name}}` and `{{first_name|there}}` (fallback when empty).
 */
export function leadTemplateVars(lead: Lead, extra: TemplateVars = {}): TemplateVars {
  const first = lead.first_name || lead.full_name?.split(' ')[0] || null
  return {
    email: lead.email,
    first_name: first,
    last_name: lead.last_name,
    full_name: lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || null,
    title: lead.title,
    company_name: lead.company_name,
    company: lead.company_name,
    company_domain: lead.company_domain,
    company_website: lead.company_website,
    company_industry: lead.company_industry,
    company_location: lead.company_location,
    linkedin_url: lead.linkedin_url,
    ...flattenResearch(lead.research),
    ...extra,
  }
}

function flattenResearch(research: Record<string, unknown>): TemplateVars {
  const vars: TemplateVars = {}
  for (const [key, value] of Object.entries(research || {})) {
    if (typeof value === 'string' || typeof value === 'number') vars[`research.${key}`] = String(value)
  }
  return vars
}

const TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)\s*(?:\|\s*([^}]*?)\s*)?\}\}/g

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(TOKEN, (_match, name: string, fallback?: string) => {
    const value = vars[name]
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value)
    return fallback ?? ''
  })
}

export function findUnresolvedTokens(template: string, vars: TemplateVars): string[] {
  const missing = new Set<string>()
  for (const match of template.matchAll(TOKEN)) {
    const [, name, fallback] = match
    const value = vars[name]
    if ((value === undefined || value === null || String(value).trim() === '') && fallback === undefined) {
      missing.add(name)
    }
  }
  return [...missing]
}
