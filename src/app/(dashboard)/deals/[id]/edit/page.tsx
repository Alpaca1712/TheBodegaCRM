'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getDealById, updateDeal } from '@/lib/api/deals';
import DealForm, { type DealFormData } from '@/components/deals/deal-form';
import { toast } from 'sonner';
import type { Deal } from '@/lib/api/deals';

export default function EditDealPage() {
  const params = useParams();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dealId = params.id as string;

  useEffect(() => {
    async function fetchDeal() {
      setLoading(true);
      const result = await getDealById(dealId);
      if (result.error) setError(result.error);
      else setDeal(result.data);
      setLoading(false);
    }
    fetchDeal();
  }, [dealId]);

  const handleSubmit = async (data: DealFormData) => {
    setIsSubmitting(true);
    try {
      const result = await updateDeal(dealId, {
        title: data.title,
        value: data.value ? parseFloat(data.value) : null,
        currency: data.currency,
        stage: data.stage,
        contact_id: data.contact_id || null,
        company_id: data.company_id || null,
        expected_close_date: data.expected_close_date || null,
        probability: data.probability ? parseInt(data.probability) : null,
        notes: data.notes || null,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Deal updated');
        router.push(`/deals/${dealId}`);
      }
    } catch {
      toast.error('Failed to update deal');
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

  if (error || !deal) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/deals" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 mb-4">
          <ArrowLeft size={14} /> Deals
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Deal not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/deals/${dealId}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 mb-4">
        <ArrowLeft size={14} /> Back to deal
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Edit {deal.title}</h1>
      <DealForm
        initialData={deal}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
