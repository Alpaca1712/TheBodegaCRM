import { z } from 'zod'

export const LEAD_TYPES = ['customer', 'investor', 'partnership'] as const
export type LeadType = (typeof LEAD_TYPES)[number]

export const PIPELINE_STAGES = [
  'researched',
  'email_drafted',
  'email_sent',
  'replied',
  'meeting_booked',
  'meeting_held',
  'follow_up',
  'closed_won',
  'closed_lost',
  'no_response',
] as const
export type PipelineStage = (typeof PIPELINE_STAGES)[number]

export const STAGE_LABELS: Record<PipelineStage, string> = {
  researched: 'Researched',
  email_drafted: 'Email Drafted',
  email_sent: 'Email Sent',
  replied: 'Replied',
  meeting_booked: 'Meeting Booked',
  meeting_held: 'Meeting Held',
  follow_up: 'Follow Up',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
  no_response: 'No Response',
}

export const STAGE_DESCRIPTIONS: Record<PipelineStage, string> = {
  researched: 'Lead info gathered, research complete',
  email_drafted: 'Email written, ready to review',
  email_sent: 'Initial email sent',
  replied: 'They replied (positive or neutral)',
  meeting_booked: 'Meeting scheduled',
  meeting_held: 'Meeting completed',
  follow_up: 'In active follow-up sequence',
  closed_won: 'Deal done (pilot signed or investment committed)',
  closed_lost: 'Not interested',
  no_response: 'No reply after full follow-up sequence',
}

export const STAGE_NEXT_ACTIONS: Record<PipelineStage, string> = {
  researched: 'Draft initial SMYKM email',
  email_drafted: 'Review and send',
  email_sent: 'Wait 3-5 days, then follow up',
  replied: 'Use ACA framework to respond',
  meeting_booked: 'Prep SMYKM research for the call',
  meeting_held: 'Send follow-up within 24 hours',
  follow_up: 'Continue multi-channel follow-up',
  closed_won: 'Onboard / close',
  closed_lost: 'Archive, revisit in 3 months',
  no_response: 'Move to next channel or archive',
}

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  customer: 'Customer',
  investor: 'Investor',
  partnership: 'Partnership',
}

export const LEAD_TYPE_SHORT: Record<LeadType, string> = {
  customer: 'Cust',
  investor: 'Inv',
  partnership: 'Ptnr',
}

export const LEAD_TYPE_COLORS: Record<LeadType, { bg: string; text: string }> = {
  customer: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-600 dark:text-blue-300',
  },
  investor: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-600 dark:text-purple-300',
  },
  partnership: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-300',
  },
}

export interface ResearchSource {
  url: string
  title: string
  detail: string
}

export const PRIORITIES = ['high', 'medium', 'low'] as const
export type Priority = (typeof PRIORITIES)[number]

export const EMAIL_TYPES = [
  'initial',
  'follow_up_1',
  'follow_up_2',
  'follow_up_3',
  'reply_response',
  'meeting_request',
  'lead_magnet',
  'break_up',
] as const
export type EmailType = (typeof EMAIL_TYPES)[number]

export const CTA_TYPES = ['mckenna', 'hormozi'] as const
export type CtaType = (typeof CTA_TYPES)[number]

export interface OrgChartMember {
  name: string
  title: string
  department: string | null
  linkedin_url: string | null
  photo_url: string | null
  reports_to: string | null
  lead_id: string | null
}

export interface Lead {
  id: string
  user_id: string
  type: LeadType
  company_name: string
  product_name: string | null
  fund_name: string | null
  contact_name: string
  contact_title: string | null
  contact_email: string | null
  contact_twitter: string | null
  contact_linkedin: string | null
  contact_phone: string | null
  company_description: string | null
  attack_surface_notes: string | null
  investment_thesis_notes: string | null
  personal_details: string | null
  smykm_hooks: string[]
  research_sources: ResearchSource[]
  stage: PipelineStage
  source: string | null
  priority: Priority
  notes: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
  // Dust features
  account_snapshot: Record<string, unknown> | null
  snapshot_generated_at: string | null
  risk_score: number | null
  risk_factors: string[]
  risk_assessed_at: string | null
  // Enrichment & org chart
  contact_photo_url: string | null
  company_website: string | null
  company_logo_url: string | null
  org_chart: OrgChartMember[]
  // GTM features
  icp_score: number | null
  icp_reasons: string[]
  battle_card: Record<string, unknown> | null
  battle_card_generated_at: string | null
  // Conversation intelligence
  email_domain: string | null
  conversation_summary: string | null
  conversation_next_step: string | null
  conversation_signals: ConversationSignal[]
  auto_stage_reason: string | null
  thread_count: number
  total_emails_in: number
  total_emails_out: number
  last_inbound_at: string | null
  last_outbound_at: string | null
}

export interface ConversationSignal {
  type: 'positive' | 'negative' | 'neutral' | 'action_needed' | 'upsell_opportunity'
  signal: string
  source: string
  detected_at: string
}

export interface LeadEmail {
  id: string
  lead_id: string
  user_id: string
  email_type: EmailType
  cta_type: CtaType | null
  subject: string
  body: string
  sent_at: string | null
  replied_at: string | null
  reply_content: string | null
  created_at: string
  updated_at: string
  direction: 'inbound' | 'outbound'
  gmail_message_id: string | null
  gmail_thread_id: string | null
  from_address: string | null
  to_address: string | null
}

export type LeadInsert = Omit<Lead,
  'id' | 'created_at' | 'updated_at' | 'last_contacted_at' | 'contact_phone' | 'research_sources' |
  'email_domain' | 'conversation_summary' | 'conversation_next_step' | 'conversation_signals' |
  'auto_stage_reason' | 'thread_count' | 'total_emails_in' | 'total_emails_out' |
  'last_inbound_at' | 'last_outbound_at' |
  'account_snapshot' | 'snapshot_generated_at' | 'risk_score' | 'risk_factors' | 'risk_assessed_at' |
  'contact_photo_url' | 'company_website' | 'company_logo_url' | 'org_chart' |
  'icp_score' | 'icp_reasons' | 'battle_card' | 'battle_card_generated_at'
> & {
  id?: string
  contact_phone?: string | null
  research_sources?: ResearchSource[]
  last_contacted_at?: string | null
  email_domain?: string | null
  conversation_summary?: string | null
  conversation_next_step?: string | null
  conversation_signals?: ConversationSignal[]
  auto_stage_reason?: string | null
  thread_count?: number
  total_emails_in?: number
  total_emails_out?: number
  last_inbound_at?: string | null
  last_outbound_at?: string | null
}

export type LeadUpdate = Partial<Omit<Lead, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export type LeadEmailInsert = Omit<LeadEmail, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

// Zod schemas for form validation
export const leadFormSchema = z.object({
  type: z.enum(LEAD_TYPES),
  company_name: z.string().min(1, 'Company name is required'),
  product_name: z.string().optional().nullable(),
  fund_name: z.string().optional().nullable(),
  contact_name: z.string().min(1, 'Contact name is required'),
  contact_title: z.string().optional().nullable(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')).nullable(),
  contact_twitter: z.string().optional().nullable(),
  contact_linkedin: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  company_description: z.string().optional().nullable(),
  attack_surface_notes: z.string().optional().nullable(),
  investment_thesis_notes: z.string().optional().nullable(),
  personal_details: z.string().optional().nullable(),
  smykm_hooks: z.array(z.string()).default([]),
  research_sources: z.array(z.object({
    url: z.string(),
    title: z.string(),
    detail: z.string(),
  })).default([]),
  stage: z.enum(PIPELINE_STAGES).default('researched'),
  source: z.string().optional().nullable(),
  priority: z.enum(PRIORITIES).default('medium'),
  notes: z.string().optional().nullable(),
})

export type LeadFormValues = z.infer<typeof leadFormSchema>

// --- Interaction tracking (LinkedIn, calls, etc.) ---

export const INTERACTION_CHANNELS = ['linkedin', 'twitter', 'phone', 'in_person', 'other'] as const
export type InteractionChannel = (typeof INTERACTION_CHANNELS)[number]

export const INTERACTION_TYPES = [
  'dm_sent', 'dm_received', 'connection_request', 'connection_accepted',
  'comment', 'post_like', 'post_share', 'call', 'meeting', 'other',
] as const
export type InteractionType = (typeof INTERACTION_TYPES)[number]

export const CHANNEL_LABELS: Record<InteractionChannel, string> = {
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
  phone: 'Phone',
  in_person: 'In Person',
  other: 'Other',
}

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  dm_sent: 'DM Sent',
  dm_received: 'DM Received',
  connection_request: 'Connection Request',
  connection_accepted: 'Connection Accepted',
  comment: 'Comment',
  post_like: 'Post Like',
  post_share: 'Post Share',
  call: 'Call',
  meeting: 'Meeting',
  other: 'Other',
}

export const CHANNEL_INTERACTION_TYPES: Record<InteractionChannel, InteractionType[]> = {
  linkedin: ['dm_sent', 'dm_received', 'connection_request', 'connection_accepted', 'comment', 'post_like', 'post_share'],
  twitter: ['dm_sent', 'dm_received', 'comment', 'post_like', 'post_share'],
  phone: ['call'],
  in_person: ['meeting'],
  other: ['other'],
}

export interface LeadInteraction {
  id: string
  lead_id: string
  user_id: string
  org_id: string | null
  channel: InteractionChannel
  interaction_type: InteractionType
  content: string | null
  summary: string | null
  ai_summary: Record<string, unknown> | null
  occurred_at: string
  created_at: string
}

export interface PipelineStats {
  stage: PipelineStage
  count: number
}

export interface DashboardStats {
  totalLeads: number
  emailsSentThisWeek: number
  repliesThisWeek: number
  meetingsBooked: number
  pipelineByStage: PipelineStats[]
}

export interface FollowUpSuggestion {
  lead: Lead
  lastEmail: LeadEmail | null
  daysSinceLastEmail: number
  suggestedFollowUpType: EmailType
  suggestedChannel: 'email' | 'linkedin' | 'twitter'
}

export interface EmailVariant {
  subject: string
  body: string
  ctaType: CtaType
  wordCount: number
  quality?: {
    issues: string[]
    score: number
  }
}

export interface GeneratedEmail {
  mckenna: EmailVariant
  hormozi: EmailVariant
}
