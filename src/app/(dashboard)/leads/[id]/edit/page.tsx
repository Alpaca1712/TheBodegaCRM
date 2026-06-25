'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LeadForm from '@/components/leads/lead-form';
import {
  challengeProfileToAttackSurfaceNotes,
  getLeadChallengeProfile,
} from '@/lib/leads/challenge-profile';
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

  const challengeProfile = getLeadChallengeProfile(lead);
  const challengeAttackSurface = challengeProfile ? challengeProfileToAttackSurfaceNotes(challengeProfile) : null;
  const sourceType =
    lead.source_type === 'manual' && challengeProfile
      ? 'website'
      : lead.source_type;
  const defaultValues: Partial<LeadFormValues> = {
    type: lead.type,
    company_name: lead.company_name,
    product_name: lead.product_name,
    fund_name: lead.fund_name,
    contact_name: lead.contact_name,
    contact_title: lead.contact_title,
    contact_email: lead.contact_email,
    contact_phone: lead.contact_phone,
    contact_twitter: lead.contact_twitter,
    contact_linkedin: lead.contact_linkedin,
    company_description: lead.company_description || challengeProfile?.companyDescription || null,
    attack_surface_notes: lead.attack_surface_notes || challengeAttackSurface,
    investment_thesis_notes: lead.investment_thesis_notes,
    personal_details: lead.personal_details,
    smykm_hooks: lead.smykm_hooks?.length ? lead.smykm_hooks : challengeProfile?.hooks || [],
    research_sources: lead.research_sources || [],
    stage: lead.stage,
    source_type: sourceType,
    source: lead.source,
    lead_token: lead.lead_token,
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
