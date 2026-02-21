'use client'

import { useState } from 'react'
import {
  Sparkles, Loader2, CheckCircle2, XCircle, Linkedin,
  Globe, MapPin, Building2, Briefcase, Phone, Mail,
  ChevronDown, ChevronUp, Download, Twitter, Github,
  GraduationCap, Lightbulb, AtSign,
} from 'lucide-react'
import { toast } from 'sonner'

interface EnrichedData {
  first_name: string
  last_name: string
  email: string | null
  secondary_emails: string[]
  phone: string | null
  title: string | null
  linkedin_url: string | null
  twitter_url: string | null
  github_url: string | null
  personal_website: string | null
  photo_url: string | null
  headline: string | null
  bio: string | null
  city: string | null
  state: string | null
  country: string | null
  company: {
    name: string | null
    domain: string | null
    industry: string | null
    employee_count: number | null
    founded_year: number | null
    linkedin_url: string | null
    description: string | null
    logo_url: string | null
    annual_revenue: string | null
    headquarters: string | null
    tech_stack: string[]
  }
  employment_history: Array<{
    title: string
    company: string
    start_date: string | null
    end_date: string | null
    current: boolean
  }>
  education: Array<{
    school: string
    degree: string | null
    field: string | null
    year: number | null
  }>
  skills: string[]
  interests: string[]
  seniority: string | null
  departments: string[]
  email_patterns: string[]
}

interface EnrichPanelProps {
  contactId: string
  firstName: string
  lastName: string
  email?: string
  companyName?: string
  onApply: (updates: Record<string, unknown>) => void
}

export default function EnrichPanel({ contactId, firstName, lastName, email, companyName, onApply }: EnrichPanelProps) {
  const [loading, setLoading] = useState(false)
  const [enriched, setEnriched] = useState<EnrichedData | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showEducation, setShowEducation] = useState(false)
  const [showEmails, setShowEmails] = useState(false)

  const handleEnrich = async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)

    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          company_name: companyName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Enrichment failed')
        return
      }

      if (!data.found) {
        setNotFound(true)
        return
      }

      setProvider(data.provider || null)
      setEnriched(data.data)
    } catch {
      setError('Network error — could not reach enrichment service')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!enriched) return
    const updates: Record<string, unknown> = {}

    if (enriched.email && !email) updates.email = enriched.email
    if (enriched.phone) updates.phone = enriched.phone
    if (enriched.title) updates.title = enriched.title
    if (enriched.linkedin_url) updates.linkedin_url = enriched.linkedin_url
    if (enriched.twitter_url) updates.twitter_url = enriched.twitter_url
    if (enriched.headline) updates.headline = enriched.headline
    if (enriched.city) updates.city = enriched.city
    if (enriched.state) updates.state = enriched.state
    if (enriched.country) updates.country = enriched.country
    if (enriched.seniority) updates.seniority = enriched.seniority

    updates.enriched_at = new Date().toISOString()
    updates.enrichment_data = {
      bio: enriched.bio,
      secondary_emails: enriched.secondary_emails,
      github_url: enriched.github_url,
      personal_website: enriched.personal_website,
      company: enriched.company,
      employment_history: enriched.employment_history,
      education: enriched.education,
      skills: enriched.skills,
      interests: enriched.interests,
      departments: enriched.departments,
      email_patterns: enriched.email_patterns,
      provider,
    }

    onApply(updates)
    toast.success('All enriched data applied to contact')
  }

  if (!enriched && !loading && !notFound && !error) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Enrich Contact</h3>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          Search the web to find emails, LinkedIn, title, phone, company, education, skills, and more
        </p>
        <button
          onClick={handleEnrich}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Enrich Contact
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Enrichment</h3>
      </div>

      <div className="p-5">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            Searching the web for {firstName} {lastName}...
          </div>
        )}

        {error && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
            <button onClick={handleEnrich} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              Try again
            </button>
          </div>
        )}

        {notFound && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <XCircle className="h-4 w-4 text-zinc-400" />
              No match found
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Try adding an email address or company name to improve matching.
            </p>
          </div>
        )}

        {enriched && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              {enriched.photo_url ? (
                <img src={enriched.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400 text-sm font-bold">
                  {enriched.first_name.charAt(0)}{enriched.last_name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  {enriched.first_name} {enriched.last_name}
                </p>
                {enriched.headline && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{enriched.headline}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {provider && (
                  <span className="px-1.5 py-0.5 text-[9px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded">
                    via {provider === 'perplexity' ? 'Web Search' : 'AI'}
                  </span>
                )}
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
            </div>

            {/* Bio */}
            {enriched.bio && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{enriched.bio}</p>
            )}

            {/* Core data */}
            <div className="space-y-2">
              {enriched.title && (
                <DataRow icon={<Briefcase className="h-3 w-3" />} label="Title" value={enriched.title} isNew />
              )}
              {enriched.email && !email && (
                <DataRow icon={<Mail className="h-3 w-3" />} label="Email" value={enriched.email} isNew />
              )}
              {enriched.phone && (
                <DataRow icon={<Phone className="h-3 w-3" />} label="Phone" value={enriched.phone} isNew />
              )}
              {enriched.linkedin_url && (
                <DataRow icon={<Linkedin className="h-3 w-3" />} label="LinkedIn" value={enriched.linkedin_url.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '')} href={enriched.linkedin_url} isNew />
              )}
              {enriched.twitter_url && (
                <DataRow icon={<Twitter className="h-3 w-3" />} label="X/Twitter" value={enriched.twitter_url.replace(/https?:\/\/(www\.)?(twitter|x)\.com\//, '@')} href={enriched.twitter_url} isNew />
              )}
              {enriched.github_url && (
                <DataRow icon={<Github className="h-3 w-3" />} label="GitHub" value={enriched.github_url.replace(/https?:\/\/(www\.)?github\.com\//, '')} href={enriched.github_url} isNew />
              )}
              {enriched.personal_website && (
                <DataRow icon={<Globe className="h-3 w-3" />} label="Website" value={enriched.personal_website.replace(/https?:\/\//, '')} href={enriched.personal_website} isNew />
              )}
              {(enriched.city || enriched.state || enriched.country) && (
                <DataRow icon={<MapPin className="h-3 w-3" />} label="Location" value={[enriched.city, enriched.state, enriched.country].filter(Boolean).join(', ')} isNew />
              )}
              {enriched.seniority && (
                <DataRow icon={<Briefcase className="h-3 w-3" />} label="Seniority" value={enriched.seniority.replace('_', ' ')} />
              )}
            </div>

            {/* Email Intelligence */}
            {(enriched.secondary_emails.length > 0 || enriched.email_patterns.length > 0) && (
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setShowEmails(!showEmails)}
                  className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  {showEmails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  <AtSign className="h-3 w-3" />
                  Email Intelligence
                </button>
                {showEmails && (
                  <div className="mt-2 space-y-2">
                    {enriched.secondary_emails.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Other emails</p>
                        {enriched.secondary_emails.map((e, i) => (
                          <p key={i} className="text-[11px] text-zinc-700 dark:text-zinc-300">{e}</p>
                        ))}
                      </div>
                    )}
                    {enriched.email_patterns.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Email patterns at company</p>
                        {enriched.email_patterns.map((p, i) => (
                          <p key={i} className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">{p}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Skills & Interests */}
            {(enriched.skills.length > 0 || enriched.interests.length > 0) && (
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                {enriched.skills.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 flex items-center gap-1"><Lightbulb className="h-2.5 w-2.5" /> Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {enriched.skills.slice(0, 8).map((s, i) => (
                        <span key={i} className="px-1.5 py-0.5 text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-md">{s}</span>
                      ))}
                      {enriched.skills.length > 8 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-zinc-400">+{enriched.skills.length - 8}</span>
                      )}
                    </div>
                  </div>
                )}
                {enriched.interests.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Interests</p>
                    <div className="flex flex-wrap gap-1">
                      {enriched.interests.slice(0, 6).map((s, i) => (
                        <span key={i} className="px-1.5 py-0.5 text-[10px] bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-md">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Company info */}
            {enriched.company.name && (
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  {enriched.company.logo_url ? (
                    <img src={enriched.company.logo_url} alt="" className="h-5 w-5 rounded" />
                  ) : (
                    <Building2 className="h-4 w-4 text-zinc-400" />
                  )}
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{enriched.company.name}</span>
                </div>
                {enriched.company.description && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2 line-clamp-2">{enriched.company.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {enriched.company.industry && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md">{enriched.company.industry}</span>
                  )}
                  {enriched.company.employee_count && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md">{enriched.company.employee_count.toLocaleString()} employees</span>
                  )}
                  {enriched.company.founded_year && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md">Founded {enriched.company.founded_year}</span>
                  )}
                  {enriched.company.annual_revenue && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-md">{enriched.company.annual_revenue}</span>
                  )}
                  {enriched.company.domain && (
                    <a href={enriched.company.domain.startsWith('http') ? enriched.company.domain : `https://${enriched.company.domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-zinc-200">
                      <Globe className="h-2.5 w-2.5" /> {enriched.company.domain}
                    </a>
                  )}
                </div>
                {enriched.company.tech_stack.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Tech Stack</p>
                    <div className="flex flex-wrap gap-1">
                      {enriched.company.tech_stack.slice(0, 6).map((t, i) => (
                        <span key={i} className="px-1.5 py-0.5 text-[10px] bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 rounded-md">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Education */}
            {enriched.education.length > 0 && (
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setShowEducation(!showEducation)}
                  className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  {showEducation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  <GraduationCap className="h-3 w-3" />
                  Education ({enriched.education.length})
                </button>
                {showEducation && (
                  <div className="mt-2 space-y-1.5">
                    {enriched.education.map((edu, i) => (
                      <div key={i} className="text-[11px]">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{edu.school}</span>
                        {(edu.degree || edu.field) && (
                          <span className="text-zinc-400 dark:text-zinc-500"> — {[edu.degree, edu.field].filter(Boolean).join(', ')}</span>
                        )}
                        {edu.year && <span className="text-zinc-400 dark:text-zinc-500"> ({edu.year})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Employment history */}
            {enriched.employment_history.length > 0 && (
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  Employment History ({enriched.employment_history.length})
                </button>
                {showHistory && (
                  <div className="mt-2 space-y-1.5">
                    {enriched.employment_history.map((job, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        <div className={`h-1.5 w-1.5 rounded-full mt-1 shrink-0 ${job.current ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                        <div>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{job.title}</span>
                          <span className="text-zinc-400 dark:text-zinc-500"> at {job.company}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Apply button */}
            <button
              onClick={handleApply}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Apply All to Contact
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function DataRow({ icon, label, value, href, isNew }: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
  isNew?: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-zinc-400 dark:text-zinc-500">{icon}</span>
      <span className="text-zinc-500 dark:text-zinc-400 w-16 shrink-0">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline truncate">
          {value}
        </a>
      ) : (
        <span className="text-zinc-700 dark:text-zinc-300 truncate">{value}</span>
      )}
      {isNew && (
        <span className="px-1 py-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 rounded shrink-0">NEW</span>
      )}
    </div>
  )
}
