import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteLeadCampaignArtifacts({
  orgId,
  leadIds,
}: {
  orgId: string
  leadIds: string[]
}) {
  const ids = Array.from(new Set(leadIds.filter(Boolean)))
  if (ids.length === 0) return

  const admin = createAdminClient()
  const cleanupTables = [
    'campaign_events',
    'campaign_attribution_events',
    'campaign_enrollments',
  ]

  const results = await Promise.all(
    cleanupTables.map((table) => (
      admin
        .from(table)
        .delete()
        .eq('org_id', orgId)
        .in('lead_id', ids)
    )),
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) throw failed.error
}
