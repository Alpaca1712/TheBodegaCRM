import { NextRequest, NextResponse } from 'next/server'
import { generateCompletion } from '@/lib/ai/novita'

/**
 * AI Agent: "Show Me You Know Me" (SMYKM) Personalization Engine
 *
 * Inspired by Samantha McKenna's methodology:
 * 1. Research the prospect (company, role, recent news, interests)
 * 2. Reference something specific about THEM in the opening
 * 3. Connect their world to your value proposition
 * 4. Keep it human, warm, and concise
 */

const SMYKM_SYSTEM_PROMPT = `You are a world-class sales development AI trained on Samantha McKenna's "Show Me You Know Me" (SMYKM) outreach methodology.

Core principles:
1. PERSONALIZATION FIRST: Every message must reference something specific about the prospect — their role, company, recent achievements, industry challenges, or interests. Generic = deleted.
2. LEAD WITH THEM: The first sentence is ALWAYS about the prospect, never about you. Show you did your homework.
3. CONNECT THE DOTS: Bridge from their world to your value. Don't just pitch — show how what you offer solves their specific problem.
4. BE HUMAN: Write like a real person, not a template. No "I hope this email finds you well." No corporate jargon. Be warm, direct, genuine.
5. ONE CTA: Each message has exactly one clear, low-friction call to action. Not "let me know if you'd like to chat." Instead: "Would Thursday at 2pm work for a 15-minute call?"
6. BREVITY: Under 100 words for email body. Under 300 characters for LinkedIn. Respect their time.

For multi-step sequences, each step should build on the last:
- Step 1: Show you know them + introduce relevance
- Step 2: Share a specific insight or case study relevant to their industry
- Step 3: Social proof or a question that provokes thought
- Step 4: Direct value offer or meeting request
- Step 5: Graceful breakup that leaves the door open

Adapt tone by channel:
- Email: Professional but warm. Subject lines under 6 words.
- LinkedIn: Conversational, slightly more casual. Reference mutual connections or shared groups.
- Call: Provide a brief script with an opening hook and 2-3 talking points.
- Task: Describe the action and personalization approach.

ALWAYS respond in valid JSON. No markdown, no explanations outside the JSON.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contact, step, sequence_context, action } = body

    if (action === 'generate_step') {
      return generateStepContent(contact, step, sequence_context)
    }

    if (action === 'generate_all_steps') {
      return generateAllSteps(contact, step, sequence_context)
    }

    if (action === 'research_prospect') {
      return researchProspect(contact)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Sequence personalization error:', error)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}

async function generateStepContent(
  contact: {
    first_name: string
    last_name: string
    email?: string
    title?: string
    company_name?: string
    industry?: string
    notes?: string
    linkedin_url?: string
  },
  step: {
    step_number: number
    channel: string
    subject_template?: string
    body_template?: string
    ai_prompt?: string
  },
  sequenceContext?: {
    sequence_name?: string
    total_steps?: number
    previous_steps_summary?: string
  }
) {
  const userPrompt = `Generate personalized outreach for step ${step.step_number} of a ${sequenceContext?.total_steps || 'multi'}-step sequence.

PROSPECT:
- Name: ${contact.first_name} ${contact.last_name}
- Title: ${contact.title || 'Unknown'}
- Company: ${contact.company_name || 'Unknown'}
- Industry: ${contact.industry || 'Unknown'}
- Notes/Context: ${contact.notes || 'None'}

STEP CONFIG:
- Channel: ${step.channel}
- Step ${step.step_number} of ${sequenceContext?.total_steps || '?'}
${step.subject_template ? `- Subject template hint: ${step.subject_template}` : ''}
${step.body_template ? `- Body template hint: ${step.body_template}` : ''}
${step.ai_prompt ? `- Custom instruction: ${step.ai_prompt}` : ''}
${sequenceContext?.previous_steps_summary ? `- Previous touches: ${sequenceContext.previous_steps_summary}` : ''}

Respond in JSON:
${step.channel === 'email' ? '{"subject": "short subject", "body": "email body under 100 words"}' : ''}
${step.channel === 'linkedin' ? '{"message": "LinkedIn message under 300 characters"}' : ''}
${step.channel === 'call' ? '{"opening": "first 10 seconds", "talking_points": ["point 1", "point 2"], "cta": "close with this"}' : ''}
${step.channel === 'task' ? '{"task_description": "what to do", "personalization_notes": "how to personalize this touch"}' : ''}`

  const result = await generateCompletion(SMYKM_SYSTEM_PROMPT, userPrompt, {
    maxTokens: 500,
    temperature: 0.7,
  })

  try {
    const parsed = JSON.parse(result)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ body: result, subject: 'Follow up' })
  }
}

async function generateAllSteps(
  contact: {
    first_name: string
    last_name: string
    email?: string
    title?: string
    company_name?: string
    industry?: string
    notes?: string
  },
  steps: Array<{
    step_number: number
    channel: string
    delay_days: number
    subject_template?: string
    body_template?: string
    ai_prompt?: string
  }>,
  sequenceContext?: { sequence_name?: string }
) {
  const stepsDesc = steps.map(s =>
    `Step ${s.step_number} (${s.channel}, day ${s.delay_days}): ${s.ai_prompt || s.subject_template || 'auto'}`
  ).join('\n')

  const userPrompt = `Generate personalized content for ALL steps of this sequence for the prospect below.

PROSPECT:
- Name: ${contact.first_name} ${contact.last_name}
- Title: ${contact.title || 'Unknown'}
- Company: ${contact.company_name || 'Unknown'}
- Industry: ${contact.industry || 'Unknown'}
- Notes: ${contact.notes || 'None'}

SEQUENCE: "${sequenceContext?.sequence_name || 'Outreach'}"
${stepsDesc}

Respond as a JSON array where each element matches the step:
[
  {"step_number": 1, "subject": "...", "body": "..."},
  {"step_number": 2, "message": "..."},
  ...
]

Use the appropriate fields for each channel (email: subject+body, linkedin: message, call: opening+talking_points+cta, task: task_description+personalization_notes).`

  const result = await generateCompletion(SMYKM_SYSTEM_PROMPT, userPrompt, {
    maxTokens: 2000,
    temperature: 0.7,
  })

  try {
    const parsed = JSON.parse(result)
    return NextResponse.json({ steps: Array.isArray(parsed) ? parsed : [parsed] })
  } catch {
    return NextResponse.json({ steps: [], raw: result })
  }
}

async function researchProspect(contact: {
  first_name: string
  last_name: string
  title?: string
  company_name?: string
  industry?: string
  notes?: string
}) {
  const researchPrompt = `You are a sales research assistant. Based on what you know, generate a prospect research brief for personalized outreach.

PROSPECT:
- Name: ${contact.first_name} ${contact.last_name}
- Title: ${contact.title || 'Unknown'}
- Company: ${contact.company_name || 'Unknown'}
- Industry: ${contact.industry || 'Unknown'}
- Existing notes: ${contact.notes || 'None'}

Generate a research brief in JSON:
{
  "company_summary": "1-2 sentences about what the company does",
  "role_insights": "what someone in this role typically cares about",
  "likely_challenges": ["challenge 1", "challenge 2", "challenge 3"],
  "personalization_hooks": ["specific thing to reference in outreach", "another hook", "third hook"],
  "recommended_approach": "1-2 sentences on best outreach strategy",
  "industry_trends": "relevant trend to reference"
}`

  const result = await generateCompletion(
    'You are a B2B sales research analyst. Respond only in valid JSON.',
    researchPrompt,
    { maxTokens: 600, temperature: 0.5 }
  )

  try {
    return NextResponse.json(JSON.parse(result))
  } catch {
    return NextResponse.json({ company_summary: result, personalization_hooks: [], likely_challenges: [] })
  }
}
