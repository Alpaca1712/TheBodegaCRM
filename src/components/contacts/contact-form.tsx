'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Mail, Phone, Building, Briefcase, Tag, FileText, Save, X } from 'lucide-react';
import { getCompanies } from '@/lib/api/companies';
import type { Contact } from '@/lib/api/contacts';
import type { Company } from '@/lib/api/companies';

const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  company_id: z.string().optional().or(z.literal('')),
  title: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'lead']).default('active'),
  source: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  initialData?: Contact;
  onSubmit: (data: ContactFormData) => Promise<void>;
  isSubmitting: boolean;
}

export default function ContactForm({ initialData, onSubmit, isSubmitting }: ContactFormProps) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company_id: '',
      title: '',
      status: 'active',
      source: '',
      notes: '',
    },
  });

  useEffect(() => {
    async function loadCompanies() {
      const { data } = await getCompanies({}, { limit: 100 });
      setCompanies(data);
    }
    loadCompanies();
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({
        first_name: initialData.first_name,
        last_name: initialData.last_name,
        email: initialData.email || '',
        phone: initialData.phone || '',
        company_id: initialData.company_id || '',
        title: initialData.title || '',
        status: initialData.status,
        source: initialData.source || '',
        notes: initialData.notes || '',
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: ContactFormData) => {
    await onSubmit({
      ...data,
      email: data.email || undefined,
      phone: data.phone || undefined,
      company_id: data.company_id || undefined,
      title: data.title || undefined,
      source: data.source || undefined,
      notes: data.notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <div className="flex items-center gap-1">
                <User size={16} />
                First Name *
              </div>
            </label>
            <input
              type="text"
              {...register('first_name')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.first_name ? 'border-red-500' : 'border-slate-300'}`}
              placeholder="John"
            />
            {errors.first_name && (
              <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              {...register('last_name')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.last_name ? 'border-red-500' : 'border-slate-300'}`}
              placeholder="Doe"
            />
            {errors.last_name && (
              <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <div className="flex items-center gap-1">
                <Mail size={16} />
                Email
              </div>
            </label>
            <input
              type="email"
              {...register('email')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.email ? 'border-red-500' : 'border-slate-300'}`}
              placeholder="john.doe@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <div className="flex items-center gap-1">
                <Phone size={16} />
                Phone
              </div>
            </label>
            <input
              type="tel"
              {...register('phone')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.phone ? 'border-red-500' : 'border-slate-300'}`}
              placeholder="(123) 456-7890"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <div className="flex items-center gap-1">
                <Briefcase size={16} />
                Title
              </div>
            </label>
            <input
              type="text"
              {...register('title')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="CEO, Manager, etc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <div className="flex items-center gap-1">
                <Building size={16} />
                Company
              </div>
            </label>
            <select
              {...register('company_id')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">No company selected</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Additional Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <div className="flex items-center gap-1">
                <Tag size={16} />
                Status
              </div>
            </label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="lead">Lead</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
            <input
              type="text"
              {...register('source')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Referral, Website, Conference, etc."
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            <div className="flex items-center gap-1">
              <FileText size={16} />
              Notes
            </div>
          </label>
          <textarea
            {...register('notes')}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Add any additional notes about this contact..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <X size={18} />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save size={18} />
          {isSubmitting ? 'Saving...' : initialData ? 'Update Contact' : 'Create Contact'}
        </button>
      </div>
    </form>
  );
}
