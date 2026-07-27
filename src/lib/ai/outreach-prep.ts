import type { Lead } from '@/types/leads'
import type { EmailEvidence } from './email-grounding'

export type HookTier =
  | 'product_decision'
  | 'authored_source'
  | 'owned_social'
  | 'secondary_source'
  | 'do_not_use'

export type SecurityPosture = 'pre_compliance' | 'already_compliant' | 'unknown'
export type InitialOfferMode = 'direct_pentest' | 'lead_magnet'

export interface RankedOutreachHook {
  fact: string
  sourceUrl?: string
  tier: HookTier
  score: number
  usable: boolean
  overclaimWarning: string
}

export interface LoadedLeadMagnet {
  name: string
  ctaText: string
  isDefault: boolean
}

export interface InitialOutreachPlan {
  rankedHooks: RankedOutreachHook[]
  topHook: RankedOutreachHook | null
  securityPosture: SecurityPosture
  securityPostureFacts: string[]
  useRestaurantSharedExperience: boolean
  offerMode: InitialOfferMode
  offerName: string
  offerReason: string
  offerDetails: string[]
}

const PRODUCT_LANGUAGE =
  /\b(?:built|building|designed|design|product|platform|feature|workflow|agent|automation|integrates?|connects?|routes?|handles?|lets?|allows?|users?|customers?)\b/i
const AUTHORED_LANGUAGE =
  /\b(?:wrote|authored|published|said|explained|described|spoke|presented|appeared|interviewed|podcast|talk)\b/i
const SOCIAL_AUTHORSHIP_LANGUAGE = /\b(?:wrote|posted|published|shared)\b/i
const SOCIAL_ENGAGEMENT_LANGUAGE = /\b(?:liked|reshared|reposted|reacted|engaged)\b/i
const HOSPITALITY_LANGUAGE =
  /\b(?:restaurant|hospitality|hotel|server|waiter|waitress|host|busser|barback|kitchen|dining|reservation|food service)\b/i
const TECHNICAL_ROLE = /\b(?:cto|technical|engineer|engineering|developer|founder|product)\b/i
const AI_AGENT_LANGUAGE = /\b(?:ai agent|agentic|copilot|voice agent|assistant)\b/i
const AGENT_ACTION_LANGUAGE =
  /\b(?:action|tool|workflow|automation|api|integrat|connect|email|text|sms|voice|chat|slack|book|order|payment|transaction)\w*/i

const PRE_COMPLIANCE_LANGUAGE =
  /\b(?:pre[- ]?soc ?2|not (?:yet )?soc ?2|without soc ?2|working toward soc ?2|preparing for (?:their )?first (?:enterprise )?security review|first enterprise security review|has not (?:yet )?(?:completed|passed) (?:a )?(?:pentest|security review))\b/i
const COMPLIANT_LANGUAGE =
  /\b(?:soc ?2(?: type (?:i|ii|1|2))? (?:certified|compliant|complete|completed|attested)|completed (?:a )?(?:soc ?2|pentest|penetration test|security review)|passed (?:an? )?(?:enterprise )?security review|iso ?27001 (?:certified|compliant))\b/i

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function isSocialUrl(url?: string): boolean {
  if (!url) return false
  return /(?:linkedin\.com|x\.com|twitter\.com|facebook\.com|instagram\.com)/i.test(url)
}

function hostname(value?: string | null): string {
  if (!value) return ''
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

function meaningfulNameTokens(value: string | null | undefined): string[] {
  return normalize(value || '')
    .split(' ')
    .filter(token => token.length >= 4 && !['company', 'platform', 'systems'].includes(token))
}

function isFirstPartyProductFact(item: EmailEvidence, lead: Lead): boolean {
  if (!item.sourceUrl || !PRODUCT_LANGUAGE.test(item.fact)) return false

  const fact = normalize(item.fact)
  const company = normalize(lead.company_name)
  const product = normalize(lead.product_name || '')
  const sourceHost = hostname(item.sourceUrl)
  const companyHost = hostname(lead.company_website)
  const looksFirstParty =
    Boolean(companyHost && (sourceHost === companyHost || sourceHost.endsWith(`.${companyHost}`))) ||
    meaningfulNameTokens(lead.company_name).some(token => sourceHost.includes(token)) ||
    meaningfulNameTokens(lead.product_name).some(token => sourceHost.includes(token))

  return looksFirstParty && Boolean(
    (company && fact.includes(company)) ||
    (product && fact.includes(product)) ||
    AI_AGENT_LANGUAGE.test(item.fact)
  )
}

function rankHook(item: EmailEvidence, lead: Lead): RankedOutreachHook {
  const social = isSocialUrl(item.sourceUrl)

  if (social && SOCIAL_ENGAGEMENT_LANGUAGE.test(item.fact)) {
    return {
      fact: item.fact,
      sourceUrl: item.sourceUrl,
      tier: 'do_not_use',
      score: 0,
      usable: false,
      overclaimWarning: 'This only shows social engagement. Do not imply the lead authored or endorsed it.',
    }
  }

  if (isFirstPartyProductFact(item, lead)) {
    return {
      fact: item.fact,
      sourceUrl: item.sourceUrl,
      tier: 'product_decision',
      score: 400,
      usable: true,
      overclaimWarning: 'Describe only the product decision in this fact. Do not claim you used or tested the product.',
    }
  }

  if (AUTHORED_LANGUAGE.test(item.fact) && !social) {
    return {
      fact: item.fact,
      sourceUrl: item.sourceUrl,
      tier: 'authored_source',
      score: 300,
      usable: true,
      overclaimWarning: 'Use only the attributed statement in this fact. Do not expand it into a broader belief.',
    }
  }

  if (social && SOCIAL_AUTHORSHIP_LANGUAGE.test(item.fact)) {
    return {
      fact: item.fact,
      sourceUrl: item.sourceUrl,
      tier: 'owned_social',
      score: 200,
      usable: true,
      overclaimWarning: 'The source supports authorship only as stated. Do not imply more than the cited post says.',
    }
  }

  return {
    fact: item.fact,
    sourceUrl: item.sourceUrl,
    tier: 'secondary_source',
    score: 100,
    usable: false,
    overclaimWarning: 'This is not a strong recognition hook. Keep it out of the opening unless a primary source confirms it.',
  }
}

export function rankOutreachHooks(
  evidence: EmailEvidence[],
  lead: Lead,
): RankedOutreachHook[] {
  return evidence
    .filter(item => item.sourceUrl && item.label.startsWith('Verified research:'))
    .map(item => rankHook(item, lead))
    .sort((a, b) => b.score - a.score)
}

export function parseLoadedLeadMagnets(customContext?: string): LoadedLeadMagnet[] {
  if (!customContext) return []

  const magnets: LoadedLeadMagnet[] = []
  const pattern = /^-\s+(.+?)(\s+\(default\))?;\s+linked CTA text:\s*(.+)$/gim
  let match: RegExpExecArray | null

  while ((match = pattern.exec(customContext)) !== null) {
    magnets.push({
      name: match[1].trim(),
      isDefault: Boolean(match[2]),
      ctaText: match[3].trim(),
    })
  }

  return magnets
}

function getSecurityPosture(evidence: EmailEvidence[]): {
  posture: SecurityPosture
  facts: string[]
} {
  const trusted = evidence.filter(
    item =>
      item.label.startsWith('Verified research:') ||
      item.label === 'Manual CRM note',
  )
  const preCompliance = trusted.filter(item => PRE_COMPLIANCE_LANGUAGE.test(item.fact))
  if (preCompliance.length > 0) {
    return {
      posture: 'pre_compliance',
      facts: preCompliance.map(item => item.fact),
    }
  }

  const compliant = trusted.filter(item => COMPLIANT_LANGUAGE.test(item.fact))
  if (compliant.length > 0) {
    return {
      posture: 'already_compliant',
      facts: compliant.map(item => item.fact),
    }
  }

  return { posture: 'unknown', facts: [] }
}

function findMagnet(
  magnets: LoadedLeadMagnet[],
  pattern: RegExp,
): LoadedLeadMagnet | undefined {
  return magnets.find(magnet => pattern.test(`${magnet.name} ${magnet.ctaText}`))
}

function getOfferPlan(input: {
  lead: Lead
  evidence: EmailEvidence[]
  customContext?: string
  ctaType: 'mckenna' | 'hormozi'
  securityPosture: SecurityPosture
}): Pick<InitialOutreachPlan, 'offerMode' | 'offerName' | 'offerReason' | 'offerDetails'> {
  const { lead, evidence, customContext, ctaType, securityPosture } = input
  const directOffer = {
    offerMode: 'direct_pentest' as const,
    offerName: 'Free Pigeon pentest',
    offerReason: securityPosture === 'already_compliant'
      ? 'The lead has explicit compliance or prior-review evidence, so position the pentest as product differentiation rather than catch-up.'
      : 'Use the core offer without inventing or mismatching a resource.',
    offerDetails: [
      'The pentest is free.',
      'Pigeon delivers the findings within 48 hours.',
      'The CTA is a simple reply, never a call or calendar link.',
    ],
  }

  if (ctaType === 'mckenna') return directOffer

  const magnets = parseLoadedLeadMagnets(customContext)
  if (magnets.length === 0 || securityPosture === 'already_compliant') return directOffer

  const evidenceText = evidence
    .filter(
      item =>
        item.label.startsWith('CRM ') ||
        item.label.startsWith('Verified research:') ||
        item.label === 'Manual CRM note',
    )
    .map(item => item.fact)
    .join(' ')
  const technicalAiLead =
    TECHNICAL_ROLE.test(lead.contact_title || '') &&
    AI_AGENT_LANGUAGE.test(evidenceText) &&
    AGENT_ACTION_LANGUAGE.test(evidenceText)
  const aiMagnet = findMagnet(magnets, /\b(?:ai agent|hack ai|agent security|ai security)\b/i)
  const complianceMagnet = findMagnet(
    magnets,
    /\b(?:security review|compliance|soc ?2|kill your deals|pentest timing)\b/i,
  )

  if (technicalAiLead && aiMagnet) {
    return {
      offerMode: 'lead_magnet',
      offerName: aiMagnet.name,
      offerReason: 'The lead is technical and the verified evidence describes an AI agent that can take real actions.',
      offerDetails: [
        `Offer the loaded lead magnet named exactly "${aiMagnet.name}".`,
        aiMagnet.ctaText ? `Its linked call to action is "${aiMagnet.ctaText}".` : '',
        'Say it is attached, free, and has no signup or call.',
        'Only mention its contents or completion time when those details appear in verified evidence.',
      ].filter(Boolean),
    }
  }

  if (securityPosture === 'pre_compliance' && complianceMagnet) {
    return {
      offerMode: 'lead_magnet',
      offerName: complianceMagnet.name,
      offerReason: 'Verified evidence says the lead is before SOC 2 or a first enterprise security review.',
      offerDetails: [
        `Offer the loaded lead magnet named exactly "${complianceMagnet.name}".`,
        complianceMagnet.ctaText ? `Its linked call to action is "${complianceMagnet.ctaText}".` : '',
        'Say it is attached, free, and has no signup or call.',
        'Do not imply the lead is behind or unprepared.',
      ].filter(Boolean),
    }
  }

  const defaultMagnet = magnets.find(magnet => magnet.isDefault)
  if (
    defaultMagnet &&
    !/\b(?:security review|compliance|soc ?2|kill your deals|pentest timing|ai agent|hack ai|agent security|ai security)\b/i
      .test(`${defaultMagnet.name} ${defaultMagnet.ctaText}`)
  ) {
    return {
      offerMode: 'lead_magnet',
      offerName: defaultMagnet.name,
      offerReason: 'The campaign has a generic default resource that does not depend on an unsupported compliance or AI-agent assumption.',
      offerDetails: [
        `Offer the loaded lead magnet named exactly "${defaultMagnet.name}".`,
        defaultMagnet.ctaText ? `Its linked call to action is "${defaultMagnet.ctaText}".` : '',
        'Say it is attached, free, and has no signup or call.',
      ].filter(Boolean),
    }
  }

  return directOffer
}

export function prepareInitialOutreach(input: {
  lead: Lead
  evidence: EmailEvidence[]
  customContext?: string
  ctaType: 'mckenna' | 'hormozi'
}): InitialOutreachPlan {
  const { lead, evidence, customContext, ctaType } = input
  const rankedHooks = rankOutreachHooks(evidence, lead)
  const security = getSecurityPosture(evidence)
  const evidenceText = evidence
    .filter(
      item =>
        item.label.startsWith('CRM ') ||
        item.label.startsWith('Verified research:') ||
        item.label === 'Manual CRM note',
    )
    .map(item => item.fact)
    .join(' ')
  const offer = getOfferPlan({
    lead,
    evidence,
    customContext,
    ctaType,
    securityPosture: security.posture,
  })

  return {
    rankedHooks,
    topHook: rankedHooks.find(hook => hook.usable) || null,
    securityPosture: security.posture,
    securityPostureFacts: security.facts,
    useRestaurantSharedExperience: HOSPITALITY_LANGUAGE.test(evidenceText),
    ...offer,
  }
}

export function formatInitialOutreachPlan(plan: InitialOutreachPlan): string {
  const hook = plan.topHook
    ? [
        `Top safe hook: ${plan.topHook.fact}`,
        `Hook tier: ${plan.topHook.tier}`,
        plan.topHook.sourceUrl ? `Hook source: ${plan.topHook.sourceUrl}` : null,
        `Overclaim warning: ${plan.topHook.overclaimWarning}`,
      ].filter(Boolean).join('\n')
    : 'Top safe hook: none. Open with a concrete role or product observation from VERIFIED EVIDENCE, without personal biography.'

  const postureFacts = plan.securityPostureFacts.length > 0
    ? plan.securityPostureFacts.map(fact => `- ${fact}`).join('\n')
    : '- No explicit SOC 2, pentest, or enterprise-review status is verified. Do not guess.'

  return `${hook}
Restaurant shared-experience hook allowed: ${plan.useRestaurantSharedExperience ? 'yes' : 'no'}

Security posture: ${plan.securityPosture}
${postureFacts}

Selected offer mode: ${plan.offerMode}
Selected offer: ${plan.offerName}
Why it fits: ${plan.offerReason}
Offer facts and constraints:
${plan.offerDetails.map(detail => `- ${detail}`).join('\n')}`
}
