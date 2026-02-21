import { createClient } from '@/lib/supabase/client'
import { getActiveOrgId } from '@/lib/api/organizations'

export type TriggerType =
  | 'contact_created'
  | 'contact_status_changed'
  | 'deal_created'
  | 'deal_stage_changed'
  | 'deal_won'
  | 'deal_lost'
  | 'activity_completed'
  | 'tag_added'

export type ActionType =
  | 'create_activity'
  | 'update_contact_status'
  | 'send_notification'
  | 'enroll_in_sequence'
  | 'add_tag'
  | 'create_deal'

export interface AutomationAction {
  type: ActionType
  config: Record<string, unknown>
}

export interface Automation {
  id: string
  user_id: string
  org_id: string | null
  name: string
  description: string | null
  trigger_type: TriggerType
  trigger_config: Record<string, unknown>
  actions: AutomationAction[]
  is_active: boolean
  runs_count: number
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export interface AutomationRun {
  id: string
  automation_id: string
  trigger_data: Record<string, unknown>
  actions_executed: unknown[]
  status: 'success' | 'partial' | 'failed'
  error_message: string | null
  executed_at: string
}

export const TRIGGER_CONFIG: Record<TriggerType, { label: string; description: string; icon: string }> = {
  contact_created: { label: 'Contact Created', description: 'When a new contact is added', icon: 'user-plus' },
  contact_status_changed: { label: 'Contact Status Changed', description: 'When a contact status changes', icon: 'refresh-cw' },
  deal_created: { label: 'Deal Created', description: 'When a new deal is created', icon: 'plus-circle' },
  deal_stage_changed: { label: 'Deal Stage Changed', description: 'When a deal moves to a new stage', icon: 'arrow-right' },
  deal_won: { label: 'Deal Won', description: 'When a deal is marked closed-won', icon: 'trophy' },
  deal_lost: { label: 'Deal Lost', description: 'When a deal is marked closed-lost', icon: 'x-circle' },
  activity_completed: { label: 'Activity Completed', description: 'When an activity is marked complete', icon: 'check-circle' },
  tag_added: { label: 'Tag Added', description: 'When a tag is added to a contact', icon: 'tag' },
}

export const ACTION_CONFIG: Record<ActionType, { label: string; description: string; icon: string }> = {
  create_activity: { label: 'Create Activity', description: 'Log a new activity', icon: 'calendar' },
  update_contact_status: { label: 'Update Contact Status', description: 'Change contact status', icon: 'edit' },
  send_notification: { label: 'Send Notification', description: 'Send a toast notification', icon: 'bell' },
  enroll_in_sequence: { label: 'Enroll in Sequence', description: 'Add contact to a sequence', icon: 'zap' },
  add_tag: { label: 'Add Tag', description: 'Apply a tag to the contact', icon: 'tag' },
  create_deal: { label: 'Create Deal', description: 'Create a new deal', icon: 'handshake' },
}

export async function getAutomations(): Promise<{ data: Automation[]; error?: string }> {
  const supabase = createClient()
  const orgId = await getActiveOrgId()
  if (!orgId) return { data: [], error: 'No active organization' }

  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return { data: [], error: error.message }
  return { data: data || [] }
}

export async function createAutomation(automation: {
  name: string
  description?: string
  trigger_type: TriggerType
  trigger_config?: Record<string, unknown>
  actions: AutomationAction[]
}): Promise<{ data: Automation | null; error?: string }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: null, error: 'Not authenticated' }

  const orgId = await getActiveOrgId()
  if (!orgId) return { data: null, error: 'No active organization' }

  const { data, error } = await supabase
    .from('automations')
    .insert({
      user_id: session.user.id,
      org_id: orgId,
      name: automation.name,
      description: automation.description || null,
      trigger_type: automation.trigger_type,
      trigger_config: automation.trigger_config || {},
      actions: automation.actions,
      is_active: true,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data }
}

export async function updateAutomation(
  id: string,
  updates: Partial<Pick<Automation, 'name' | 'description' | 'trigger_type' | 'trigger_config' | 'actions' | 'is_active'>>
): Promise<{ error?: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('automations')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function deleteAutomation(id: string): Promise<{ error?: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('automations').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function getAutomationRuns(automationId: string): Promise<{ data: AutomationRun[]; error?: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('automation_runs')
    .select('*')
    .eq('automation_id', automationId)
    .order('executed_at', { ascending: false })
    .limit(50)

  if (error) return { data: [], error: error.message }
  return { data: data || [] }
}
