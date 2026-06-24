'use client';

import { useSearchParams } from 'next/navigation';
import LeadForm from '@/components/leads/lead-form';
import type { LeadType } from '@/types/leads';

export default function NewLeadPage() {
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') as LeadType) || 'customer';
  const campaignId = searchParams.get('campaign_id');
  const campaignSlug = searchParams.get('campaign_slug') || searchParams.get('campaign');
  const utmSource = searchParams.get('utm_source');
  const utmMedium = searchParams.get('utm_medium');
  const utmCampaign = searchParams.get('utm_campaign');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">New Lead</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Add a new {type === 'customer' ? 'customer' : 'investor'} lead with research
        </p>
      </div>

      <LeadForm
        mode="create"
        defaultValues={{
          type,
          campaign_id: campaignId,
          campaign_slug: campaignSlug,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          source: campaignSlug || utmCampaign || undefined,
          source_type: campaignSlug || utmCampaign ? 'website' : 'manual',
        }}
      />
    </div>
  );
}
