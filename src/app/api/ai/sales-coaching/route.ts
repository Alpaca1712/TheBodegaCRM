import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateJSON } from '@/lib/ai/anthropic'
import { z } from 'zod'

const requestSchema = z.object({
  leadId: z.string().uuid(),
})

interface EmailFeedback {
  gmail_message_id: string | null
  subject: string
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  strengths: string[]
  weaknesses: string[]
  rewrite_suggestion: string
}

interface CoachingReport {
  overall_grade: 'A' | 'B' | 'C' | 'D' | 'F'
  overall_summary: string
  mckenna_score: number
  hormozi_score: number
  strengths: string[]
  weaknesses: string[]
  email_feedback: EmailFeedback[]
  top_improvement: string
}

const SYSTEM_PROMPT = `You are an elite sales coach who evaluates cold outreach against two frameworks:

1. SAM MCKENNA'S "SHOW ME YOU KNOW ME" (SMYKM):
- Does the email show deep research about the recipient?
- Is the personal detail specific enough to be "almost creepy"?
- Does it open with "We've yet to be properly introduced"?
- Is the CTA interest-based (not just asking for time)?
- Is the email 80-150 words?
- No em dashes, no banned phrases, no bullet points?

2. ALEX HORMOZI'S $100M LEADS:
- Does it lead with value, not an ask?
- Is there a free resource/lead magnet offer?
- Is the value proposition specific to their situation?
- Does it follow the multi-touch sequence (initial, bump, value drop, channel switch)?
- Is the follow-up timing appropriate?

Grade each outbound email A-F and provide specific, actionable feedback.

Return JSON:
{
  "overall_grade": "A-F",
  "overall_summary": "2-3 sentences on the outreach quality",
  "mckenna_score": 1-10,
  "hormozi_score": 1-10,
  "strengths": ["what's working well"],
  "weaknesses": ["what needs improvement"],
  "email_feedback": [
    {
      "gmail_message_id": "id or null",
      "subject": "email subject",
      "grade": "A-F",
      "strengths": ["good things"],
      "weaknesses": ["bad things"],
      "rewrite_suggestion": "how to improve this specific email"
    }
  ],
  "top_improvement": "The single most impactful change to make"
}

RULES:
- Be brutally honest but constructive.
- Grade on the combined McKenna + Hormozi standard.
- A = exceptional, B = good, C = average, D = below average, F = needs complete rework.
- No em dashes in your output.
- Only evaluate OUTBOUND emails (skip inbound).`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const { leadId } = validation.data

    const [leadResult, emailsResult] = await Promise.all([
      supabase.from('leads').select('contact_name, company_name, type, stage, personal_details, smykm_hooks, attack_surface_notes').eq('id', leadId).single(),
      supabase.from('lead_emails').select('*').eq('lead_id', leadId).order('created_at', { ascending: true }),
    ])

    if (leadResult.error || !leadResult.data) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const lead = leadResult.data
    const emails = emailsResult.data || []

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No emails to analyze' }, { status: 400 })
    }

    const emailContext = emails.map((e, i) =>
      `[${i + 1}] ${e.direction === 'outbound' ? 'OUTBOUND' : 'INBOUND'} | ${e.email_type} | ${e.created_at}
gmail_message_id: ${e.gmail_message_id || 'none'}
Subject: ${e.subject}
Body:
${(e.body || '').slice(0, 2000)}`
    ).join('\n\n===\n\n')

    const report = await generateJSON<CoachingReport>(
      SYSTEM_PROMPT,
      `Coach my outreach to ${lead.contact_name} at ${lead.company_name} (${lead.type}).

Lead context:
- Personal details: ${lead.personal_details || 'None gathered'}
- SMYKM hooks: ${(lead.smykm_hooks || []).join('; ') || 'None'}
- Attack surface: ${lead.attack_surface_notes || 'None'}

=== EMAIL THREAD ===
${emailContext}`,
      { maxTokens: 4096, temperature: 0.4 }
    )

    return NextResponse.json(report)
  } catch (error) {
    console.error('Sales coaching error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate coaching report' },
      { status: 500 }
    )
  }
}
