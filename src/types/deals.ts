import type { Campaign } from '@/types/campaigns'
import type { Lead } from '@/types/leads'

export const DEAL_STAGES = [
  'discovery_booked',
  'discovery_held',
  'qualified',
  'challenge_proposed',
  'challenge_active',
  'proposal_sent',
  'negotiation',
  'closed_won',
  'closed_lost',
  'no_show_nurture',
] as const
export type DealStage = (typeof DEAL_STAGES)[number]

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  discovery_booked: 'Discovery Booked',
  discovery_held: 'Discovery Held',
  qualified: 'Qualified',
  challenge_proposed: 'Challenge Proposed',
  challenge_active: 'Challenge Active',
  proposal_sent: 'Proposal Sent',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
  no_show_nurture: 'No Show / Nurture',
}

export const DEAL_STATUS_LABELS = {
  open: 'Open',
  won: 'Won',
  lost: 'Lost',
  nurture: 'Nurture',
} as const

export type DealStatus = keyof typeof DEAL_STATUS_LABELS

export const DEAL_STAGE_PROBABILITY: Record<DealStage, number> = {
  discovery_booked: 20,
  discovery_held: 30,
  qualified: 45,
  challenge_proposed: 55,
  challenge_active: 65,
  proposal_sent: 75,
  negotiation: 85,
  closed_won: 100,
  closed_lost: 0,
  no_show_nurture: 10,
}

export interface Opportunity {
  id: string
  org_id: string
  user_id: string
  lead_id: string
  campaign_id: string | null
  campaign_enrollment_id: string | null
  name: string
  stage: DealStage
  status: DealStatus
  estimated_value: number | null
  probability: number
  discovery_booked_at: string | null
  discovery_held_at: string | null
  expected_close_date: string | null
  next_step: string | null
  next_step_due_at: string | null
  source: string | null
  attribution: Record<string, unknown>
  lost_reason: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface OpportunityWithRelations extends Opportunity {
  lead: Pick<Lead, 'id' | 'contact_name' | 'company_name' | 'contact_email' | 'contact_title' | 'lead_token'> | null
  campaign: Pick<Campaign, 'id' | 'name' | 'slug' | 'campaign_type'> | null
}

export interface OpportunityEvent {
  id: string
  opportunity_id: string
  org_id: string
  user_id: string
  event_type: 'created' | 'stage_changed' | 'next_step_updated' | 'gmail_sent' | 'meeting_held' | 'closed_won' | 'closed_lost' | 'note'
  old_stage: DealStage | null
  new_stage: DealStage | null
  occurred_at: string
  metadata: Record<string, unknown>
}

export interface DealFlowMetrics {
  open: number
  discovery_booked: number
  qualified: number
  proposal_sent: number
  won: number
  weighted_value: number
}
