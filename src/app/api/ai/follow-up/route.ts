import { generateFollowUp } from '@/lib/api/ai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const followUpRequestSchema = z.object({
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  dealTitle: z.string().optional(),
  dealStage: z.string().optional(),
  lastEmailSubject: z.string().optional(),
  lastEmailSnippet: z.string().optional(),
  daysSinceLastContact: z.number().int().min(0),
  userName: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = followUpRequestSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const result = await generateFollowUp(validation.data)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('AI follow-up error:', error)
    return NextResponse.json(
      { error: 'Failed to generate follow-up' },
      { status: 500 }
    )
  }
}
