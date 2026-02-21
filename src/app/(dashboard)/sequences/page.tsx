'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Zap, Play, Pause, MoreHorizontal,
  Users, MessageSquare, ArrowUpRight,
} from 'lucide-react'
import { useSequences, useUpdateSequence, useDeleteSequence } from '@/hooks/use-sequences'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { Sequence } from '@/lib/api/sequences'

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  active: { label: 'Active', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  paused: { label: 'Paused', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  archived: { label: 'Archived', color: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500' },
}

export default function SequencesPage() {
  const router = useRouter()
  const { data, isLoading } = useSequences()
  const updateMutation = useUpdateSequence()
  const deleteMutation = useDeleteSequence()
  const [filter, setFilter] = useState<string>('all')

  const sequences = data?.data || []
  const filtered = filter === 'all' ? sequences : sequences.filter(s => s.status === filter)

  const handleStatusChange = async (seq: Sequence, newStatus: Sequence['status']) => {
    const result = await updateMutation.mutateAsync({ id: seq.id, status: newStatus })
    if (result.error) toast.error(result.error)
    else toast.success(`Sequence ${newStatus === 'active' ? 'activated' : newStatus}`)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this sequence? All enrollments will be removed.')) return
    const result = await deleteMutation.mutateAsync(id)
    if (result.error) toast.error(result.error)
    else toast.success('Sequence deleted')
  }

  const totalActive = sequences.filter(s => s.status === 'active').length
  const totalEnrolled = sequences.reduce((s, seq) => s + (seq._enrollment_count || 0), 0)
  const totalReplies = sequences.reduce((s, seq) => s + (seq._reply_count || 0), 0)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Sequences</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Automated multi-channel outreach with AI personalization
          </p>
        </div>
        <Link
          href="/sequences/new"
          className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-600/20"
        >
          <Plus size={15} /> New Sequence
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active</p>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1 tabular-nums">{totalActive}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Enrolled</p>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1 tabular-nums">{totalEnrolled}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Replies</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{totalReplies}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {['all', 'active', 'draft', 'paused', 'archived'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
              filter === f
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Sequences list */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {isLoading ? (
          <div className="p-6 animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-9 w-9 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
                  <div className="h-3 w-32 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mx-auto mb-3">
              <Zap className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-1">
              {filter !== 'all' ? `No ${filter} sequences` : 'No sequences yet'}
            </p>
            <Link href="/sequences/new" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
              Create your first sequence
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((seq) => (
              <div
                key={seq.id}
                onClick={() => router.push(`/sequences/${seq.id}`)}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{seq.name}</p>
                    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md ${statusConfig[seq.status]?.color}`}>
                      {statusConfig[seq.status]?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                    <span className="flex items-center gap-1"><Users size={10} />{seq._enrollment_count || 0} enrolled</span>
                    <span className="flex items-center gap-1"><MessageSquare size={10} />{seq._reply_count || 0} replies</span>
                    {seq.description && <span className="truncate max-w-[180px]">{seq.description}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  {seq.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(seq, 'active')}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      title="Activate"
                    >
                      <Play size={13} />
                    </button>
                  )}
                  {seq.status === 'active' && (
                    <button
                      onClick={() => handleStatusChange(seq, 'paused')}
                      className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                      title="Pause"
                    >
                      <Pause size={13} />
                    </button>
                  )}
                  {seq.status === 'paused' && (
                    <button
                      onClick={() => handleStatusChange(seq, 'active')}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      title="Resume"
                    >
                      <Play size={13} />
                    </button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors">
                        <MoreHorizontal size={13} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/sequences/${seq.id}`)}>View Details</DropdownMenuItem>
                      {seq.status !== 'archived' && (
                        <DropdownMenuItem onClick={() => handleStatusChange(seq, 'archived')}>Archive</DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-rose-600" onClick={() => handleDelete(seq.id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ArrowUpRight className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
