import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runCampaignSequence, GmailTokenExpiredError } from '@/lib/campaigns/sequence-runner'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'

const runSequenceSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const validation = runSequenceSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const result = await runCampaignSequence({
      supabase,
      campaignId: id,
      orgId,
      limit: validation.data.limit || 50,
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: error.message, code: 'TOKEN_EXPIRED' }, { status: 401 })
    }

    const code = typeof error === 'object' && error && 'code' in error ? error.code : null
    const status = code === 'NO_GMAIL_ACCOUNT' ? 400 : 500
    console.error('POST /api/campaigns/[id]/sequence/run failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run campaign sequence', code },
      { status },
    )
  }
}
