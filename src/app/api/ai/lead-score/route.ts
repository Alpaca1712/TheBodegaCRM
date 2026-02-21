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
  activities_count: z.number(),
  last_activity_date: z.string().optional(),
  deals_count: z.number(),
  deals_value: z.number(),
  days_since_created: z.number(),
  has_company: z.boolean(),
  tags_count: z.number(),
})

function computeLeadScore(data: z.infer<typeof requestSchema>): {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  signals: Array<{ label: string; impact: 'positive' | 'negative' | 'neutral'; points: number }>
} {
  let score = 50
  const signals: Array<{ label: string; impact: 'positive' | 'negative' | 'neutral'; points: number }> = []

  if (data.email) {
    score += 10
    signals.push({ label: 'Has email address', impact: 'positive', points: 10 })
  } else {
    score -= 10
    signals.push({ label: 'No email address', impact: 'negative', points: -10 })
  }

  if (data.phone) {
    score += 5
    signals.push({ label: 'Has phone number', impact: 'positive', points: 5 })
  }

  if (data.title) {
    const seniorTitles = ['ceo', 'cto', 'cfo', 'coo', 'vp', 'director', 'head', 'founder', 'president', 'owner', 'partner']
    const hasTitle = seniorTitles.some(t => data.title!.toLowerCase().includes(t))
    if (hasTitle) {
      score += 15
      signals.push({ label: `Senior title: ${data.title}`, impact: 'positive', points: 15 })
    } else {
      score += 5
      signals.push({ label: 'Has job title', impact: 'positive', points: 5 })
    }
  }

  if (data.has_company) {
    score += 8
    signals.push({ label: 'Associated with a company', impact: 'positive', points: 8 })
  }

  if (data.activities_count > 5) {
    score += 15
    signals.push({ label: `High engagement (${data.activities_count} activities)`, impact: 'positive', points: 15 })
  } else if (data.activities_count > 0) {
    score += 8
    signals.push({ label: `${data.activities_count} activities logged`, impact: 'positive', points: 8 })
  } else {
    score -= 5
    signals.push({ label: 'No activity logged', impact: 'negative', points: -5 })
  }

  if (data.last_activity_date) {
    const daysSince = Math.floor((Date.now() - new Date(data.last_activity_date).getTime()) / 86400000)
    if (daysSince <= 7) {
      score += 10
      signals.push({ label: 'Active in the last week', impact: 'positive', points: 10 })
    } else if (daysSince <= 30) {
      score += 5
      signals.push({ label: 'Active in the last month', impact: 'positive', points: 5 })
    } else {
      score -= 5
      signals.push({ label: `No activity in ${daysSince} days`, impact: 'negative', points: -5 })
    }
  }

  if (data.deals_count > 0) {
    score += 10
    signals.push({ label: `${data.deals_count} associated deal${data.deals_count > 1 ? 's' : ''}`, impact: 'positive', points: 10 })
  }

  if (data.deals_value > 10000) {
    score += 10
    signals.push({ label: `$${data.deals_value.toLocaleString()} in pipeline`, impact: 'positive', points: 10 })
  } else if (data.deals_value > 0) {
    score += 5
    signals.push({ label: `$${data.deals_value.toLocaleString()} in pipeline`, impact: 'positive', points: 5 })
  }

  if (data.source && ['referral', 'partner'].includes(data.source.toLowerCase())) {
    score += 10
    signals.push({ label: `High-quality source: ${data.source}`, impact: 'positive', points: 10 })
  }

  if (data.notes && data.notes.length > 50) {
    score += 5
    signals.push({ label: 'Detailed notes', impact: 'positive', points: 5 })
  }

  if (data.tags_count > 0) {
    score += 3
    signals.push({ label: `${data.tags_count} tag${data.tags_count > 1 ? 's' : ''} applied`, impact: 'positive', points: 3 })
  }

  score = Math.max(0, Math.min(100, score))

  const grade: 'A' | 'B' | 'C' | 'D' | 'F' =
    score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F'

  return { score, grade, signals: signals.sort((a, b) => b.points - a.points) }
}

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

    const result = computeLeadScore(validation.data)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Lead scoring error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute lead score' },
      { status: 500 }
    )
  }
}
