import { generateContactInsights } from '@/lib/ai/novita'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const requestSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  status: z.string(),
  source: z.string().optional(),
  notes: z.string().optional(),
  company_name: z.string().optional(),
  activities_count: z.number(),
  last_activity_date: z.string().optional(),
  deals_count: z.number(),
  deals_value: z.number(),
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

    const result = await generateContactInsights(validation.data)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Contact insights error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate insights' },
      { status: 500 }
    )
  }
}
