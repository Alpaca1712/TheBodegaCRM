'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building, Globe, Users, Link, Phone, MapPin, FileText, Save, X } from 'lucide-react';
import type { Company } from '@/lib/api/companies';

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  domain: z.string().optional().or(z.literal('')),
  industry: z.string().optional().or(z.literal('')),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')).or(z.string().max(0)),
  phone: z.string().optional().or(z.literal('')),
  address_line1: z.string().optional().or(z.literal('')),
  address_city: z.string().optional().or(z.literal('')),
  address_state: z.string().optional().or(z.literal('')),
  address_country: z.string().optional().or(z.literal('')),
  logo_url: z.string().url('Invalid URL').optional().or(z.literal('')).or(z.string().max(0)),
});

export type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyFormProps {
  initialData?: Company;
  onSubmit: (data: CompanyFormData) => Promise<void>;
  isSubmitting: boolean;
}

export default function CompanyForm({ initialData, onSubmit, isSubmitting }: CompanyFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      domain: '',
      industry: '',
      size: '',
      website: '',
      phone: '',
      address_line1: '',
      address_city: '',
      address_state: '',
      address_country: '',
      logo_url: '',
    },
  });

  // Set initial data if editing
  useState(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        domain: initialData.domain || '',
        industry: initialData.industry || '',
        size: initialData.size || '',
        website: initialData.website || '',
        phone: initialData.phone || '',
        address_line1: initialData.address_line1 || '',
        address_city: initialData.address_city || '',
        address_state: initialData.address_state || '',
        address_country: initialData.address_country || '',
        logo_url: initialData.logo_url || '',
      });
    }
  });

  const handleFormSubmit = async (data: CompanyFormData) => {
    await onSubmit({
      ...data,
      domain: data.domain || undefined,
      industry: data.industry || undefined,
      size: (data.size === '' ? undefined : data.size) as '1-10' | '11-50' | '51-200' | '201-500' | '500+' | undefined,
      website: data.website || undefined,
      phone: data.phone || undefined,
      address_line1: data.address_line1 || undefined,
      address_city: data.address_city || undefined,
      address_state: data.address_state || undefined,
      address_country: data.address_country || undefined,
      logo_url: data.logo_url || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Company Details</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <div className="flex items-center gap-1">
                <Building size={16} />
                Company Name *
              </div>
            </label>
            <input
              type="text"
              {...register('name')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.name ? 'border-red-500' : 'border-slate-300'}`}
              placeholder="Acme Inc."
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <div className="flex items-center gap-1">
                  <Globe size={16} />
                  Domain
                </div>
              </label>
              <input
                type="text"
                {...register('domain')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Industry
              </label>
              <input
                type="text"
                {...register('industry')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Technology, Healthcare, Finance, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <div className="flex items-center gap-1">
                  <Users size={16} />
                  Company Size
                </div>
              </label>
              <select
                {...register('size')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="500+">500+ employees</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <div className="flex items-center gap-1">
                  <Link size={16} />
                  Website
                </div>
              </label>
              <input
                type="url"
                {...register('website')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.website ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="https://example.com"
              />
              {errors.website && (
                <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
              )}
            </div>
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="(123) 456-7890"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Address</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                Street Address
              </div>
            </label>
            <input
              type="text"
              {...register('address_line1')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input
                type="text"
                {...register('address_city')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="San Francisco"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
              <input
                type="text"
                {...register('address_state')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="CA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
              <input
                type="text"
                {...register('address_country')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="United States"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Media & Notes</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Logo URL
            </label>
            <input
              type="url"
              {...register('logo_url')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.logo_url ? 'border-red-500' : 'border-slate-300'}`}
              placeholder="https://example.com/logo.png"
            />
            {errors.logo_url && (
              <p className="mt-1 text-sm text-red-600">{errors.logo_url.message}</p>
            )}
            <p className="mt-1 text-sm text-slate-500">
              Enter a direct URL to the company logo image
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <div className="flex items-center gap-1">
                <FileText size={16} />
                Additional Notes
              </div>
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Add any additional notes about this company..."
            />
          </div>
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
          {isSubmitting ? 'Saving...' : initialData ? 'Update Company' : 'Create Company'}
        </button>
      </div>
    </form>
  );
}
