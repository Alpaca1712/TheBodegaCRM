'use client'

import { useState } from 'react'
import { createInvestment, type Investment, type InvestmentStage, type InvestmentInstrument } from '@/lib/api/investors'
import { showCreateSuccess, showCreateError } from '@/lib/toast'

type InvestmentFormProps = {
  investorId: string
  onSuccess?: (investment: Investment) => void
  onCancel?: () => void
}

export default function InvestmentForm({ investorId, onSuccess, onCancel }: InvestmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const investmentData = {
      investor_id: investorId,
      round_name: formData.get('round_name') as string,
      amount: formData.get('amount') ? Number(formData.get('amount')) : null,
      valuation_pre: formData.get('valuation_pre') ? Number(formData.get('valuation_pre')) : null,
      valuation_post: formData.get('valuation_post') ? Number(formData.get('valuation_post')) : null,
      equity_percentage: formData.get('equity_percentage') ? Number(formData.get('equity_percentage')) : null,
      instrument: (formData.get('instrument') as InvestmentInstrument) || 'equity',
      stage: (formData.get('stage') as InvestmentStage) || 'intro',
      pitch_date: formData.get('pitch_date') as string || null,
      close_date: formData.get('close_date') as string || null,
      notes: formData.get('notes') as string || null,
    }

    try {
      const result = await createInvestment(investmentData)
      if (result.error) {
        setError(result.error)
        showCreateError('Investment')
      } else {
        showCreateSuccess('Investment')
        if (onSuccess && result.data) onSuccess(result.data)
        // Reset form
        ;(e.target as HTMLFormElement).reset()
      }
    } catch {
      setError('An unexpected error occurred')
      showCreateError('Investment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold text-zinc-900 mb-4">Add Investment Round</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="round_name" className="block text-sm font-medium text-zinc-700 mb-1">Round Name *</label>
          <input 
            id="round_name" 
            name="round_name" 
            required 
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
            placeholder="e.g., Seed, Series A, Pre-seed" 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-zinc-700 mb-1">Amount ($)</label>
            <input 
              id="amount" 
              name="amount" 
              type="number" 
              step="1000" 
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              placeholder="0.00" 
            />
          </div>
          <div>
            <label htmlFor="stage" className="block text-sm font-medium text-zinc-700 mb-1">Stage</label>
            <select 
              id="stage" 
              name="stage" 
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="intro">Intro</option>
              <option value="pitch">Pitch</option>
              <option value="due_diligence">Due Diligence</option>
              <option value="term_sheet">Term Sheet</option>
              <option value="negotiation">Negotiation</option>
              <option value="closed">Closed</option>
              <option value="passed">Passed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="instrument" className="block text-sm font-medium text-zinc-700 mb-1">Instrument</label>
            <select 
              id="instrument" 
              name="instrument" 
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="equity">Equity</option>
              <option value="safe">SAFE</option>
              <option value="convertible_note">Convertible Note</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="equity_percentage" className="block text-sm font-medium text-zinc-700 mb-1">Equity %</label>
            <input 
              id="equity_percentage" 
              name="equity_percentage" 
              type="number" 
              step="0.01" 
              min="0" 
              max="100" 
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              placeholder="0.00" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="valuation_pre" className="block text-sm font-medium text-zinc-700 mb-1">Pre-money Valuation ($)</label>
            <input 
              id="valuation_pre" 
              name="valuation_pre" 
              type="number" 
              step="1000" 
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              placeholder="0.00" 
            />
          </div>
          <div>
            <label htmlFor="valuation_post" className="block text-sm font-medium text-zinc-700 mb-1">Post-money Valuation ($)</label>
            <input 
              id="valuation_post" 
              name="valuation_post" 
              type="number" 
              step="1000" 
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              placeholder="0.00" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pitch_date" className="block text-sm font-medium text-zinc-700 mb-1">Pitch Date</label>
            <input 
              id="pitch_date" 
              name="pitch_date" 
              type="date" 
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
            />
          </div>
          <div>
            <label htmlFor="close_date" className="block text-sm font-medium text-zinc-700 mb-1">Close Date</label>
            <input 
              id="close_date" 
              name="close_date" 
              type="date" 
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-zinc-700 mb-1">Notes</label>
          <textarea 
            id="notes" 
            name="notes" 
            rows={2} 
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
            placeholder="Additional details about this investment..." 
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              className="px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add Investment'}
          </button>
        </div>
      </form>
    </div>
  )
}
