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
  | 'website_inbound_lead_magnet'
  | 'linkedin_outbound_lead_magnet'
  | 'linkedin_outbound_direct_offer'
  | 'conference_in_person_hormozi'

export interface CampaignStageTemplate {
  key: string
  label: string
  terminal?: boolean
  goal?: boolean
}

export interface CampaignSequenceStep {
  key: string
  label: string
  timing: string
  channel: 'email' | 'linkedin' | 'in_person' | 'landing'
  goal: string
}

export type CampaignAutomationChannel = 'email' | 'linkedin' | 'task'

export type CampaignAutomationEmailType =
  | 'initial'
  | 'follow_up_1'
  | 'follow_up_2'
  | 'follow_up_3'
  | 'reply_response'
  | 'meeting_request'
  | 'lead_magnet'
  | 'break_up'

export interface CampaignAutomationAttachment {
  name: string
  url?: string
  data?: string
  mime_type?: string
  size?: number
}

export interface CampaignAutomationAiCondition {
  prompt: string
  true_tag?: string
  false_tag?: string
}

export interface LeadTag {
  id: string
  lead_id: string
  name: string
  color: string
  source: string
  created_at: string
}

export interface CampaignAutomationStep {
  id: string
  campaign_id: string
  org_id: string
  user_id: string
  name: string
  position: number
  trigger_stage_key: string
  wait_minutes: number
  channel: CampaignAutomationChannel
  email_type: CampaignAutomationEmailType
  subject_template: string
  body_template: string
  move_to_stage_key: string | null
  stop_on_reply: boolean
  active: boolean
  metadata: Record<string, unknown> & {
    attachments?: CampaignAutomationAttachment[]
    ai_condition?: CampaignAutomationAiCondition
    lead_magnet_id?: string | null
  }
  created_at: string
  updated_at: string
}

export interface CampaignSequenceExecution {
  id: string
  campaign_id: string
  campaign_sequence_step_id: string
  campaign_enrollment_id: string
  lead_id: string
  org_id: string
  user_id: string
  status: 'scheduled' | 'sent' | 'skipped' | 'failed'
  due_at: string
  executed_at: string | null
  lead_email_id: string | null
  error_message: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface CampaignTemplate {
  key: CampaignTemplateKey
  name: string
  campaignType: CampaignType
  description: string
  initialStageKey: string
  targetChannel: string
  stages: CampaignStageTemplate[]
  sequenceSteps: CampaignSequenceStep[]
}

export const CAMPAIGN_TEMPLATES: Record<CampaignTemplateKey, CampaignTemplate> = {
  email_outbound_lead_magnet: {
    key: 'email_outbound_lead_magnet',
    name: 'Outbound Lead Magnet',
    campaignType: 'email_outbound',
    description: 'Cold email flow that asks permission, sends the lead magnet, then moves prospects into the challenge and discovery call.',
    initialStageKey: 'to_send',
    targetChannel: 'email',
    stages: [
      { key: 'to_send', label: 'To Send' },
      { key: 'sent_waiting', label: 'Sent / Waiting' },
      { key: 'replied', label: 'Replied' },
      { key: 'lead_magnet_sent', label: 'Lead Magnet Sent' },
      { key: 'challenge_link_clicked', label: 'Challenge Link Clicked' },
      { key: 'application_completed', label: 'Application Completed' },
      { key: 'meeting_booked', label: 'Meeting Booked', terminal: true, goal: true },
      { key: 'nurture_lost', label: 'Nurture / Lost' },
    ],
    sequenceSteps: [
      { key: 'initial', label: 'Personalized opener', timing: 'Day 0', channel: 'email', goal: 'Send a SMYKM email that asks permission to share the free challenge.' },
      { key: 'follow_up_1', label: 'Short bump', timing: 'Day 4', channel: 'email', goal: 'Use a second hook, no long recap.' },
      { key: 'follow_up_2', label: 'Value drop', timing: 'Day 9', channel: 'email', goal: 'Send or offer the lead magnet with one clear next step.' },
      { key: 'follow_up_3', label: 'Channel switch', timing: 'Day 14', channel: 'linkedin', goal: 'Move to LinkedIn with the same campaign attribution.' },
      { key: 'break_up', label: 'Break-up', timing: 'Day 21+', channel: 'email', goal: 'Give them an easy out and move non-responders to nurture.' },
    ],
  },
  email_outbound_direct_offer: {
    key: 'email_outbound_direct_offer',
    name: 'Outbound Direct Offer',
    campaignType: 'direct_offer_outbound',
    description: 'Cold email flow that sends the prospect directly to a tracked challenge application link.',
    initialStageKey: 'to_send',
    targetChannel: 'email',
    stages: [
      { key: 'to_send', label: 'To Send' },
      { key: 'sent_waiting', label: 'Sent / Waiting' },
      { key: 'replied', label: 'Replied' },
      { key: 'challenge_link_clicked', label: 'Challenge Link Clicked' },
      { key: 'application_completed', label: 'Application Completed' },
      { key: 'meeting_booked', label: 'Meeting Booked', terminal: true, goal: true },
      { key: 'nurture_lost', label: 'Nurture / Lost' },
    ],
    sequenceSteps: [
      { key: 'initial', label: 'Direct offer', timing: 'Day 0', channel: 'email', goal: 'Send the tracked challenge link for this specific lead.' },
      { key: 'follow_up_1', label: 'Proof bump', timing: 'Day 4', channel: 'email', goal: 'Add one relevant proof point or risk observation.' },
      { key: 'follow_up_2', label: 'Objection breaker', timing: 'Day 9', channel: 'email', goal: 'Reduce friction and point back to the challenge.' },
      { key: 'follow_up_3', label: 'Channel switch', timing: 'Day 14', channel: 'linkedin', goal: 'Use LinkedIn when email is quiet.' },
      { key: 'break_up', label: 'Break-up', timing: 'Day 21+', channel: 'email', goal: 'Close the loop cleanly or move to nurture.' },
    ],
  },
  linkedin_inbound_playbook: {
    key: 'linkedin_inbound_playbook',
    name: 'Inbound Playbook Landing',
    campaignType: 'linkedin_inbound',
    description: 'Tracked landing-page flow: playbook opt-in, challenge click, application completion, then booked discovery.',
    initialStageKey: 'opted_in',
    targetChannel: 'linkedin',
    stages: [
      { key: 'opted_in', label: 'Opted In' },
      { key: 'lead_magnet_sent', label: 'Lead Magnet Sent' },
      { key: 'challenge_link_clicked', label: 'Challenge Link Clicked' },
      { key: 'application_completed', label: 'Application Completed' },
      { key: 'meeting_booked', label: 'Meeting Booked', terminal: true, goal: true },
      { key: 'nurture_lost', label: 'Nurture / Lost' },
    ],
    sequenceSteps: [
      { key: 'opt_in', label: 'Landing opt-in', timing: 'Instant', channel: 'landing', goal: 'Capture the lead from the campaign landing page.' },
      { key: 'deliver', label: 'Deliver playbook', timing: 'Instant', channel: 'email', goal: 'Send the lead magnet and preserve campaign attribution.' },
      { key: 'challenge', label: 'Challenge CTA', timing: 'Same day', channel: 'landing', goal: 'Move them to the tracked challenge page.' },
      { key: 'nudge', label: 'Application nudge', timing: 'Day 1', channel: 'email', goal: 'Remind them to complete the challenge application.' },
      { key: 'book', label: 'Book discovery', timing: 'After application', channel: 'email', goal: 'Convert qualified applications to discovery.' },
    ],
  },
  website_inbound_lead_magnet: {
    key: 'website_inbound_lead_magnet',
    name: 'Website Inbound Lead Magnet',
    campaignType: 'website_inbound',
    description: 'Generic inbound flow for landing pages, referrals, QR codes, or direct traffic: opt in, receive the lead magnet, click the challenge, complete the application, then book discovery.',
    initialStageKey: 'opted_in',
    targetChannel: 'landing',
    stages: [
      { key: 'opted_in', label: 'Opted In' },
      { key: 'lead_magnet_sent', label: 'Lead Magnet Sent' },
      { key: 'challenge_link_clicked', label: 'Challenge Link Clicked' },
      { key: 'application_completed', label: 'Application Completed' },
      { key: 'meeting_booked', label: 'Meeting Booked', terminal: true, goal: true },
      { key: 'nurture_lost', label: 'Nurture / Lost' },
    ],
    sequenceSteps: [
      { key: 'opt_in', label: 'Inbound opt-in', timing: 'Instant', channel: 'landing', goal: 'Capture the lead from the inbound source.' },
      { key: 'deliver', label: 'Deliver lead magnet', timing: 'Instant', channel: 'email', goal: 'Send the selected lead magnet with per-lead attribution.' },
      { key: 'challenge', label: 'Challenge CTA', timing: 'Same day', channel: 'landing', goal: 'Move them to the tracked challenge page.' },
      { key: 'nudge', label: 'Application nudge', timing: 'Day 1', channel: 'email', goal: 'Remind them to complete the challenge application.' },
      { key: 'book', label: 'Book discovery', timing: 'After application', channel: 'email', goal: 'Convert qualified applications to discovery.' },
    ],
  },
  linkedin_outbound_lead_magnet: {
    key: 'linkedin_outbound_lead_magnet',
    name: 'LinkedIn Outbound Lead Magnet',
    campaignType: 'linkedin_outbound',
    description: 'Manual LinkedIn outbound flow: message prospects, track who asks for the lead magnet or offer, then move them toward the challenge and discovery.',
    initialStageKey: 'to_message',
    targetChannel: 'linkedin',
    stages: [
      { key: 'to_message', label: 'To Message' },
      { key: 'messaged_waiting', label: 'Messaged / Waiting' },
      { key: 'replied', label: 'Replied' },
      { key: 'lead_magnet_requested', label: 'Asked For Lead Magnet' },
      { key: 'lead_magnet_sent', label: 'Lead Magnet Sent' },
      { key: 'challenge_link_clicked', label: 'Challenge Link Clicked' },
      { key: 'application_completed', label: 'Application Completed' },
      { key: 'meeting_booked', label: 'Meeting Booked', terminal: true, goal: true },
      { key: 'nurture_lost', label: 'Nurture / Lost' },
    ],
    sequenceSteps: [
      { key: 'message', label: 'Manual LinkedIn opener', timing: 'Day 0', channel: 'linkedin', goal: 'Send the first LinkedIn message manually and track the response.' },
      { key: 'reply', label: 'Track reply intent', timing: 'When they reply', channel: 'linkedin', goal: 'Move interested replies into requested or direct offer stages.' },
      { key: 'deliver', label: 'Deliver lead magnet', timing: 'After request', channel: 'email', goal: 'Send the personalized lead magnet PDF or tracked challenge link.' },
      { key: 'nudge', label: 'Challenge nudge', timing: '2 hours after click', channel: 'email', goal: 'Nudge the challenge/application if they clicked but did not complete.' },
    ],
  },
  linkedin_outbound_direct_offer: {
    key: 'linkedin_outbound_direct_offer',
    name: 'LinkedIn Outbound Direct Offer',
    campaignType: 'linkedin_outbound',
    description: 'Manual LinkedIn outbound flow for pitching the offer directly: message prospects, send the tracked challenge link, then move them toward the application and discovery.',
    initialStageKey: 'to_message',
    targetChannel: 'linkedin',
    stages: [
      { key: 'to_message', label: 'To Message' },
      { key: 'messaged_waiting', label: 'Messaged / Waiting' },
      { key: 'replied', label: 'Replied' },
      { key: 'offer_sent', label: 'Offer Sent' },
      { key: 'challenge_link_clicked', label: 'Challenge Link Clicked' },
      { key: 'application_completed', label: 'Application Completed' },
      { key: 'meeting_booked', label: 'Meeting Booked', terminal: true, goal: true },
      { key: 'nurture_lost', label: 'Nurture / Lost' },
    ],
    sequenceSteps: [
      { key: 'message', label: 'Manual LinkedIn opener', timing: 'Day 0', channel: 'linkedin', goal: 'Send the first LinkedIn message manually and track the response.' },
      { key: 'offer', label: 'Send direct offer', timing: 'After interest', channel: 'linkedin', goal: 'Send the tracked challenge link or offer asset for this specific lead.' },
      { key: 'nudge', label: 'Application nudge', timing: '2 hours after click', channel: 'email', goal: 'Nudge the challenge/application if they clicked but did not complete.' },
    ],
  },
  conference_in_person_hormozi: {
    key: 'conference_in_person_hormozi',
    name: 'Conference Value-First Playbook',
    campaignType: 'conference_in_person',
    description: 'In-person conference flow: pre-book targets, lead with free diagnostic value, then convert to discovery.',
    initialStageKey: 'target_list',
    targetChannel: 'in_person',
    stages: [
      { key: 'target_list', label: 'Target List' },
      { key: 'outreach_sent', label: 'Outreach Sent' },
      { key: 'meeting_scheduled', label: 'Scheduled' },
      { key: 'in_person_conversation', label: 'Met In Person' },
      { key: 'diagnostic_offered', label: 'Diagnostic Offered' },
      { key: 'discovery_booked', label: 'Discovery Booked', terminal: true, goal: true },
      { key: 'nurture_lost', label: 'Nurture / Lost' },
    ],
    sequenceSteps: [
      { key: 'target', label: 'Dream 100 list', timing: '2 weeks before', channel: 'in_person', goal: 'Pick target accounts and reasons to meet.' },
      { key: 'pre_event', label: 'Pre-event outreach', timing: '1 week before', channel: 'email', goal: 'Book or warm up the in-person conversation.' },
      { key: 'conversation', label: 'Value-first conversation', timing: 'Event day', channel: 'in_person', goal: 'Lead with the diagnostic, not a pitch.' },
      { key: 'diagnostic', label: 'Diagnostic follow-up', timing: '24 hours after', channel: 'email', goal: 'Send the promised value while the meeting is fresh.' },
      { key: 'discovery', label: 'Discovery ask', timing: '2-3 days after', channel: 'email', goal: 'Convert the diagnostic into a booked discovery call.' },
    ],
  },
}

export const DEFAULT_TEMPLATE_BY_CAMPAIGN_TYPE: Record<CampaignType, CampaignTemplateKey> = {
  email_outbound: 'email_outbound_lead_magnet',
  linkedin_inbound: 'linkedin_inbound_playbook',
  linkedin_outbound: 'linkedin_outbound_lead_magnet',
  website_inbound: 'website_inbound_lead_magnet',
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
  is_default_landing: boolean
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
  > & {
    lead_tags?: LeadTag[]
  } | null
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

export interface CampaignLeadMagnet {
  id: string
  campaign_id: string
  org_id: string
  user_id: string
  name: string
  google_doc_id: string
  google_doc_url: string | null
  cta_phrase: string
  cta_link_text: string
  filename_template: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface CampaignDetail extends CampaignListItem {
  pipeline: CampaignPipeline | null
  stages: CampaignStage[]
  enrollments: CampaignEnrollmentWithLead[]
  events: CampaignEvent[]
  sequence_steps: CampaignAutomationStep[]
  sequence_executions: CampaignSequenceExecution[]
  lead_magnets: CampaignLeadMagnet[]
}
