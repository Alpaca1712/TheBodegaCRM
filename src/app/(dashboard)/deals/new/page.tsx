'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createDeal } from '@/lib/api/deals';
import DealForm from '@/components/deals/deal-form';
import type { DealFormData } from '@/components/deals/deal-form';

export default function NewDealPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: DealFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Convert string values to numbers where needed
      const value = data.value ? parseFloat(data.value) : null;
      const probability = data.probability ? parseInt(data.probability) : null;

      const result = await createDeal({
        title: data.title,
        value: isNaN(value!) ? null : value,
        currency: data.currency,
        stage: data.stage,
        contact_id: data.contact_id || null,
        company_id: data.company_id || null,
        expected_close_date: data.expected_close_date || null,
        probability: isNaN(probability!) ? null : Math.min(Math.max(probability!, 0), 100),
        notes: data.notes || null,
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.push('/deals');
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
          href="/deals"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Deals Pipeline
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Create New Deal</h1>
        <p className="text-slate-600 mt-1">
          Add a new sales deal to your pipeline
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <DealForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
