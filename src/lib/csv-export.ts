import type { Lead } from '@/types/leads'
import { STAGE_LABELS, LEAD_TYPE_LABELS } from '@/types/leads'

const CSV_COLUMNS: { key: string; label: string; get: (l: Lead) => unknown }[] = [
  { key: 'contact_name', label: 'Contact Name', get: (l) => l.contact_name },
  { key: 'contact_title', label: 'Title', get: (l) => l.contact_title ?? '' },
  { key: 'contact_email', label: 'Email', get: (l) => l.contact_email ?? '' },
  { key: 'contact_phone', label: 'Phone', get: (l) => l.contact_phone ?? '' },
  { key: 'contact_linkedin', label: 'LinkedIn', get: (l) => l.contact_linkedin ?? '' },
  { key: 'contact_twitter', label: 'Twitter', get: (l) => l.contact_twitter ?? '' },
  { key: 'company_name', label: 'Company', get: (l) => l.company_name },
  { key: 'company_website', label: 'Website', get: (l) => l.company_website ?? '' },
  { key: 'product_name', label: 'Product', get: (l) => l.product_name ?? '' },
  { key: 'fund_name', label: 'Fund', get: (l) => l.fund_name ?? '' },
  { key: 'type', label: 'Type', get: (l) => LEAD_TYPE_LABELS[l.type] ?? l.type },
  { key: 'stage', label: 'Stage', get: (l) => STAGE_LABELS[l.stage] ?? l.stage },
  { key: 'priority', label: 'Priority', get: (l) => l.priority },
  { key: 'source', label: 'Source', get: (l) => l.source ?? '' },
  { key: 'icp_score', label: 'ICP Score', get: (l) => l.icp_score ?? '' },
  { key: 'last_contacted_at', label: 'Last Contacted', get: (l) => l.last_contacted_at ?? '' },
  { key: 'created_at', label: 'Created', get: (l) => l.created_at },
  { key: 'updated_at', label: 'Updated', get: (l) => l.updated_at },
  { key: 'notes', label: 'Notes', get: (l) => l.notes ?? '' },
]

/** Escape a single CSV field per RFC 4180. */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return ''
  let str = String(value)
  // Strip control chars that can break spreadsheet parsers
  str = str.replace(/\r?\n/g, ' ').replace(/\t/g, ' ')
  // Prevent spreadsheet formula injection
  if (/^[=+\-@]/.test(str)) str = `'${str}`
  if (/[",]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function leadsToCsv(leads: Lead[]): string {
  const header = CSV_COLUMNS.map((c) => escapeCsvField(c.label)).join(',')
  const rows = leads.map((lead) =>
    CSV_COLUMNS.map((c) => escapeCsvField(c.get(lead))).join(','),
  )
  return [header, ...rows].join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportLeadsToCsv(leads: Lead[], filenamePrefix = 'leads'): void {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCsv(`${filenamePrefix}-${stamp}.csv`, leadsToCsv(leads))
}
