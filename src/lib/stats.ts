import { db } from '@/lib/db'

export interface OverviewStats {
  leads: { total: number; by_stage: Record<string, number> }
  sequences: { active: number; live_enrollments: number; due_now: number }
  emails_7d: { sent: number; delivered: number; opened: number; bounced: number; replies: number }
  inbox: { unhandled: number }
}

export async function overviewStats(now = new Date()): Promise<OverviewStats> {
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString()
  const [leads, sequences, live, due, emails, inbox] = await Promise.all([
    db().from('leads').select('stage'),
    db().from('sequences').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db().from('sequence_enrollments').select('id', { count: 'exact', head: true }).in('status', ['active', 'paused']),
    db().from('sequence_enrollments').select('id', { count: 'exact', head: true }).eq('status', 'active').lte('next_step_due_at', now.toISOString()),
    db().from('emails').select('direction, status, opened_at').gte('created_at', since),
    db().from('emails').select('id', { count: 'exact', head: true }).eq('direction', 'inbound').is('handled_at', null),
  ])

  const byStage: Record<string, number> = {}
  for (const row of leads.data || []) byStage[row.stage] = (byStage[row.stage] || 0) + 1

  const emailStats = { sent: 0, delivered: 0, opened: 0, bounced: 0, replies: 0 }
  for (const row of emails.data || []) {
    if (row.direction === 'inbound') {
      emailStats.replies += 1
      continue
    }
    if (['sent', 'delivered', 'delivery_delayed', 'bounced', 'complained'].includes(row.status)) emailStats.sent += 1
    if (row.status === 'delivered') emailStats.delivered += 1
    if (row.opened_at) emailStats.opened += 1
    if (row.status === 'bounced') emailStats.bounced += 1
  }

  return {
    leads: { total: (leads.data || []).length, by_stage: byStage },
    sequences: { active: sequences.count ?? 0, live_enrollments: live.count ?? 0, due_now: due.count ?? 0 },
    emails_7d: emailStats,
    inbox: { unhandled: inbox.count ?? 0 },
  }
}
