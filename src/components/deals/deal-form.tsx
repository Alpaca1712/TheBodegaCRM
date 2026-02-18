'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calendar, Building, User, DollarSign, Percent, FileText } from 'lucide-react';
import { getContacts } from '@/lib/api/contacts';
import { getCompanies } from '@/lib/api/companies';
import type { Contact } from '@/lib/api/contacts';
import type { Company } from '@/lib/api/companies';
import type { Deal } from '@/lib/api/deals';

const dealSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  value: z.string().optional().or(z.literal('')),
  currency: z.string().default('USD'),
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).default('lead'),
  contact_id: z.string().optional().or(z.literal('')).nullable(),
  company_id: z.string().optional().or(z.literal('')).nullable(),
  expected_close_date: z.string().optional().or(z.literal('')).nullable(),
  probability: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')).nullable(),
});

export type DealFormData = z.infer<typeof dealSchema>;

interface DealFormProps {
  initialData?: Deal;
  onSubmit: (data: DealFormData) => Promise<void>;
  isSubmitting: boolean;
}

export default function DealForm({ initialData, onSubmit, isSubmitting }: DealFormProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
  } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: '',
      value: '',
      currency: 'USD',
      stage: 'lead',
      contact_id: '',
      company_id: '',
      expected_close_date: '',
      probability: '',
      notes: '',
      ...initialData && {
        title: initialData.title,
        value: initialData.value?.toString() || '',
        currency: initialData.currency,
        stage: initialData.stage,
        contact_id: initialData.contact_id || '',
        company_id: initialData.company_id || '',
        expected_close_date: initialData.expected_close_date || '',
        probability: initialData.probability?.toString() || '',
        notes: initialData.notes || '',
      },
    },
  });

  useEffect(() => {
    async function fetchDropdowns() {
      try {
        const [contactsRes, companiesRes] = await Promise.all([
          getContacts({}, { limit: 100 }),
          getCompanies({}, { limit: 100 }),
        ]);
        
        if (contactsRes.data) setContacts(contactsRes.data);
        if (companiesRes.data) setCompanies(companiesRes.data);
      } catch (error) {
        console.error('Failed to fetch dropdown data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDropdowns();
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-900">Basic Information</h3>
        
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
            Deal Title *
          </label>
          <input
            id="title"
            type="text"
            {...register('title')}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., Enterprise Software License"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="value" className="block text-sm font-medium text-slate-700 mb-1">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Value
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 py-2 border border-r-0 border-slate-300 rounded-l-lg bg-slate-50 text-slate-500 text-sm">
                USD
              </span>
              <input
                id="value"
                type="number"
                step="0.01"
                {...register('value')}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
              />
            </div>
            {errors.value && (
              <p className="mt-1 text-sm text-red-600">{errors.value.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="probability" className="block text-sm font-medium text-slate-700 mb-1">
              <Percent className="inline h-4 w-4 mr-1" />
              Probability (%)
            </label>
            <input
              id="probability"
              type="number"
              min="0"
              max="100"
              {...register('probability')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0-100"
            />
            {errors.probability && (
              <p className="mt-1 text-sm text-red-600">{errors.probability.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stage */}
      <div>
        <h3 className="text-lg font-medium text-slate-900 mb-3">Stage</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'].map((stage) => {
            const label = stage.charAt(0).toUpperCase() + stage.slice(1).replace('_', ' ');
            return (
              <label
                key={stage}
                className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${watch('stage') === stage ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-300 hover:bg-slate-50'}`}
              >
                <input
                  type="radio"
                  value={stage}
                  {...register('stage')}
                  className="sr-only"
                />
                <span className="font-medium">{label}</span>
              </label>
            );
          })}
        </div>
        {errors.stage && (
          <p className="mt-1 text-sm text-red-600">{errors.stage.message}</p>
        )}
      </div>

      {/* Relationships */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-900">Relationships</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="company_id" className="block text-sm font-medium text-slate-700 mb-1">
              <Building className="inline h-4 w-4 mr-1" />
              Company
            </label>
            <select
              id="company_id"
              {...register('company_id')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {errors.company_id && (
              <p className="mt-1 text-sm text-red-600">{errors.company_id.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="contact_id" className="block text-sm font-medium text-slate-700 mb-1">
              <User className="inline h-4 w-4 mr-1" />
              Contact
            </label>
            <select
              id="contact_id"
              {...register('contact_id')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            >
              <option value="">Select a contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </option>
              ))}
            </select>
            {errors.contact_id && (
              <p className="mt-1 text-sm text-red-600">{errors.contact_id.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h3 className="text-lg font-medium text-slate-900 mb-3">Timeline</h3>
        <div>
          <label htmlFor="expected_close_date" className="block text-sm font-medium text-slate-700 mb-1">
            <Calendar className="inline h-4 w-4 mr-1" />
            Expected Close Date
          </label>
          <input
            id="expected_close_date"
            type="date"
            {...register('expected_close_date')}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.expected_close_date && (
            <p className="mt-1 text-sm text-red-600">{errors.expected_close_date.message}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <h3 className="text-lg font-medium text-slate-900 mb-3">Notes</h3>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
            <FileText className="inline h-4 w-4 mr-1" />
            Additional Notes
          </label>
          <textarea
            id="notes"
            rows={4}
            {...register('notes')}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Add any additional details, context, or next steps..."
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Creating...' : 'Create Deal'}
        </button>
      </div>
    </form>
  );
}
