import { CAMPAIGN_TEMPLATES, type CampaignTemplateKey } from '@/types/campaigns'

export const CAMPAIGN_TEMPLATE_OPTIONS: Array<{ key: CampaignTemplateKey; label: string }> = [
  { key: 'email_outbound_lead_magnet', label: CAMPAIGN_TEMPLATES.email_outbound_lead_magnet.name },
  { key: 'email_outbound_direct_offer', label: CAMPAIGN_TEMPLATES.email_outbound_direct_offer.name },
  { key: 'website_inbound_lead_magnet', label: CAMPAIGN_TEMPLATES.website_inbound_lead_magnet.name },
  { key: 'linkedin_inbound_playbook', label: CAMPAIGN_TEMPLATES.linkedin_inbound_playbook.name },
  { key: 'linkedin_outbound_lead_magnet', label: CAMPAIGN_TEMPLATES.linkedin_outbound_lead_magnet.name },
  { key: 'linkedin_outbound_direct_offer', label: CAMPAIGN_TEMPLATES.linkedin_outbound_direct_offer.name },
  { key: 'conference_in_person_hormozi', label: CAMPAIGN_TEMPLATES.conference_in_person_hormozi.name },
]
