'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getCompanyById, updateCompany } from '@/lib/api/companies';
import CompanyForm, { type CompanyFormData } from '@/components/companies/company-form';
import { toast } from 'sonner';
import type { Company } from '@/lib/api/companies';

export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyId = params.id as string;

  useEffect(() => {
    async function fetchCompany() {
      setLoading(true);
      const result = await getCompanyById(companyId);
      if (result.error) setError(result.error);
      else setCompany(result.data);
      setLoading(false);
    }
    fetchCompany();
  }, [companyId]);

  const handleSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    try {
      const result = await updateCompany(companyId, {
        name: data.name,
        domain: data.domain || undefined,
        industry: data.industry || undefined,
        size: (data.size === '' ? undefined : data.size) as Company['size'] | undefined,
        website: data.website || undefined,
        phone: data.phone || undefined,
        address_line1: data.address_line1 || undefined,
        address_city: data.address_city || undefined,
        address_state: data.address_state || undefined,
        address_country: data.address_country || undefined,
        logo_url: data.logo_url || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Company updated');
        router.push(`/companies/${companyId}`);
      }
    } catch {
      toast.error('Failed to update company');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-zinc-200 rounded" />
          <div className="h-8 w-48 bg-zinc-200 rounded" />
          <div className="h-64 bg-zinc-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/companies" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 mb-4">
          <ArrowLeft size={14} /> Companies
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Company not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/companies/${companyId}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 mb-4">
        <ArrowLeft size={14} /> Back to company
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Edit {company.name}</h1>
      <CompanyForm
        initialData={company}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
