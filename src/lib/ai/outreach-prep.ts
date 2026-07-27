import type { Lead } from '@/types/leads'
import type { EmailEvidence } from './email-grounding'
import {
  findResearchIdentityConflicts,
  type ResearchIdentityConflict,
} from './research-identity'

export type HookTier =
  | 'product_decision'
  | 'authored_source'
  | 'owned_social'
  | 'secondary_source'
  | 'do_not_use'

export type SecurityPosture = 'pre_compliance' | 'already_compliant' | 'unknown'
export type InitialOfferMode = 'direct_pentest' | 'lead_magnet'
export type InitialOfferDelivery = 'direct' | 'offer_on_reply'

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
  identityConflicts: ResearchIdentityConflict[]
  offerMode: InitialOfferMode
  offerDelivery: InitialOfferDelivery
  offerName: string
  offerReason: string
  offerDetails: string[]
}

const PRODUCT_LANGUAGE =
  /\b(?:built|building|designed|design|product|platform|feature|workflow|agent|automation|integrates?|connects?|reads?|sends?|submits?|scores?|ranks?|schedules?|routes?|handles?|lets?|allows?|users?|customers?)\b/i
const AUTHORED_LANGUAGE =
  /\b(?:wrote|authored|published|said|explained|described|spoke|presented|appeared|interviewed|podcast|talk)\b/i
const SOCIAL_AUTHORSHIP_LANGUAGE = /\b(?:wrote|posted|published|shared)\b/i
const SOCIAL_ENGAGEMENT_LANGUAGE = /\b(?:liked|reshared|reposted|reacted|engaged)\b/i
const HOSPITALITY_LANGUAGE =
  /\b(?:restaurant|hospitality|hotel|server|waiter|waitress|host|busser|barback|kitchen|dining|reservation|food service)\b/i
const AI_AGENT_LANGUAGE = /\b(?:ai agent|agentic|copilot|voice agent|assistant)\b/i
const AGENT_ACTION_LANGUAGE =
  /\b(?:acts?|action|sends?|submits?|scores?|ranks?|routes?|schedules?|writes?|updates?|approves?|books?|orders?|payments?|transactions?|tools?|workflows?|automations?|apis?|integrates?|connects?|slack)\w*/i
const UNTRUSTED_INPUT_LANGUAGE =
  /\b(?:resume|candidate profile|profile|uploaded document|upload|pdf|email|text|sms|voice|call|chat|web page|public web|customer message|user input|inbound message)\w*/i
const JOB_TITLE_ONLY_LANGUAGE =
  /\b(?:is|serves as|works as|joined as)\b.{0,40}\b(?:cto|ceo|founder|cofounder|co-founder|president|director|vp|vice president|engineer)\b/i
const AI_MAGNET_LANGUAGE =
  /\b(?:we hack ai agents|ai agent|agent security|ai security)\b|\bai\b.{0,40}\b(?:agent|security|playbook|guide)\b/i

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

  if (
    JOB_TITLE_ONLY_LANGUAGE.test(item.fact) &&
    !PRODUCT_LANGUAGE.test(item.fact) &&
    !AUTHORED_LANGUAGE.test(item.fact)
  ) {
    return {
      fact: item.fact,
      sourceUrl: item.sourceUrl,
      tier: 'secondary_source',
      score: 10,
      usable: false,
      overclaimWarning: 'A job title is context, not a recognition hook. Use a sourced product decision instead.',
    }
  }

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
}): Pick<
  InitialOutreachPlan,
  'offerMode' | 'offerDelivery' | 'offerName' | 'offerReason' | 'offerDetails'
> {
  const { evidence, customContext, ctaType, securityPosture } = input
  const directOffer = {
    offerMode: 'direct_pentest' as const,
    offerDelivery: 'direct' as const,
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
  const actionTakingAiProduct =
    AI_AGENT_LANGUAGE.test(evidenceText) &&
    AGENT_ACTION_LANGUAGE.test(evidenceText) &&
    UNTRUSTED_INPUT_LANGUAGE.test(evidenceText)
  const aiMagnet = findMagnet(magnets, AI_MAGNET_LANGUAGE)
  const complianceMagnet = findMagnet(
    magnets,
    /\b(?:security review|compliance|soc ?2|kill your deals|pentest timing)\b/i,
  )

  if (actionTakingAiProduct && aiMagnet) {
    return {
      offerMode: 'lead_magnet',
      offerDelivery: 'offer_on_reply',
      offerName: aiMagnet.name,
      offerReason: 'Verified product facts describe an AI agent that takes actions after reading input controlled by people outside the company.',
      offerDetails: [
        `Offer the loaded lead magnet named exactly "${aiMagnet.name}".`,
        aiMagnet.ctaText ? `Its linked call to action is "${aiMagnet.ctaText}".` : '',
        'Do not attach it to the first cold email. Offer to send it after they reply.',
        'Ask for one short, playful reply phrase tied to their product or industry.',
        'Say there is no signup or call.',
        'Only mention its contents or completion time when those details appear in verified evidence.',
      ].filter(Boolean),
    }
  }

  if (securityPosture === 'pre_compliance' && complianceMagnet) {
    return {
      offerMode: 'lead_magnet',
      offerDelivery: 'offer_on_reply',
      offerName: complianceMagnet.name,
      offerReason: 'Verified evidence says the lead is before SOC 2 or a first enterprise security review.',
      offerDetails: [
        `Offer the loaded lead magnet named exactly "${complianceMagnet.name}".`,
        complianceMagnet.ctaText ? `Its linked call to action is "${complianceMagnet.ctaText}".` : '',
        'Do not attach it to the first cold email. Offer to send it after they reply.',
        'Say it is free and requires no signup or call.',
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
      offerDelivery: 'offer_on_reply',
      offerName: defaultMagnet.name,
      offerReason: 'The campaign has a generic default resource that does not depend on an unsupported compliance or AI-agent assumption.',
      offerDetails: [
        `Offer the loaded lead magnet named exactly "${defaultMagnet.name}".`,
        defaultMagnet.ctaText ? `Its linked call to action is "${defaultMagnet.ctaText}".` : '',
        'Do not attach it to the first cold email. Offer to send it after they reply.',
        'Say it is free and requires no signup or call.',
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
  const identityConflicts = findResearchIdentityConflicts(
    lead.contact_name,
    lead.research_sources,
  )
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
    identityConflicts,
    ...offer,
  }
}

const GENERIC_HOOK_TOKENS = new Set([
  'about',
  'after',
  'agent',
  'allows',
  'before',
  'built',
  'company',
  'connects',
  'customers',
  'designed',
  'founder',
  'helps',
  'platform',
  'product',
  'their',
  'there',
  'these',
  'they',
  'users',
  'with',
  'workflow',
])

function textTokens(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(' ')
      .filter(token => token.length >= 4),
  )
}

function distinctiveHookTokens(hook: RankedOutreachHook, lead: Lead): string[] {
  const excluded = textTokens(
    `${lead.contact_name} ${lead.company_name}`,
  )

  return [...textTokens(hook.fact)].filter(
    token => !excluded.has(token) && !GENERIC_HOOK_TOKENS.has(token),
  )
}

function firstEmailParagraph(body: string): string {
  return body
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .find(paragraph =>
      paragraph.length > 0 &&
      !/^(?:hi|hey|hello)\b[^.!?]*[,!]?\s*$/i.test(paragraph) &&
      !/^best,\s*/i.test(paragraph),
    ) || ''
}

export function draftUsesTopHook(input: {
  body: string
  evidenceUsed: string[]
  plan: InitialOutreachPlan
  lead: Lead
}): boolean {
  const { body, evidenceUsed, plan, lead } = input
  if (!plan.topHook) return false
  if (!evidenceUsed.includes(plan.topHook.fact)) return false

  const requiredTokens = distinctiveHookTokens(plan.topHook, lead)
  if (requiredTokens.length === 0) return false

  const openingTokens = textTokens(firstEmailParagraph(body))
  const bodyTokens = textTokens(body)
  const openingMatches = requiredTokens.filter(token => openingTokens.has(token)).length
  const totalMatches = requiredTokens.filter(token => bodyTokens.has(token)).length
  const requiredOpeningMatches = Math.min(2, requiredTokens.length)
  const requiredTotalMatches = Math.min(3, requiredTokens.length)

  return (
    openingMatches >= requiredOpeningMatches &&
    totalMatches >= requiredTotalMatches
  )
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
  const identityWarnings = plan.identityConflicts.length > 0
    ? plan.identityConflicts
        .map(conflict =>
          `- DO NOT USE ${conflict.sourceTitle}. It appears to refer to ${conflict.conflictingName}, not ${conflict.expectedName}.`,
        )
        .join('\n')
    : '- No conflicting identity was detected in the saved sources.'

  return `${hook}
Restaurant shared-experience hook allowed: ${plan.useRestaurantSharedExperience ? 'yes' : 'no'}

Identity check:
${identityWarnings}

Security posture: ${plan.securityPosture}
${postureFacts}

Selected offer mode: ${plan.offerMode}
Offer delivery: ${plan.offerDelivery}
Selected offer: ${plan.offerName}
Why it fits: ${plan.offerReason}
Offer facts and constraints:
${plan.offerDetails.map(detail => `- ${detail}`).join('\n')}`
}
