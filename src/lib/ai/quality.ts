export const BANNED_PHRASES = [
  'the question nobody\'s asking',
  'in today\'s landscape',
  'at the intersection of',
  'game-changer',
  'revolutionize',
  'I hope this finds you well',
  'I came across your',
  'I was impressed by',
  'I noticed that',
  'I wanted to reach out',
  'I\'d love to connect',
  'fascinating intersection',
  'fascinating attack surface',
  'fun contrast',
  'which creates a fascinating',
  'perfect storm',
  'creates a perfect',
  'massive attack surface',
  'across all',
  'across your',
  'just checking in',
  'circling back',
  'wanted to follow up',
  'bumping this',
  'inspired by',
]

const LOW_VALUE_CTA_PATTERNS = [
  /would love to (?:find )?time to (?:chat|connect|talk|discuss)/i,
  /(?:hop on|jump on|get on) (?:a )?(?:quick )?call/i,
  /book (?:a )?(?:quick )?(?:meeting|call)/i,
  /find (?:some )?time (?:to|for)/i,
  /schedule (?:a )?(?:quick )?(?:meeting|call|chat)/i,
]

const CONCRETE_VALUE_PATTERNS = [
  /\b(?:free|short|quick|specific|custom|personalized)\b.{0,80}\b(?:test|walkthrough|write-up|breakdown|checklist|assessment|scan|report|one-pager|market map|analysis|finding|resource)\b/i,
  /\b(?:test|walkthrough|write-up|breakdown|checklist|assessment|scan|report|one-pager|market map|analysis|finding|resource)\b.{0,80}\b(?:for|of|about|on)\b/i,
  /want me to send (?:it|that|this)/i,
]

const UNSUPPORTED_TRACTION_PATTERNS = [
  /\b(?:dozens|hundreds|thousands|\d+\+?)\s+(?:of\s+)?(?:customers|clients|companies|teams|enterprises|startups)\b/i,
  /\b(?:fortune\s*500|series\s+[abc]|unicorns?)\b/i,
  /\b(?:reduced|increased|improved|cut|saved)\b.{0,50}\b\d+%\b/i,
  /\b\d+\s*(?:x|times)\b.{0,50}\b(?:faster|better|more|less)\b/i,
]

const UNSUPPORTED_FINDING_PATTERNS = [
  /\b(?:found|discovered|uncovered|identified|caught)\b.{0,40}\b(?:critical|high-risk|serious|major)\b.{0,40}\b(?:issues?|vulnerabilities|vulnerability|flaws?|risks?|bugs?)\b/i,
  /\b(?:found|discovered|uncovered|identified|caught)\b.{0,25}\b\d+\b.{0,25}\b(?:issues?|vulnerabilities|vulnerability|flaws?|risks?|bugs?)\b/i,
  /\b(?:took over|compromised|stole|extracted private data from|pulled private data from)\b.{0,60}\b(?:their|a|an|similar|another)\b/i,
]

const AVOIDABLE_SECURITY_JARGON = [
  'agentic pentesting',
  'adversarial inputs',
  'prompt injection',
  'jailbreaking',
  'data exfiltration',
  'tool abuse',
  'confused deputy',
  'RAG pipeline',
  'input surface',
  'attack surface',
]

export interface QualityResult {
  issues: string[]
  score: number
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function normalizeGeneratedEmail(text: string): string {
  return text.replace(/\s*[\u2013\u2014]\s*/g, ', ')
}

export function checkEmailQuality(
  subject: string,
  body: string,
  type: 'initial' | 'follow_up' = 'initial'
): QualityResult {
  const issues: string[] = []
  let score = 100

  const words = countWords(body)
  const bodyLower = body.toLowerCase()
  const subjectLower = subject.toLowerCase()

  // Word count check
  if (type === 'initial') {
    if (words < 60) {
      issues.push(`Body is only ${words} words. SMYKM target: 80-150.`)
      score -= 10
    } else if (words > 160) {
      issues.push(`Body is ${words} words. Keep it under 150 for SMYKM.`)
      score -= 10
    }
  } else {
    // Follow-ups should be tighter
    if (words > 120) {
      issues.push(`Follow-up is ${words} words. Keep it under 100.`)
      score -= 10
    }
  }

  // Em dash check (McKenna Rule)
  if (/[\u2013\u2014]/.test(body) || /[\u2013\u2014]/.test(subject)) {
    issues.push('Contains em dashes. McKenna rules say use commas or periods.')
    score -= 15
  }

  // Banned phrases check
  for (const phrase of BANNED_PHRASES) {
    if (bodyLower.includes(phrase.toLowerCase()) || subjectLower.includes(phrase.toLowerCase())) {
      issues.push(`Contains banned phrase: "${phrase}".`)
      score -= 10
    }
  }

  const hasLowValueAsk = LOW_VALUE_CTA_PATTERNS.some(pattern => pattern.test(body))
  const offersConcreteValue = CONCRETE_VALUE_PATTERNS.some(pattern => pattern.test(body))
  if (hasLowValueAsk && !offersConcreteValue) {
    issues.push('CTA asks for time without offering a concrete free deliverable.')
    score -= 15
  }

  const mentionsMason = /\bmason\b/i.test(body)
  const hasUnsupportedTraction = UNSUPPORTED_TRACTION_PATTERNS.some(pattern => pattern.test(body))
  if (hasUnsupportedTraction && !mentionsMason) {
    issues.push('Contains unsupported traction claim. Only the Mason pilot may be referenced as a real result.')
    score -= 20
  }

  const hasUnsupportedFinding = UNSUPPORTED_FINDING_PATTERNS.some(pattern => pattern.test(body))
  if (hasUnsupportedFinding && !mentionsMason) {
    issues.push('Contains unsupported finding claim. Specific vulnerabilities or assessment results must come from lead research or the Mason pilot.')
    score -= 20
  }

  for (const jargon of AVOIDABLE_SECURITY_JARGON) {
    if (bodyLower.includes(jargon.toLowerCase()) || subjectLower.includes(jargon.toLowerCase())) {
      issues.push(`Uses avoidable security jargon: "${jargon}". Use plain language unless the lead used it first.`)
      score -= 5
    }
  }

  // Opening line check (Initial only)
  if (type === 'initial' && !body.startsWith("We've yet to be properly introduced")) {
    issues.push('Missing the required SMYKM opener: "We\'ve yet to be properly introduced".')
    score -= 10
  }

  // Long sentence check (>25 words)
  const sentences = body.split(/[.!?]+/).filter(Boolean)
  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length
    if (sentenceWords > 28) {
      issues.push(`Has a ${sentenceWords}-word sentence. Keep under 25 words for readability.`)
      score -= 5
      break
    }
  }

  // Sign-off check
  if (!body.includes('Best,\nDaniel Chalco') && !body.includes('Best, Daniel Chalco')) {
    issues.push('Missing standard sign-off (Best, Daniel Chalco).')
    score -= 5
  }

  return { issues, score: Math.max(0, score) }
}
