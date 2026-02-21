'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Globe, Linkedin, Building, Trash2, DollarSign, Edit } from 'lucide-react'
import { getInvestorById, deleteInvestor, type Investor } from '@/lib/api/investors'
import { getInvestments, type Investment } from '@/lib/api/investors'

const STAGE_COLORS: Record<string, string> = {
  intro: 'bg-blue-100 text-blue-700',
  pitch: 'bg-indigo-100 text-indigo-700',
  due_diligence: 'bg-purple-100 text-purple-700',
  term_sheet: 'bg-yellow-100 text-yellow-700',
  negotiation: 'bg-orange-100 text-orange-700',
  closed: 'bg-green-100 text-green-700',
  passed: 'bg-zinc-100 text-zinc-500',
}

export default function InvestorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [investor, setInvestor] = useState<Investor | null>(null)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const id = params.id as string
      const [investorRes, investmentsRes] = await Promise.all([
        getInvestorById(id),
        getInvestments({ investor_id: id }),
      ])

      if (investorRes.error) {
        setError(investorRes.error)
      } else {
        setInvestor(investorRes.data)
      }
      setInvestments(investmentsRes.data)
      setLoading(false)
    }
    load()
  }, [params.id])

  const handleDelete = async () => {
    if (!investor || !window.confirm('Are you sure you want to delete this investor?')) return
    const { error: deleteError } = await deleteInvestor(investor.id)
    if (deleteError) {
      setError(deleteError)
    } else {
      router.push('/investors')
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-zinc-200 rounded w-48 mb-6" />
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div className="h-6 bg-zinc-200 rounded w-64" />
          <div className="h-4 bg-zinc-200 rounded w-48" />
          <div className="h-4 bg-zinc-200 rounded w-32" />
        </div>
      </div>
    )
  }

  if (error || !investor) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Investor not found'}</p>
        <Link href="/investors" className="mt-4 text-indigo-600 hover:underline">Back to investors</Link>
      </div>
    )
  }

  return (
    <div>
      <Link href="/investors" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to investors
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">{investor.name}</h1>
          {investor.firm && <p className="text-lg text-zinc-500 mt-1">{investor.firm}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/investors/${investor.id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Details</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {investor.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-zinc-400" />
                  <a href={`mailto:${investor.email}`} className="text-indigo-600 hover:underline">{investor.email}</a>
                </div>
              )}
              {investor.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-zinc-400" />
                  <span className="text-zinc-700">{investor.phone}</span>
                </div>
              )}
              {investor.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-zinc-400" />
                  <a href={investor.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{investor.website}</a>
                </div>
              )}
              {investor.linkedin_url && (
                <div className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-zinc-400" />
                  <a href={investor.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">LinkedIn Profile</a>
                </div>
              )}
            </dl>

            {investor.thesis && (
              <div className="mt-6 pt-4 border-t border-zinc-200">
                <h3 className="text-sm font-medium text-zinc-700 mb-2">Investment Thesis</h3>
                <p className="text-zinc-600">{investor.thesis}</p>
              </div>
            )}

            {investor.notes && (
              <div className="mt-4 pt-4 border-t border-zinc-200">
                <h3 className="text-sm font-medium text-zinc-700 mb-2">Notes</h3>
                <p className="text-zinc-600 whitespace-pre-wrap">{investor.notes}</p>
              </div>
            )}
          </div>

          {/* Investments */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Investments</h2>
            {investments.length === 0 ? (
              <p className="text-zinc-500 text-sm">No investments recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {investments.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                    <div>
                      <p className="font-medium text-zinc-900">{inv.round_name}</p>
                      <p className="text-sm text-zinc-500">{inv.instrument} {inv.pitch_date ? `· Pitched ${new Date(inv.pitch_date).toLocaleDateString()}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {inv.amount && (
                        <span className="text-sm font-medium text-zinc-700">
                          <DollarSign className="inline h-3 w-3" />{inv.amount.toLocaleString()}
                        </span>
                      )}
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[inv.stage] || 'bg-zinc-100 text-zinc-600'}`}>
                        {inv.stage.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Quick Info</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-zinc-500">Type</dt>
                <dd className="text-sm font-medium text-zinc-700 flex items-center gap-1">
                  <Building className="h-3.5 w-3.5" />
                  {investor.type.replace('_', ' ')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-zinc-500">Relationship</dt>
                <dd>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    investor.relationship_status === 'cold' ? 'bg-blue-100 text-blue-700' :
                    investor.relationship_status === 'warm' ? 'bg-yellow-100 text-yellow-700' :
                    investor.relationship_status === 'hot' ? 'bg-orange-100 text-orange-700' :
                    investor.relationship_status === 'portfolio' ? 'bg-green-100 text-green-700' :
                    'bg-zinc-100 text-zinc-500'
                  }`}>
                    {investor.relationship_status}
                  </span>
                </dd>
              </div>
              {(investor.check_size_min || investor.check_size_max) && (
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-500">Check Size</dt>
                  <dd className="text-sm font-medium text-zinc-700">
                    ${(investor.check_size_min || 0).toLocaleString()} – ${(investor.check_size_max || 0).toLocaleString()}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm text-zinc-500">Added</dt>
                <dd className="text-sm text-zinc-700">{new Date(investor.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
