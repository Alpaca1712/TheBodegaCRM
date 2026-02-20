import { summarizeEmail } from '@/lib/api/ai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const summarizeRequestSchema = z.object({
  subject: z.string().min(1),
  snippet: z.string().min(1),
  fromAddress: z.string().email(),
  contactName: z.string().optional(),
  dealTitle: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = summarizeRequestSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const result = await summarizeEmail(validation.data)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('AI summarize error:', error)
    return NextResponse.json(
      { error: 'Failed to summarize email' },
      { status: 500 }
    )
  }
}
