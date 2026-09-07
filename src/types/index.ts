export type LeadStage =
  | 'new'
  | 'contacted'
  | 'replied'
  | 'interested'
  | 'meeting_booked'
  | 'not_interested'
  | 'unsubscribed'
  | 'bounced'
  | 'customer'
  | 'lost'

export const LEAD_STAGES: LeadStage[] = [
  'new', 'contacted', 'replied', 'interested', 'meeting_booked',
  'not_interested', 'unsubscribed', 'bounced', 'customer', 'lost',
]

export type EmailStatus = 'unverified' | 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown'

export interface Lead {
  id: string
  email: string
  email_status: EmailStatus
  email_score: number | null
  email_verified_at: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  title: string | null
  linkedin_url: string | null
  twitter_url: string | null
  phone: string | null
  company_name: string | null
  company_domain: string | null
  company_website: string | null
  company_description: string | null
  company_industry: string | null
  company_size: string | null
  company_location: string | null
  stage: LeadStage
  source: string | null
  campaign_id: string | null
  tags: string[]
  notes: string | null
  research: Record<string, unknown>
  custom: Record<string, unknown>
  enrichment: Record<string, unknown>
  lead_token: string | null
  do_not_contact: boolean
  unsubscribed_at: string | null
  bounced_at: string | null
  replied_at: string | null
  last_contacted_at: string | null
  last_inbound_at: string | null
  last_outbound_at: string | null
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  name: string
  slug: string
  description: string | null
  status: 'active' | 'archived'
  is_default_landing: boolean
  created_at: string
  updated_at: string
}

export type SequenceStatus = 'draft' | 'active' | 'paused' | 'archived'

export interface SendWindow {
  days: number[]
  start_hour: number
  end_hour: number
  timezone: string
}

export interface Sequence {
  id: string
  name: string
  slug: string
  description: string | null
  status: SequenceStatus
  campaign_id: string | null
  from_name: string | null
  from_email: string | null
  reply_to: string | null
  send_window: SendWindow
  stop_on_reply: boolean
  daily_send_limit: number | null
  created_at: string
  updated_at: string
}

export type BodyFormat = 'text' | 'markdown' | 'html'

export interface SequenceStep {
  id: string
  sequence_id: string
  position: number
  name: string | null
  delay_minutes: number
  subject: string | null
  body: string
  body_format: BodyFormat
  thread_with_previous: boolean
  lead_magnet_id: string | null
  condition_prompt: string | null
  condition_model: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'replied' | 'bounced' | 'unsubscribed' | 'exited'

export interface SequenceEnrollment {
  id: string
  sequence_id: string
  lead_id: string
  status: EnrollmentStatus
  steps_sent: number
  next_step_id: string | null
  next_step_due_at: string | null
  enrolled_at: string
  completed_at: string | null
  exited_at: string | null
  exit_reason: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type EmailDirection = 'outbound' | 'inbound'
export type EmailSource = 'sequence' | 'api' | 'inbound'
export type EmailDeliveryStatus =
  | 'queued' | 'sent' | 'delivered' | 'delivery_delayed' | 'bounced'
  | 'complained' | 'failed' | 'suppressed' | 'received'

export interface EmailAttachment {
  filename: string
  content_type: string | null
  size?: number | null
  lead_magnet_id?: string | null
  resend_attachment_id?: string | null
}

export interface Email {
  id: string
  lead_id: string | null
  sequence_id: string | null
  step_id: string | null
  enrollment_id: string | null
  thread_id: string | null
  direction: EmailDirection
  source: EmailSource
  from_address: string
  to_addresses: string[]
  cc_addresses: string[]
  reply_to: string | null
  subject: string
  text_body: string | null
  html_body: string | null
  message_id: string | null
  in_reply_to: string | null
  references_ids: string[]
  resend_id: string | null
  status: EmailDeliveryStatus
  bounce_reason: string | null
  attachments: EmailAttachment[]
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  bounced_at: string | null
  received_at: string | null
  is_read: boolean
  handled_at: string | null
  created_at: string
  updated_at: string
}

export interface StepExecution {
  id: string
  enrollment_id: string
  step_id: string
  sequence_id: string
  lead_id: string
  status: 'sent' | 'skipped' | 'failed'
  email_id: string | null
  skip_reason: string | null
  error: string | null
  condition_result: Record<string, unknown> | null
  executed_at: string
}

export interface EmailTemplate {
  id: string
  name: string
  slug: string
  subject: string
  body: string
  body_format: BodyFormat
  category: string | null
  tags: string[]
  usage_count: number
  created_at: string
  updated_at: string
}

export interface LeadMagnet {
  id: string
  name: string
  slug: string
  description: string | null
  body_markdown: string
  filename_template: string
  created_at: string
  updated_at: string
}

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  created_at: string
  revoked_at: string | null
}

export interface AiSettings {
  default_model: string
}

export interface SenderSettings {
  from_name: string
  from_email: string
  reply_to: string | null
  signature: string
}

export interface LandingSettings {
  base_url: string
}
