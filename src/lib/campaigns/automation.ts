import type {
  CampaignAutomationChannel,
  CampaignAutomationEmailType,
  CampaignTemplateKey,
} from '@/types/campaigns'
import type { Lead } from '@/types/leads'

export const CAMPAIGN_AUTOMATION_CHANNELS = ['email', 'linkedin', 'task'] as const satisfies readonly CampaignAutomationChannel[]
export const CAMPAIGN_AUTOMATION_EMAIL_TYPES = [
  'initial',
  'follow_up_1',
  'follow_up_2',
  'follow_up_3',
  'reply_response',
  'meeting_request',
  'lead_magnet',
  'break_up',
] as const satisfies readonly CampaignAutomationEmailType[]

export interface CampaignAutomationStepSeed {
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
}

export function defaultCampaignAutomationSteps(templateKey: CampaignTemplateKey): CampaignAutomationStepSeed[] {
  if (templateKey === 'linkedin_inbound_playbook') {
    return [
      {
        name: 'Send lead magnet reply',
        position: 10,
        trigger_stage_key: 'opted_in',
        wait_minutes: 0,
        channel: 'email',
        email_type: 'lead_magnet',
        subject_template: 'Free Pentest Challenge',
        body_template: 'Hey {{first_name}},\n\nHere is the Free Pentest Challenge: {{challenge_link}}\n\nIf you complete it, I can point you to the highest-risk gaps and whether it is worth a discovery call.',
        move_to_stage_key: 'lead_magnet_sent',
        stop_on_reply: true,
        active: false,
      },
      {
        name: 'Challenge completion nudge',
        position: 20,
        trigger_stage_key: 'challenge_link_clicked',
        wait_minutes: 120,
        channel: 'email',
        email_type: 'follow_up_1',
        subject_template: 'Want me to review your challenge?',
        body_template: 'Hey {{first_name}},\n\nSaw you opened the challenge link. If you want the useful version, finish the quick application here: {{challenge_link}}\n\nI can then tell you where I would look first.',
        move_to_stage_key: null,
        stop_on_reply: true,
        active: false,
      },
    ]
  }

  if (templateKey === 'email_outbound_lead_magnet' || templateKey === 'email_outbound_direct_offer') {
    return [
      {
        name: 'Follow-up bump',
        position: 10,
        trigger_stage_key: 'sent_waiting',
        wait_minutes: 5760,
        channel: 'email',
        email_type: 'follow_up_1',
        subject_template: 'Quick bump',
        body_template: 'Hey {{first_name}},\n\nWorth sending over the Free Pentest Challenge for {{company_name}}?\n\nIt is a quick way to see where an AI agent may leak or overreach.',
        move_to_stage_key: null,
        stop_on_reply: true,
        active: false,
      },
      {
        name: 'Value drop',
        position: 20,
        trigger_stage_key: 'sent_waiting',
        wait_minutes: 12960,
        channel: 'email',
        email_type: 'lead_magnet',
        subject_template: 'Free Pentest Challenge',
        body_template: 'Hey {{first_name}},\n\nSending this in case it is useful: {{challenge_link}}\n\nIf anything jumps out, I can help you triage it.',
        move_to_stage_key: 'lead_magnet_sent',
        stop_on_reply: true,
        active: false,
      },
      {
        name: 'Break-up',
        position: 30,
        trigger_stage_key: 'sent_waiting',
        wait_minutes: 30240,
        channel: 'email',
        email_type: 'break_up',
        subject_template: 'Should I close the loop?',
        body_template: 'Hey {{first_name}},\n\nI have not heard back, so I will close the loop unless AI agent security is active for {{company_name}} right now.\n\nEither way, here is the challenge link in case it helps later: {{challenge_link}}',
        move_to_stage_key: 'nurture_lost',
        stop_on_reply: true,
        active: false,
      },
    ]
  }

  if (templateKey === 'conference_in_person_hormozi') {
    return [
      {
        name: 'Pre-event outreach',
        position: 10,
        trigger_stage_key: 'target_list',
        wait_minutes: 0,
        channel: 'email',
        email_type: 'initial',
        subject_template: 'Worth connecting at the event?',
        body_template: 'Hey {{first_name}},\n\nI saw {{company_name}} will be at the event. I am putting together a short AI agent security diagnostic for a few teams there.\n\nWorth comparing notes while we are both onsite?',
        move_to_stage_key: 'outreach_sent',
        stop_on_reply: true,
        active: false,
      },
      {
        name: 'Diagnostic follow-up',
        position: 20,
        trigger_stage_key: 'diagnostic_offered',
        wait_minutes: 1440,
        channel: 'email',
        email_type: 'follow_up_1',
        subject_template: 'The diagnostic I mentioned',
        body_template: 'Hey {{first_name}},\n\nGood meeting you. Here is the challenge link I mentioned: {{challenge_link}}\n\nIf you complete it, I can send back the highest-leverage gaps I would look at first.',
        move_to_stage_key: null,
        stop_on_reply: true,
        active: false,
      },
      {
        name: 'Discovery ask',
        position: 30,
        trigger_stage_key: 'diagnostic_offered',
        wait_minutes: 4320,
        channel: 'email',
        email_type: 'meeting_request',
        subject_template: 'Should we turn this into a call?',
        body_template: 'Hey {{first_name}},\n\nIf AI agent security is still live for {{company_name}}, happy to do a tight discovery call and walk through what I would test first.\n\nOpen to it?',
        move_to_stage_key: null,
        stop_on_reply: true,
        active: false,
      },
    ]
  }

  return []
}

export function formatWaitMinutes(minutes: number) {
  if (minutes <= 0) return 'Instant'
  if (minutes < 60) return `${minutes}m`
  if (minutes % 1440 === 0) return `${minutes / 1440}d`
  if (minutes % 60 === 0) return `${minutes / 60}h`
  return `${minutes}m`
}

export function renderCampaignTemplate(input: {
  template: string
  lead: Pick<Lead, 'contact_name' | 'company_name' | 'contact_title' | 'contact_email'>
  challengeLink: string
  leadMagnetName: string
}) {
  const firstName = input.lead.contact_name?.split(/\s+/)[0] || input.lead.contact_name || ''
  const tokens: Record<string, string> = {
    first_name: firstName,
    contact_name: input.lead.contact_name || '',
    company_name: input.lead.company_name || '',
    contact_title: input.lead.contact_title || '',
    contact_email: input.lead.contact_email || '',
    challenge_link: input.challengeLink,
    lead_magnet: input.leadMagnetName,
  }

  return input.template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => tokens[key] || '')
}
