'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createCompany } from '@/lib/api/companies';
import CompanyForm from '@/components/companies/company-form';
import type { CompanyFormData } from '@/components/companies/company-form';

export default function NewCompanyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createCompany({
        name: data.name,
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

      if (result.error) {
        setError(result.error);
      } else {
        router.push('/companies');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/companies"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Companies
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Create New Company</h1>
        <p className="text-slate-600 mt-1">
          Add a new company to your CRM database
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <CompanyForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
