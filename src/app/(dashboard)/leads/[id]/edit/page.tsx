'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LeadForm from '@/components/leads/lead-form';
import type { Lead, LeadFormValues } from '@/types/leads';

export default function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/leads/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setLead(data.lead);
      } catch {
        router.push('/leads');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!lead) return null;

  const defaultValues: Partial<LeadFormValues> = {
    type: lead.type,
    company_name: lead.company_name,
    product_name: lead.product_name,
    fund_name: lead.fund_name,
    contact_name: lead.contact_name,
    contact_title: lead.contact_title,
    contact_email: lead.contact_email,
    contact_twitter: lead.contact_twitter,
    contact_linkedin: lead.contact_linkedin,
    company_description: lead.company_description,
    attack_surface_notes: lead.attack_surface_notes,
    investment_thesis_notes: lead.investment_thesis_notes,
    personal_details: lead.personal_details,
    smykm_hooks: lead.smykm_hooks || [],
    stage: lead.stage,
    source: lead.source,
    priority: lead.priority,
    notes: lead.notes,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Edit Lead</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {lead.contact_name} at {lead.company_name}
        </p>
      </div>

      <LeadForm mode="edit" leadId={id} defaultValues={defaultValues} />
    </div>
  );
}
