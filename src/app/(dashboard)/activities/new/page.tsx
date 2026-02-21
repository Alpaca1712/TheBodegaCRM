'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createActivity } from '@/lib/api/activities'
import { toast } from 'sonner'

const activityTypes = [
  { value: 'task', label: 'Task' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
] as const

export default function NewActivityPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    type: 'task' as 'task' | 'call' | 'email' | 'meeting' | 'note',
    title: '',
    description: '',
    due_date: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createActivity({
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        due_date: form.due_date || undefined,
        completed: false,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Activity created')
        router.push('/activities')
      }
    } catch {
      toast.error('Failed to create activity')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/activities" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors mb-6">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Activities
      </Link>

      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight mb-6">New Activity</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="type" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Type</label>
          <select
            id="type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
            className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-zinc-100"
          >
            {activityTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="title" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Title</label>
          <input
            id="title"
            type="text"
            required
            placeholder="e.g. Follow up with Jane"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Description</label>
          <textarea
            id="description"
            rows={3}
            placeholder="Optional details..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none"
          />
        </div>

        {(form.type === 'task' || form.type === 'meeting' || form.type === 'call') && (
          <div>
            <label htmlFor="due_date" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Due Date</label>
            <input
              id="due_date"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-zinc-100"
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/activities"
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 shadow-sm shadow-indigo-600/20"
          >
            {isSubmitting ? 'Creating...' : 'Create Activity'}
          </button>
        </div>
      </form>
    </div>
  )
}
