'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  X, ArrowRight, Loader2, Download,
} from 'lucide-react'
import { createContact } from '@/lib/api/contacts'
import { toast } from 'sonner'

type CsvRow = Record<string, string>

const FIELD_MAP: Record<string, string> = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  title: 'Title',
  status: 'Status',
  source: 'Source',
  notes: 'Notes',
}

const REQUIRED_FIELDS = ['first_name', 'last_name']

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const parseRow = (line: string) => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim()); current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
  const rows = lines.slice(1).map(line => {
    const values = parseRow(line)
    const row: CsvRow = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  }).filter(row => Object.values(row).some(v => v.trim()))

  return { headers, rows }
}

function normalizeHeader(h: string): string {
  const aliases: Record<string, string> = {
    firstname: 'first_name', first: 'first_name', 'first name': 'first_name',
    lastname: 'last_name', last: 'last_name', 'last name': 'last_name',
    email_address: 'email', emailaddress: 'email',
    phone_number: 'phone', phonenumber: 'phone', mobile: 'phone',
    job_title: 'title', jobtitle: 'title', position: 'title', role: 'title',
    company: 'source', lead_source: 'source', leadsource: 'source',
    note: 'notes', comment: 'notes', comments: 'notes',
  }
  return aliases[h] || h
}

export default function ContactImportPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'done'>('upload')
  const [fileName, setFileName] = useState('')
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<CsvRow[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] }>({ success: 0, failed: 0, errors: [] })

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows: parsedRows } = parseCsv(text)
      if (headers.length === 0) {
        toast.error('Could not parse CSV — check the format')
        return
      }
      setRawHeaders(headers)
      setRows(parsedRows)

      const autoMap: Record<string, string> = {}
      headers.forEach(h => {
        const normalized = normalizeHeader(h)
        if (Object.keys(FIELD_MAP).includes(normalized)) {
          autoMap[h] = normalized
        } else if (Object.keys(FIELD_MAP).includes(h)) {
          autoMap[h] = h
        }
      })
      setMapping(autoMap)
      setStep('map')
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleImport = async () => {
    setStep('importing')
    const results = { success: 0, failed: 0, errors: [] as string[] }

    const invertedMap: Record<string, string> = {}
    Object.entries(mapping).forEach(([csvCol, crmField]) => {
      if (crmField) invertedMap[crmField] = csvCol
    })

    if (!invertedMap.first_name || !invertedMap.last_name) {
      toast.error('First Name and Last Name are required mappings')
      setStep('map')
      return
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      setImportProgress(Math.round(((i + 1) / rows.length) * 100))

      const contact: Record<string, string> = {}
      Object.entries(invertedMap).forEach(([field, csvCol]) => {
        if (row[csvCol]) contact[field] = row[csvCol]
      })

      if (!contact.first_name || !contact.last_name) {
        results.failed++
        results.errors.push(`Row ${i + 2}: Missing first or last name`)
        continue
      }

      if (!contact.status || !['active', 'inactive', 'lead'].includes(contact.status)) {
        contact.status = 'lead'
      }

      try {
        const result = await createContact(contact as unknown as Parameters<typeof createContact>[0])
        if (result.error) {
          results.failed++
          results.errors.push(`Row ${i + 2}: ${result.error}`)
        } else {
          results.success++
        }
      } catch {
        results.failed++
        results.errors.push(`Row ${i + 2}: Unexpected error`)
      }
    }

    setImportResults(results)
    setStep('done')
  }

  const mappedFields = new Set(Object.values(mapping).filter(Boolean))
  const canImport = REQUIRED_FIELDS.every(f => mappedFields.has(f))

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/contacts" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 mb-4">
        <ArrowLeft size={14} /> Contacts
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Import Contacts</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Upload a CSV file to bulk-import contacts</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {['Upload', 'Map Fields', 'Preview & Import'].map((label, i) => {
          const stepIndex = { upload: 0, map: 1, preview: 2, importing: 2, done: 3 }[step]
          const isActive = i === stepIndex
          const isDone = i < (stepIndex ?? 0)
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className={`h-0.5 w-8 rounded-full ${isDone ? 'bg-indigo-500' : 'bg-zinc-200 dark:bg-zinc-700'}`} />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' :
                isDone ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                'text-zinc-400 dark:text-zinc-500'
              }`}>
                {isDone ? <CheckCircle2 size={12} /> : <span>{i + 1}</span>}
                {label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          className="bg-white dark:bg-zinc-900 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
          <Upload className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Drop your CSV file here, or click to browse
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Supports standard CSV format with headers
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs text-zinc-500 dark:text-zinc-400">
            <Download size={12} />
            <a href="#" onClick={e => {
              e.preventDefault(); e.stopPropagation()
              const csv = 'first_name,last_name,email,phone,title,status,source,notes\nJohn,Doe,john@example.com,+1234567890,CEO,lead,website,Sample note'
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = 'contacts_template.csv'; a.click()
              URL.revokeObjectURL(url)
            }} className="hover:text-indigo-600 transition-colors">
              Download template
            </a>
          </div>
        </div>
      )}

      {/* Step 2: Map fields */}
      {step === 'map' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet size={14} className="text-indigo-500" />
                {fileName}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{rows.length} rows found · Map CSV columns to CRM fields</p>
            </div>
            <button onClick={() => { setStep('upload'); setRows([]); setRawHeaders([]) }} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              <X size={14} />
            </button>
          </div>
          <div className="p-5 space-y-3">
            {rawHeaders.map(header => (
              <div key={header} className="flex items-center gap-3">
                <span className="w-1/3 text-sm text-zinc-600 dark:text-zinc-400 font-mono truncate">{header}</span>
                <ArrowRight size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
                <select
                  value={mapping[header] || ''}
                  onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Skip this column</option>
                  {Object.entries(FIELD_MAP).map(([key, label]) => (
                    <option key={key} value={key} disabled={key !== mapping[header] && mappedFields.has(key)}>
                      {label} {REQUIRED_FIELDS.includes(key) ? '*' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <button onClick={() => setStep('upload')} className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
              Back
            </button>
            <button
              onClick={() => setStep('preview')}
              disabled={!canImport}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors"
            >
              Preview Import <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Preview</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Importing {rows.length} contacts with{' '}
              {Object.values(mapping).filter(Boolean).length} mapped fields
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  {Object.entries(mapping).filter(([, v]) => v).map(([csvCol, field]) => (
                    <th key={csvCol} className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      {FIELD_MAP[field]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-zinc-50 dark:border-zinc-800/50">
                    {Object.entries(mapping).filter(([, v]) => v).map(([csvCol]) => (
                      <td key={csvCol} className="px-4 py-2 text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">
                        {row[csvCol] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 5 && (
            <p className="px-5 py-2 text-xs text-zinc-400 dark:text-zinc-500">
              ... and {rows.length - 5} more rows
            </p>
          )}
          <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <button onClick={() => setStep('map')} className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
              Back
            </button>
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              Import {rows.length} Contacts
            </button>
          </div>
        </div>
      )}

      {/* Importing */}
      {step === 'importing' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Importing contacts...</p>
          <div className="mt-4 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden max-w-xs mx-auto">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
          </div>
          <p className="text-xs text-zinc-400 mt-2">{importProgress}% complete</p>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
          <div className="text-center">
            {importResults.success > 0 ? (
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-4" />
            ) : (
              <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            )}
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Import Complete</h2>
            <div className="mt-3 flex items-center justify-center gap-6 text-sm">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {importResults.success} imported
              </span>
              {importResults.failed > 0 && (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {importResults.failed} failed
                </span>
              )}
            </div>
          </div>

          {importResults.errors.length > 0 && (
            <div className="mt-4 max-h-40 overflow-y-auto bg-red-50 dark:bg-red-950 rounded-lg p-3 space-y-1">
              {importResults.errors.slice(0, 20).map((err, i) => (
                <p key={i} className="text-xs text-red-700 dark:text-red-300">{err}</p>
              ))}
              {importResults.errors.length > 20 && (
                <p className="text-xs text-red-500">... and {importResults.errors.length - 20} more errors</p>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => router.push('/contacts')}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              View Contacts
            </button>
            <button
              onClick={() => { setStep('upload'); setRows([]); setRawHeaders([]); setImportResults({ success: 0, failed: 0, errors: [] }) }}
              className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              Import More
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
