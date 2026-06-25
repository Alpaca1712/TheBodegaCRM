import type { Lead } from '@/types/leads'

export const CAMPAIGN_TYPES = [
  'email_outbound',
  'linkedin_inbound',
  'linkedin_outbound',
  'website_inbound',
  'direct_offer_outbound',
  'conference_in_person',
] as const
export type CampaignType = (typeof CAMPAIGN_TYPES)[number]

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  email_outbound: 'Email Outbound',
  linkedin_inbound: 'LinkedIn Inbound',
  linkedin_outbound: 'LinkedIn Outbound',
  website_inbound: 'Website Inbound',
  direct_offer_outbound: 'Direct Offer Outbound',
  conference_in_person: 'Conference / In Person',
}

export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export const CAMPAIGN_EVENT_TYPES = [
  'lead_added',
  'research_completed',
  'email_drafted',
  'email_sent',
  'email_replied',
  'lead_magnet_requested',
  'lead_magnet_sent',
  'challenge_link_clicked',
  'application_started',
  'application_completed',
  'meeting_booked',
  'not_interested',
  'bounced',
  'no_response',
  'stage_changed',
  'conference_targeted',
  'pre_event_outreach_sent',
  'meeting_scheduled',
  'in_person_conversation',
  'badge_scanned',
  'diagnostic_offered',
  'post_event_follow_up_sent',
] as const
export type CampaignEventType = (typeof CAMPAIGN_EVENT_TYPES)[number]

export const CAMPAIGN_EVENT_LABELS: Record<CampaignEventType, string> = {
  lead_added: 'Lead Added',
  research_completed: 'Research Completed',
  email_drafted: 'Email Drafted',
  email_sent: 'Email Sent',
  email_replied: 'Email Replied',
  lead_magnet_requested: 'Lead Magnet Requested',
  lead_magnet_sent: 'Lead Magnet Sent',
  challenge_link_clicked: 'Challenge Link Clicked',
  application_started: 'Challenge Link Clicked',
  application_completed: 'Application Completed',
  meeting_booked: 'Meeting Booked',
  not_interested: 'Not Interested',
  bounced: 'Bounced',
  no_response: 'No Response',
  stage_changed: 'Stage Changed',
  conference_targeted: 'Conference Targeted',
  pre_event_outreach_sent: 'Pre-event Outreach Sent',
  meeting_scheduled: 'Meeting Scheduled',
  in_person_conversation: 'In-person Conversation',
  badge_scanned: 'Badge Scanned',
  diagnostic_offered: 'Diagnostic Offered',
  post_event_follow_up_sent: 'Post-event Follow-up Sent',
}

export type CampaignTemplateKey =
  | 'email_outbound_lead_magnet'
  | 'email_outbound_direct_offer'
  | 'linkedin_inbound_playbook'
  | 'conference_in_person_hormozi'

export interface CampaignStageTemplate {
  key: string
  label: string
  terminal?: boolean
  goal?: boolean
}

export interface CampaignTemplate {
  key: CampaignTemplateKey
  name: string
  campaignType: CampaignType
  description: string
  initialStageKey: string
  targetChannel: string
  stages: CampaignStageTemplate[]
}

export const CAMPAIGN_TEMPLATES: Record<CampaignTemplateKey, CampaignTemplate> = {
  email_outbound_lead_magnet: {
    key: 'email_outbound_lead_magnet',
    name: 'Outbound Lead Magnet',
    campaignType: 'email_outbound',
    description: 'Cold email flow that asks permission, sends the lead magnet, then moves prospects into the challenge and discovery call.',
    initialStageKey: 'research_needed',
    targetChannel: 'email',
    stages: [
      { key: 'research_needed', label: 'Research Needed' },
      { key: 'researched', label: 'Researched' },
      { key: 'initial_email_drafted', label: 'Initial Email Drafted' },
      { key: 'initial_email_sent', label: 'Email Sent' },
      { key: 'replied_interested', label: 'Replied / Interested' },
      { key: 'lead_magnet_sent', label: 'Lead Magnet Sent' },
      { key: 'challenge_link_clicked', label: 'Challenge Link Clicked' },
      { key: 'application_completed', label: 'Application Completed' },
      { key: 'meeting_booked', label: 'Meeting Booked', terminal: true, goal: true },
      { key: 'no_response', label: 'No Response', terminal: true },
      { key: 'not_interested', label: 'Not Interested', terminal: true },
    ],
  },
  email_outbound_direct_offer: {
    key: 'email_outbound_direct_offer',
    name: 'Outbound Direct Offer',
    campaignType: 'direct_offer_outbound',
    description: 'Cold email flow that sends the prospect directly to a tracked challenge application link.',
    initialStageKey: 'research_needed',
    targetChannel: 'email',
    stages: [
      { key: 'research_needed', label: 'Research Needed' },
      { key: 'researched', label: 'Researched' },
      { key: 'offer_email_drafted', label: 'Offer Email Drafted' },
      { key: 'offer_email_sent', label: 'Offer Sent' },
      { key: 'replied_interested', label: 'Replied / Interested' },
      { key: 'challenge_link_clicked', label: 'Challenge Link Clicked' },
      { key: 'application_completed', label: 'Application Completed' },
      { key: 'meeting_booked', label: 'Meeting Booked', terminal: true, goal: true },
      { key: 'no_response', label: 'No Response', terminal: true },
      { key: 'not_interested', label: 'Not Interested', terminal: true },
    ],
  },
  linkedin_inbound_playbook: {
    key: 'linkedin_inbound_playbook',
    name: 'Inbound Playbook Landing',
    campaignType: 'linkedin_inbound',
    description: 'Tracked landing-page flow: playbook opt-in, challenge click, application completion, then booked discovery.',
    initialStageKey: 'playbook_opt_in',
    targetChannel: 'linkedin',
    stages: [
      { key: 'playbook_opt_in', label: 'Playbook Opt-in' },
      { key: 'lead_magnet_sent', label: 'Lead Magnet Sent' },
      { key: 'challenge_link_clicked', label: 'Challenge Link Clicked' },
      { key: 'application_completed', label: 'Application Completed' },
      { key: 'meeting_booked', label: 'Meeting Booked', terminal: true, goal: true },
      { key: 'nurture', label: 'Nurture' },
    ],
  },
  conference_in_person_hormozi: {
    key: 'conference_in_person_hormozi',
    name: 'Conference Value-First Playbook',
    campaignType: 'conference_in_person',
    description: 'In-person conference flow: pre-book targets, lead with free diagnostic value, then convert to discovery.',
    initialStageKey: 'target_account_list',
    targetChannel: 'in_person',
    stages: [
      { key: 'target_account_list', label: 'Target Account List' },
      { key: 'pre_event_research', label: 'Pre-event Research' },
      { key: 'pre_event_outreach_sent', label: 'Pre-event Outreach Sent' },
      { key: 'meeting_scheduled', label: 'Meeting Scheduled' },
      { key: 'in_person_conversation', label: 'In-person Conversation' },
      { key: 'diagnostic_offered', label: 'Diagnostic Offered' },
      { key: 'post_event_follow_up_sent', label: 'Post-event Follow-up Sent' },
      { key: 'discovery_booked', label: 'Discovery Booked', terminal: true, goal: true },
      { key: 'nurture', label: 'Nurture' },
      { key: 'not_a_fit', label: 'Not a Fit', terminal: true },
    ],
  },
}

export const DEFAULT_TEMPLATE_BY_CAMPAIGN_TYPE: Record<CampaignType, CampaignTemplateKey> = {
  email_outbound: 'email_outbound_lead_magnet',
  linkedin_inbound: 'linkedin_inbound_playbook',
  linkedin_outbound: 'email_outbound_lead_magnet',
  website_inbound: 'linkedin_inbound_playbook',
  direct_offer_outbound: 'email_outbound_direct_offer',
  conference_in_person: 'conference_in_person_hormozi',
}

export interface Campaign {
  id: string
  org_id: string
  user_id: string
  name: string
  slug: string
  campaign_type: CampaignType
  status: CampaignStatus
  description: string | null
  lead_magnet_name: string | null
  created_at: string
  updated_at: string
}

export interface CampaignPipeline {
  id: string
  campaign_id: string
  org_id: string
  template_key: CampaignTemplateKey
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface CampaignStage {
  id: string
  campaign_id: string
  pipeline_id: string
  org_id: string
  stage_key: string
  label: string
  position: number
  is_terminal: boolean
  is_goal: boolean
  created_at: string
}

export interface CampaignEnrollment {
  id: string
  campaign_id: string
  lead_id: string
  org_id: string
  user_id: string
  stage_key: string
  status: 'active' | 'completed' | 'exited'
  enrolled_at: string
  updated_at: string
  completed_at: string | null
  last_event_at: string | null
  metadata: Record<string, unknown>
}

export interface CampaignEnrollmentWithLead extends CampaignEnrollment {
  lead: Pick<
    Lead,
    | 'id'
    | 'contact_name'
    | 'company_name'
    | 'contact_email'
    | 'contact_title'
    | 'stage'
    | 'source'
    | 'last_contacted_at'
    | 'updated_at'
  > | null
}

export interface CampaignEvent {
  id: string
  campaign_id: string
  enrollment_id: string | null
  lead_id: string | null
  org_id: string
  user_id: string
  event_type: CampaignEventType
  stage_key: string | null
  occurred_at: string
  metadata: Record<string, unknown>
}

export interface CampaignMetrics {
  leads_enrolled: number
  initial_emails_sent: number
  replies: number
  lead_magnets_sent: number
  applications_completed: number
  meetings_booked: number
}

export interface CampaignListItem extends Campaign {
  template_key: CampaignTemplateKey | null
  metrics: CampaignMetrics
  landing_url?: string | null
}

export interface CampaignDetail extends CampaignListItem {
  pipeline: CampaignPipeline | null
  stages: CampaignStage[]
  enrollments: CampaignEnrollmentWithLead[]
  events: CampaignEvent[]
}
