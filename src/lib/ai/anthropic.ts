import Anthropic from '@anthropic-ai/sdk'

const DEFAULT_MODEL = 'claude-sonnet-4-20250514'
const RESEARCH_MODEL = 'claude-opus-4-0-20250514'

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
 * Like researchWithWebSearch, but parses the final text as JSON.
 */
export async function researchWithWebSearchJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number; maxSearches?: number }
): Promise<T> {
  const result = await researchWithWebSearch(systemPrompt, userPrompt, options)
  const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}
