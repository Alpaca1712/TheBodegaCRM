'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createInvestor, type InvestorType, type RelationshipStatus } from '@/lib/api/investors'

export default function NewInvestorPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      firm: (formData.get('firm') as string) || null,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      website: (formData.get('website') as string) || null,
      linkedin_url: (formData.get('linkedin_url') as string) || null,
      type: (formData.get('type') as InvestorType) || 'vc',
      check_size_min: formData.get('check_size_min') ? Number(formData.get('check_size_min')) : null,
      check_size_max: formData.get('check_size_max') ? Number(formData.get('check_size_max')) : null,
      stage_preference: null,
      thesis: (formData.get('thesis') as string) || null,
      notes: (formData.get('notes') as string) || null,
      relationship_status: (formData.get('relationship_status') as RelationshipStatus) || 'cold',
      last_contacted_at: null,
      contact_id: null,
    }

    const { error: createError } = await createInvestor(data)
    if (createError) {
      setError(createError)
      setIsSubmitting(false)
    } else {
      router.push('/investors')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/investors" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to investors
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900">Add Investor</h1>
      </div>

      <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">Name *</label>
              <input id="name" name="name" required className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="firm" className="block text-sm font-medium text-zinc-700 mb-1">Firm</label>
              <input id="firm" name="firm" className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
              <input id="email" name="email" type="email" className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-1">Phone</label>
              <input id="phone" name="phone" className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-zinc-700 mb-1">Investor Type</label>
              <select id="type" name="type" className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="vc">VC</option>
                <option value="angel">Angel</option>
                <option value="family_office">Family Office</option>
                <option value="corporate">Corporate</option>
                <option value="accelerator">Accelerator</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="relationship_status" className="block text-sm font-medium text-zinc-700 mb-1">Relationship</label>
              <select id="relationship_status" name="relationship_status" className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="cold">Cold</option>
                <option value="warm">Warm</option>
                <option value="hot">Hot</option>
                <option value="portfolio">Portfolio</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="check_size_min" className="block text-sm font-medium text-zinc-700 mb-1">Min Check Size ($)</label>
              <input id="check_size_min" name="check_size_min" type="number" step="1000" className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="check_size_max" className="block text-sm font-medium text-zinc-700 mb-1">Max Check Size ($)</label>
              <input id="check_size_max" name="check_size_max" type="number" step="1000" className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-zinc-700 mb-1">Website</label>
              <input id="website" name="website" type="url" className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="linkedin_url" className="block text-sm font-medium text-zinc-700 mb-1">LinkedIn</label>
              <input id="linkedin_url" name="linkedin_url" type="url" className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>

          <div>
            <label htmlFor="thesis" className="block text-sm font-medium text-zinc-700 mb-1">Investment Thesis</label>
            <textarea id="thesis" name="thesis" rows={2} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="What do they invest in?" />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-zinc-700 mb-1">Notes</label>
            <textarea id="notes" name="notes" rows={3} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
            <Link href="/investors" className="px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50">Cancel</Link>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 disabled:opacity-50">
              {isSubmitting ? 'Creating...' : 'Create Investor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
