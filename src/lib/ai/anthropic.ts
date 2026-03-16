import Anthropic from '@anthropic-ai/sdk'

const DEFAULT_MODEL = 'claude-sonnet-4-20250514'
const RESEARCH_MODEL = 'claude-opus-4-6'

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env.local file.')
  }
  return new Anthropic({ apiKey })
}

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const client = getClient()
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: options?.maxTokens ?? 1024,
    temperature: options?.temperature ?? 0.7,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const block = response.content[0]
  if (block.type === 'text') {
    return block.text
  }
  return ''
}

export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<T> {
  const result = await generateCompletion(systemPrompt, userPrompt, options)
  const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

/**
 * Run a prompt with Claude's built-in web search tool enabled.
 * Claude autonomously decides what to search, Anthropic executes the queries
 * server-side, and Claude synthesizes all results into a final answer.
 * Returns the final text block (after all search iterations are done).
 */
export async function researchWithWebSearch(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number; maxSearches?: number }
): Promise<string> {
  const client = getClient()
  const response = await client.messages.create({
    model: RESEARCH_MODEL,
    max_tokens: options?.maxTokens ?? 4096,
    temperature: options?.temperature ?? 0.3,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: options?.maxSearches ?? 10,
      },
    ],
  })

  // The response contains interleaved search results and text blocks.
  // Extract the last text block -- that's Claude's final synthesized answer.
  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  )
  const finalText = textBlocks[textBlocks.length - 1]?.text || ''
  return finalText
}

/**
 * Try to extract a JSON object from text that may contain prose around it.
 * Finds the outermost { ... } pair by tracking brace depth.
 */
function extractJSON(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') depth--
    if (depth === 0) return text.slice(start, i + 1)
  }
  return null
}

/**
 * Like researchWithWebSearch, but parses the final text as JSON.
 * Uses a three-layer strategy: direct parse, regex extraction, then
 * a cheap AI call to reformat prose into JSON as a last resort.
 */
export async function researchWithWebSearchJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number; maxSearches?: number }
): Promise<T> {
  const result = await researchWithWebSearch(systemPrompt, userPrompt, options)
  const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    // Claude wrapped JSON in prose — try extracting the object
  }

  const jsonStr = extractJSON(cleaned)
  if (jsonStr) {
    try {
      return JSON.parse(jsonStr)
    } catch {
      // Malformed JSON inside braces — fall through to AI extraction
    }
  }

  // Last resort: ask a fast model to extract/reformat the JSON
  const extracted = await generateCompletion(
    'Extract the JSON object from the following text. Return ONLY the raw JSON object, no markdown fences, no explanation, no prose. If the text contains research findings but no JSON, reformat the findings into the JSON structure described in the text.',
    result,
    { maxTokens: 4096, temperature: 0 }
  )
  const extractedCleaned = extracted.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(extractedCleaned)
}
