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

export interface QualityResult {
  issues: string[]
  score: number
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
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
