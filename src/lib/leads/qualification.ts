import type { Lead } from '@/types'

const FIT_QUESTION_IDS = new Set(['exposure', 'program', 'readiness', 'authority'])

export type LeadQualification = {
  intent: string | null
  landingSlug: string | null
  score: number | null
  scoreLabel: string | null
  qualified: boolean | null
  submittedAt: string | null
  outcome: string | null
  answers: { id: string; value: string }[]
  summaryLine: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/** Extract $1 pentest / landing qualification from custom.landing + notes. */
export function parseLeadQualification(lead: Pick<Lead, 'notes' | 'custom'>): LeadQualification | null {
  const landing = asRecord(lead.custom?.landing)
  const notes = lead.notes || ''
  const seenQuestions = new Set<string>()
  const answerLines = notes
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const match = line.match(/^([a-z_]+):\s*(.+)$/i)
      if (!match) return []
      const id = match[1].toLowerCase()
      // Only the four fit questions — ignore repeated Phone:/meta lines from merged notes.
      if (!FIT_QUESTION_IDS.has(id) || seenQuestions.has(id)) return []
      seenQuestions.add(id)
      return [{ id, value: match[2] }]
    })

  const summaryMatch = notes.match(/\[\$1 pentest application\]\s*([^\n]+)/i)
  const scoreFromNotes = summaryMatch?.[1]?.match(/(\d+)\s*\/\s*100/)
  const outcomeFromNotes = summaryMatch?.[1]?.match(/->\s*(\w+)/)?.[1] || null

  const score =
    typeof landing?.lead_score === 'number'
      ? landing.lead_score
      : scoreFromNotes
        ? Number(scoreFromNotes[1])
        : null
  const scoreLabel =
    typeof landing?.lead_score_label === 'string'
      ? landing.lead_score_label
      : summaryMatch?.[1]?.split('(')[0]?.trim() || null
  const qualified =
    typeof landing?.qualified === 'boolean'
      ? landing.qualified
      : outcomeFromNotes === 'qualified'
        ? true
        : outcomeFromNotes
          ? false
          : null

  const hasSignal =
    Boolean(landing && (landing.intent || landing.lead_score != null || landing.qualified != null)) ||
    Boolean(summaryMatch) ||
    answerLines.length > 0

  if (!hasSignal) return null

  return {
    intent: typeof landing?.intent === 'string' ? landing.intent : null,
    landingSlug: typeof landing?.landing_slug === 'string' ? landing.landing_slug : null,
    score: Number.isFinite(score) ? score : null,
    scoreLabel,
    qualified,
    submittedAt: typeof landing?.submitted_at === 'string' ? landing.submitted_at : null,
    outcome: outcomeFromNotes,
    answers: answerLines,
    summaryLine: summaryMatch?.[1]?.trim() || null,
  }
}

export function hasLeadQualification(lead: Pick<Lead, 'notes' | 'custom'>) {
  return Boolean(parseLeadQualification(lead))
}
