import { generateEmailDraft } from '@/lib/ai/novita'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const requestSchema = z.object({
  recipientName: z.string(),
  recipientEmail: z.string().optional(),
  recipientTitle: z.string().optional(),
  companyName: z.string().optional(),
  purpose: z.enum(['follow_up', 'intro', 'meeting_request', 'deal_update', 'thank_you']),
  additionalContext: z.string().optional(),
  senderName: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = requestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const result = await generateEmailDraft(validation.data)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Email draft error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate email draft' },
      { status: 500 }
    )
  }
}
