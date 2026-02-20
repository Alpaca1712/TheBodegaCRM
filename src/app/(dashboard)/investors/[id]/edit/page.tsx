'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getInvestorById, updateInvestor, type Investor, type InvestorType, type RelationshipStatus } from '@/lib/api/investors'
import { showUpdateSuccess, showUpdateError, showLoadError } from '@/lib/toast'

export default function EditInvestorPage() {
  const params = useParams()
  const router = useRouter()
  const [investor, setInvestor] = useState<Investor | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const investorId = params.id as string

  useEffect(() => {
    async function fetchInvestor() {
      setLoading(true)
      const result = await getInvestorById(investorId)
      if (result.error) {
        setError(result.error)
        showLoadError('Investor')
      } else {
        setInvestor(result.data)
      }
      setLoading(false)
    }
    fetchInvestor()
  }, [investorId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const updates = {
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
    }

    try {
      const result = await updateInvestor(investorId, updates)
      if (result.error) {
        setError(result.error)
        showUpdateError('Investor')
      } else {
        showUpdateSuccess('Investor')
        router.push(`/investors/${investorId}`)
      }
    } catch {
      setError('An unexpected error occurred')
      showUpdateError('Investor')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href={`/investors/${investorId}`}
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Investor
          </Link>
        </div>
        <div className="text-center py-12 text-slate-500">Loading investor data...</div>
      </div>
    )
  }

  if (error || !investor) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/investors"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Investors
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Investor not found'}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/investors/${investorId}`} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Investor
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Edit Investor</h1>
        <p className="text-slate-600 mt-1">
          Update information for {investor.name}
        </p>
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
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input 
                id="name" 
                name="name" 
                required 
                defaultValue={investor.name}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
            <div>
              <label htmlFor="firm" className="block text-sm font-medium text-slate-700 mb-1">Firm</label>
              <input 
                id="firm" 
                name="firm" 
                defaultValue={investor.firm || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input 
                id="email" 
                name="email" 
                type="email" 
                defaultValue={investor.email || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input 
                id="phone" 
                name="phone" 
                defaultValue={investor.phone || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1">Investor Type</label>
              <select 
                id="type" 
                name="type" 
                defaultValue={investor.type}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="vc">VC</option>
                <option value="angel">Angel</option>
                <option value="family_office">Family Office</option>
                <option value="corporate">Corporate</option>
                <option value="accelerator">Accelerator</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="relationship_status" className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
              <select 
                id="relationship_status" 
                name="relationship_status" 
                defaultValue={investor.relationship_status}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="cold">Cold</option>
                <option value="warm">Warm</option>
                <option value="hot">Hot</option>
                <option value="portfolio">Portfolio</option>
                <option value="passed">Passed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="check_size_min" className="block text-sm font-medium text-slate-700 mb-1">Min Check Size ($)</label>
              <input 
                id="check_size_min" 
                name="check_size_min" 
                type="number" 
                step="1000" 
                defaultValue={investor.check_size_min || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
            <div>
              <label htmlFor="check_size_max" className="block text-sm font-medium text-slate-700 mb-1">Max Check Size ($)</label>
              <input 
                id="check_size_max" 
                name="check_size_max" 
                type="number" 
                step="1000" 
                defaultValue={investor.check_size_max || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-slate-700 mb-1">Website</label>
              <input 
                id="website" 
                name="website" 
                type="url" 
                defaultValue={investor.website || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
            <div>
              <label htmlFor="linkedin_url" className="block text-sm font-medium text-slate-700 mb-1">LinkedIn</label>
              <input 
                id="linkedin_url" 
                name="linkedin_url" 
                type="url" 
                defaultValue={investor.linkedin_url || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
          </div>

          <div>
            <label htmlFor="thesis" className="block text-sm font-medium text-slate-700 mb-1">Investment Thesis</label>
            <textarea 
              id="thesis" 
              name="thesis" 
              rows={2} 
              defaultValue={investor.thesis || ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              placeholder="What do they invest in?" 
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea 
              id="notes" 
              name="notes" 
              rows={3} 
              defaultValue={investor.notes || ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Link href={`/investors/${investorId}`} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">
              Cancel
            </Link>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
