'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, Search, Users, DollarSign, TrendingUp, Building } from 'lucide-react'
import { getInvestors, getInvestorStats, type Investor, type InvestorType, type RelationshipStatus } from '@/lib/api/investors'

const TYPE_LABELS: Record<InvestorType, string> = {
  vc: 'VC',
  angel: 'Angel',
  family_office: 'Family Office',
  corporate: 'Corporate',
  accelerator: 'Accelerator',
  other: 'Other',
}

const STATUS_COLORS: Record<RelationshipStatus, string> = {
  cold: 'bg-blue-100 text-blue-700',
  warm: 'bg-yellow-100 text-yellow-700',
  hot: 'bg-orange-100 text-orange-700',
  portfolio: 'bg-green-100 text-green-700',
  passed: 'bg-slate-100 text-slate-500',
}

export default function InvestorsPage() {
  const [investors, setInvestors] = useState<Investor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<InvestorType | ''>('')
  const [statusFilter, setStatusFilter] = useState<RelationshipStatus | ''>('')
  const [stats, setStats] = useState<{ totalRaised: number; totalPipeline: number; totalInvestments: number } | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!cancelled) setLoading(true)
      const filters: { search?: string; type?: InvestorType; relationship_status?: RelationshipStatus } = {}
      if (search) filters.search = search
      if (typeFilter) filters.type = typeFilter
      if (statusFilter) filters.relationship_status = statusFilter

      const { data } = await getInvestors(filters, { limit: 50 })
      if (!cancelled) {
        setInvestors(data)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [search, typeFilter, statusFilter])

  useEffect(() => {
    let cancelled = false
    getInvestorStats().then(({ data }) => {
      if (data && !cancelled) setStats(data)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Investors</h1>
          <p className="text-slate-500 mt-1">Track your fundraising pipeline</p>
        </div>
        <Link
          href="/investors/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Investor
        </Link>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-slate-500">Total Raised</p>
              <p className="text-xl font-bold text-slate-900">${stats.totalRaised.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="p-2 bg-indigo-100 rounded-lg"><TrendingUp className="h-5 w-5 text-indigo-600" /></div>
            <div>
              <p className="text-sm text-slate-500">Pipeline Value</p>
              <p className="text-xl font-bold text-slate-900">${stats.totalPipeline.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="p-2 bg-slate-100 rounded-lg"><Users className="h-5 w-5 text-slate-600" /></div>
            <div>
              <p className="text-sm text-slate-500">Total Investors</p>
              <p className="text-xl font-bold text-slate-900">{investors.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search investors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as InvestorType | '')}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">All Types</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RelationshipStatus | '')}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
              <option value="hot">Hot</option>
              <option value="portfolio">Portfolio</option>
              <option value="passed">Passed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Investor list */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading investors...</div>
        ) : investors.length === 0 ? (
          <div className="p-12 text-center">
            <Building className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No investors yet</h3>
            <p className="mt-2 text-sm text-slate-500">Start building your fundraising pipeline.</p>
            <Link
              href="/investors/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add your first investor
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Firm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Check Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {investors.map((investor) => (
                <tr key={investor.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/investors/${investor.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {investor.name}
                    </Link>
                    {investor.email && <p className="text-sm text-slate-500">{investor.email}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{investor.firm || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{TYPE_LABELS[investor.type]}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {investor.check_size_min || investor.check_size_max
                      ? `$${(investor.check_size_min || 0).toLocaleString()} – $${(investor.check_size_max || 0).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[investor.relationship_status]}`}>
                      {investor.relationship_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
