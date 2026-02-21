'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Users, DollarSign, TrendingUp, Building } from 'lucide-react'
import { getInvestors, getInvestorStats, type Investor, type InvestorType, type RelationshipStatus } from '@/lib/api/investors'

const TYPE_LABELS: Record<InvestorType, string> = {
  vc: 'VC', angel: 'Angel', family_office: 'Family Office', corporate: 'Corporate', accelerator: 'Accelerator', other: 'Other',
}

const STATUS_COLORS: Record<RelationshipStatus, string> = {
  cold: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  warm: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  hot: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  portfolio: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  passed: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
}

export default function InvestorsPage() {
  const router = useRouter()
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
      if (!cancelled) { setInvestors(data); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [search, typeFilter, statusFilter])

  useEffect(() => {
    let cancelled = false
    getInvestorStats().then(({ data }) => { if (data && !cancelled) setStats(data) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Investors</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Track your fundraising pipeline</p>
        </div>
        <Link
          href="/investors/new"
          className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-600/20"
        >
          <Plus size={15} /> Add Investor
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard icon={DollarSign} label="Total Raised" value={`$${stats.totalRaised.toLocaleString()}`} color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400" />
          <StatCard icon={TrendingUp} label="Pipeline Value" value={`$${stats.totalPipeline.toLocaleString()}`} color="text-indigo-600 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-400" />
          <StatCard icon={Users} label="Total Investors" value={stats.totalInvestments.toString()} color="text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Search investors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as InvestorType | '')}
            className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RelationshipStatus | '')}
            className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
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

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="p-6 animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
                  <div className="h-3 w-48 bg-zinc-100 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : investors.length === 0 ? (
          <div className="p-8 text-center">
            <Building className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
              {search || typeFilter || statusFilter ? 'No investors match your filters' : 'No investors yet'}
            </p>
            <Link href="/investors/new" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              Add your first investor
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Firm</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Check Size</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {investors.map((investor) => (
                  <tr
                    key={investor.id}
                    onClick={() => router.push(`/investors/${investor.id}`)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{investor.name}</p>
                        {investor.email && <p className="text-xs text-zinc-500 dark:text-zinc-400">{investor.email}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">
                      {investor.firm || <span className="text-zinc-400 dark:text-zinc-600">--</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">{TYPE_LABELS[investor.type]}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">
                      {investor.check_size_min || investor.check_size_max
                        ? `$${(investor.check_size_min || 0).toLocaleString()} – $${(investor.check_size_max || 0).toLocaleString()}`
                        : <span className="text-zinc-400 dark:text-zinc-600">--</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[investor.relationship_status]}`}>
                        {investor.relationship_status.charAt(0).toUpperCase() + investor.relationship_status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-semibold text-zinc-900 dark:text-white leading-tight">{value}</p>
      </div>
    </div>
  )
}
