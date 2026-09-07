import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyLeadToken } from '@/lib/leads/tokens'
import { stopEnrollmentsForLead } from '@/lib/sequences/enrollments'

async function unsubscribe(token: string | null) {
  const leadId = verifyLeadToken(token)
  if (!leadId) return false
  const now = new Date().toISOString()
  const { data } = await db()
    .from('leads')
    .update({ do_not_contact: true, unsubscribed_at: now, stage: 'unsubscribed' })
    .eq('id', leadId)
    .select('id')
    .maybeSingle()
  if (!data) return false
  await stopEnrollmentsForLead(leadId, 'unsubscribed', 'Unsubscribed via link')
  return true
}

function page(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:15vh auto;padding:0 24px;color:#111;line-height:1.5}h1{font-size:20px}</style></head>
<body><h1>${title}</h1><p>${body}</p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  )
}

/** Link clicked from an email footer / mail client unsubscribe UI. */
export async function GET(request: NextRequest) {
  const ok = await unsubscribe(request.nextUrl.searchParams.get('token'))
  return ok
    ? page("You're unsubscribed", "You won't receive any more emails from us. Sorry for the noise.")
    : page('Link expired', 'This unsubscribe link is not valid. Reply to the email and we will remove you manually.', 400)
}

/** RFC 8058 one-click unsubscribe (List-Unsubscribe-Post). */
export async function POST(request: NextRequest) {
  const ok = await unsubscribe(request.nextUrl.searchParams.get('token'))
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 })
}
