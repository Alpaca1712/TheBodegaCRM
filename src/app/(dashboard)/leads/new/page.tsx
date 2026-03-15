'use client';

import { useSearchParams } from 'next/navigation';
import LeadForm from '@/components/leads/lead-form';
import type { LeadType } from '@/types/leads';

export default function NewLeadPage() {
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') as LeadType) || 'customer';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">New Lead</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Add a new {type === 'customer' ? 'customer' : 'investor'} lead with research
        </p>
      </div>

      <LeadForm mode="create" defaultValues={{ type }} />
    </div>
  );
}
