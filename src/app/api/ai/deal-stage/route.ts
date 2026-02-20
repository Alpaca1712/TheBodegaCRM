import { suggestDealStage } from '@/lib/api/ai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const dealStageRequestSchema = z.object({
  dealTitle: z.string().min(1),
  currentStage: z.string().min(1),
  recentEmails: z.array(z.object({
    subject: z.string(),
    snippet: z.string(),
    date: z.string(),
  })).default([]),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = dealStageRequestSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const result = await suggestDealStage(validation.data)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('AI deal stage error:', error)
    return NextResponse.json(
      { error: 'Failed to suggest deal stage' },
      { status: 500 }
    )
  }
}
