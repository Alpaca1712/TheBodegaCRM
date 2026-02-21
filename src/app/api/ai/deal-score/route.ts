import { generateDealScore } from '@/lib/ai/novita'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const requestSchema = z.object({
  title: z.string(),
  value: z.number().nullable(),
  stage: z.string(),
  probability: z.number().nullable(),
  expected_close_date: z.string().nullable(),
  notes: z.string().nullable(),
  days_in_stage: z.number(),
  activities_count: z.number(),
  last_activity_date: z.string().optional(),
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

    const result = await generateDealScore(validation.data)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Deal score error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to score deal' },
      { status: 500 }
    )
  }
}
