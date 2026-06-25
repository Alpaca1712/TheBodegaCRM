import type { Lead } from '@/types/leads'

export interface ChallengeProfile {
  companyDescription: string | null
  requirements: string | null
  useCase: string | null
  authority: string | null
  timeline: string | null
  budget: string | null
  score: number | null
  scoreLabel: string | null
  reasons: string[]
  hooks: string[]
  submittedAt: string | null
  updatedAt: string | null
}

const EMPTY_PROFILE: ChallengeProfile = {
  companyDescription: null,
  requirements: null,
  useCase: null,
  authority: null,
  timeline: null,
  budget: null,
  score: null,
  scoreLabel: null,
  reasons: [],
  hooks: [],
  submittedAt: null,
  updatedAt: null,
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {}
}

function cleanString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function firstString(records: UnknownRecord[], keys: string[]) {
  for (const record of records) {
    for (const key of keys) {
      const value = cleanString(record[key])
      if (value) return value
    }
  }
  return null
}

function firstNumber(records: UnknownRecord[], keys: string[]) {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key]
      if (typeof value === 'number' && Number.isFinite(value)) return clampScore(value)
      if (typeof value === 'string') {
        const match = value.match(/\d{1,3}/)
        if (match) return clampScore(Number(match[0]))
      }
    }
  }
  return null
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanString(item))
      .filter((item): item is string => Boolean(item))
  }
  const text = cleanString(value)
  if (!text) return []
  return text
    .split(/\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function firstStringArray(records: UnknownRecord[], keys: string[]) {
  for (const record of records) {
    for (const key of keys) {
      const value = toStringArray(record[key])
      if (value.length > 0) return value
    }
  }
  return []
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const clean = cleanString(value)
    if (!clean) continue
    const key = clean.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(clean)
  }
  return result
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function profileRecords(input: UnknownRecord) {
  const metadata = asRecord(input.metadata)
  return [
    input,
    metadata,
    asRecord(metadata.application),
    asRecord(metadata.challenge),
    asRecord(metadata.profile),
    asRecord(metadata.answers),
    asRecord(metadata.qualification),
    asRecord(metadata.lead),
  ]
}

export function parseChallengeProfileText(text: string | null | undefined): Partial<ChallengeProfile> {
  const lines = (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return {}

  const parsed: Partial<ChallengeProfile> = {}
  const reasons: string[] = []
  const hooks: string[] = []

  for (const line of lines) {
    const scoreMatch = line.match(/(?:lead\s+score|icp|score)\s*:?\s*(\d{1,3})(?:\s*\/\s*100)?(?:\s*\(([^)]+)\))?/i)
    if (scoreMatch) {
      parsed.score = clampScore(Number(scoreMatch[1]))
      if (scoreMatch[2]) parsed.scoreLabel = scoreMatch[2].trim()
      continue
    }

    const dateMatch = line.match(/^(submitted|updated).+?(\d{4}-\d{2}-\d{2}T\S+)/i)
    if (dateMatch?.[1]?.toLowerCase() === 'submitted') parsed.submittedAt = dateMatch[2]
    if (dateMatch?.[1]?.toLowerCase() === 'updated') parsed.updatedAt = dateMatch[2]
    if (dateMatch) continue

    const kv = line.match(/^([^:]+):\s*(.+)$/)
    if (kv) {
      const key = kv[1].trim().toLowerCase().replace(/[_-]/g, ' ')
      const value = kv[2].trim()
      if (['authority', 'decision authority', 'decision maker', 'sponsor', 'buyer role'].includes(key)) parsed.authority = value
      else if (['requirements', 'challenge requirements', 'pentest requirements', 'security requirements', 'need', 'primary need'].includes(key)) parsed.requirements = value
      else if (['use case', 'ai use case', 'agent workflow', 'workflow', 'product context'].includes(key)) parsed.useCase = value
      else if (['timeline', 'urgency', 'start timeline', 'decision timeline'].includes(key)) parsed.timeline = value
      else if (['budget', 'budget range'].includes(key)) parsed.budget = value
      else if (['company', 'company description', 'company context'].includes(key)) parsed.companyDescription = value
      else if (['reason', 'fit reason', 'icp reason'].includes(key)) reasons.push(value)
      else hooks.push(`${kv[1].trim()}: ${value}`)
      continue
    }

    if (/^(submitted|updated)\s+via/i.test(line)) continue
    if (!parsed.requirements) parsed.requirements = line
    else hooks.push(line)
  }

  parsed.reasons = reasons
  parsed.hooks = hooks
  return parsed
}

export function normalizeLandingChallengeProfile(input: UnknownRecord): ChallengeProfile {
  const records = profileRecords(input)
  const notesProfile = parseChallengeProfileText(cleanString(input.notes))
  const profile: ChallengeProfile = {
    companyDescription: firstString(records, [
      'company_description',
      'companyDescription',
      'company_context',
      'companyContext',
      'product_description',
      'productDescription',
    ]) || notesProfile.companyDescription || null,
    requirements: firstString(records, [
      'requirements',
      'challenge_requirements',
      'challengeRequirements',
      'pentest_requirements',
      'pentestRequirements',
      'security_requirements',
      'securityRequirements',
      'primary_need',
      'primaryNeed',
      'pain',
      'pain_point',
      'painPoint',
      'scope',
    ]) || notesProfile.requirements || null,
    useCase: firstString(records, [
      'use_case',
      'useCase',
      'ai_use_case',
      'aiUseCase',
      'agent_workflow',
      'agentWorkflow',
      'workflow',
      'product_context',
      'productContext',
      'application_context',
      'applicationContext',
    ]) || notesProfile.useCase || null,
    authority: firstString(records, [
      'authority',
      'decision_authority',
      'decisionAuthority',
      'decision_maker',
      'decisionMaker',
      'buyer_role',
      'buyerRole',
      'sponsor',
      'signer',
    ]) || notesProfile.authority || null,
    timeline: firstString(records, [
      'timeline',
      'urgency',
      'start_timeline',
      'startTimeline',
      'decision_timeline',
      'decisionTimeline',
      'launch_timeline',
      'launchTimeline',
      'when',
    ]) || notesProfile.timeline || null,
    budget: firstString(records, [
      'budget',
      'budget_range',
      'budgetRange',
      'investment_range',
      'investmentRange',
    ]) || notesProfile.budget || null,
    score: firstNumber(records, ['lead_score', 'leadScore', 'icp_score', 'icpScore', 'score']) ?? notesProfile.score ?? null,
    scoreLabel: firstString(records, [
      'score_label',
      'scoreLabel',
      'lead_score_label',
      'leadScoreLabel',
      'fit',
      'fit_label',
      'fitLabel',
    ]) || notesProfile.scoreLabel || null,
    reasons: uniqueStrings([
      ...firstStringArray(records, [
        'icp_reasons',
        'icpReasons',
        'fit_reasons',
        'fitReasons',
        'reasons',
        'qualification_reasons',
        'qualificationReasons',
        'lead_score_reasons',
        'leadScoreReasons',
      ]),
      ...(notesProfile.reasons || []),
    ]),
    hooks: uniqueStrings([
      ...firstStringArray(records, ['smykm_hooks', 'smykmHooks', 'hooks', 'personalization_hooks', 'personalizationHooks']),
      ...(notesProfile.hooks || []),
    ]),
    submittedAt: firstString(records, ['submitted_at', 'submittedAt', 'form_submitted_at', 'formSubmittedAt']) || notesProfile.submittedAt || null,
    updatedAt: firstString(records, ['updated_at', 'updatedAt', 'completed_at', 'completedAt', 'application_completed_at', 'applicationCompletedAt']) || notesProfile.updatedAt || null,
  }

  return profile
}

export function hasChallengeProfile(profile: ChallengeProfile) {
  return Boolean(
    profile.companyDescription ||
      profile.requirements ||
      profile.useCase ||
      profile.authority ||
      profile.timeline ||
      profile.budget ||
      profile.score != null ||
      profile.reasons.length > 0 ||
      profile.hooks.length > 0,
  )
}

function buildChallengeSection(profile: ChallengeProfile) {
  const lines = [
    profile.requirements && `Requirements: ${profile.requirements}`,
    profile.useCase && `Use case: ${profile.useCase}`,
    profile.authority && `Decision authority: ${profile.authority}`,
    profile.timeline && `Timeline: ${profile.timeline}`,
    profile.budget && `Budget: ${profile.budget}`,
  ].filter(Boolean)

  return lines.length > 0 ? lines.join('\n') : null
}

export function challengeProfileToAttackSurfaceNotes(profile: ChallengeProfile) {
  return buildChallengeSection(profile)
}

function mergeValues(existing: string[] | null | undefined, incoming: string[]) {
  return uniqueStrings([...(existing || []), ...incoming])
}

export function buildLeadProfilePatchFromChallenge(
  profile: ChallengeProfile,
  existing?: Partial<Pick<Lead, 'company_description' | 'attack_surface_notes' | 'icp_reasons' | 'smykm_hooks' | 'icp_score' | 'priority'>>,
) {
  const patch: Record<string, unknown> = {}

  if (profile.companyDescription) patch.company_description = profile.companyDescription
  if (profile.score != null) patch.icp_score = profile.score

  const profileReasons = uniqueStrings([
    ...profile.reasons,
    profile.scoreLabel ? `Fit: ${profile.scoreLabel}` : null,
    profile.authority ? `Authority: ${profile.authority}` : null,
    profile.requirements ? `Need: ${profile.requirements}` : null,
  ])
  if (profileReasons.length > 0) {
    patch.icp_reasons = mergeValues(existing?.icp_reasons, profileReasons)
  }

  const profileHooks = uniqueStrings([
    ...profile.hooks,
    profile.requirements ? `Challenge need: ${profile.requirements}` : null,
    profile.useCase ? `AI use case: ${profile.useCase}` : null,
    profile.timeline ? `Timing: ${profile.timeline}` : null,
  ])
  if (profileHooks.length > 0) {
    patch.smykm_hooks = mergeValues(existing?.smykm_hooks, profileHooks).slice(0, 8)
  }

  const challengeSection = buildChallengeSection(profile)
  if (challengeSection) {
    patch.attack_surface_notes = challengeSection
  }

  if (profile.score != null) {
    patch.priority = profile.score >= 80 ? 'high' : profile.score >= 50 ? 'medium' : 'low'
  }

  return patch
}

export function shouldTreatNotesAsChallengeProfile(notes: string | null | undefined) {
  if (!notes) return false
  return /rocoto.*challenge|challenge application|lead score|(^|\n)\s*authority\s*:|decision authority|pentest requirements/i.test(notes)
}

export function getLeadChallengeProfile(lead: Lead): ChallengeProfile | null {
  const profileFromNotes = parseChallengeProfileText(lead.notes)
  const profileFromAttackSurface = parseChallengeProfileText(lead.attack_surface_notes)
  const hasLandingSignal =
    lead.source_type === 'website' ||
    /challenge|landing|rocoto|pentest/i.test(lead.source || '') ||
    shouldTreatNotesAsChallengeProfile(lead.notes) ||
    shouldTreatNotesAsChallengeProfile(lead.attack_surface_notes)

  if (!hasLandingSignal) return null

  const profile: ChallengeProfile = {
    ...EMPTY_PROFILE,
    companyDescription: lead.company_description || profileFromNotes.companyDescription || null,
    requirements: profileFromAttackSurface.requirements || profileFromNotes.requirements || null,
    useCase: profileFromAttackSurface.useCase || profileFromNotes.useCase || null,
    authority: profileFromAttackSurface.authority || profileFromNotes.authority || null,
    timeline: profileFromAttackSurface.timeline || profileFromNotes.timeline || null,
    budget: profileFromAttackSurface.budget || profileFromNotes.budget || null,
    score: lead.icp_score ?? profileFromNotes.score ?? profileFromAttackSurface.score ?? null,
    scoreLabel: profileFromNotes.scoreLabel || profileFromAttackSurface.scoreLabel || null,
    reasons: uniqueStrings([...(lead.icp_reasons || []), ...(profileFromNotes.reasons || []), ...(profileFromAttackSurface.reasons || [])]),
    hooks: uniqueStrings([...(lead.smykm_hooks || []), ...(profileFromNotes.hooks || []), ...(profileFromAttackSurface.hooks || [])]),
    submittedAt: profileFromNotes.submittedAt || profileFromAttackSurface.submittedAt || null,
    updatedAt: profileFromNotes.updatedAt || profileFromAttackSurface.updatedAt || null,
  }

  return hasChallengeProfile(profile) ? profile : null
}
