import { ApiError } from '@/lib/api/errors'

const BASE_URL = 'https://api.novita.ai/openai/v1'

/**
 * Curated Novita models exposed in the console/API. Any model id returned by
 * Novita's `/models` endpoint is also accepted when set explicitly.
 */
export const MODEL_PRESETS: { id: string; label: string; note: string }[] = [
  { id: 'deepseek/deepseek-v3.2', label: 'DeepSeek V3.2', note: 'Default. Fast, cheap, reliable JSON.' },
  { id: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash', note: 'Newer, very cheap, 1M context.' },
  { id: 'zai-org/glm-4.7', label: 'GLM 4.7', note: 'Strong reasoning at mid cost.' },
  { id: 'zai-org/glm-5.3-flash', label: 'GLM 5.3 Flash', note: 'Cheapest of the current GLM line.' },
  { id: 'qwen/qwen3-235b-a22b-instruct-2507', label: 'Qwen3 235B Instruct', note: 'Good instruction following, cheap.' },
  { id: 'moonshotai/kimi-k2.6', label: 'Kimi K2.6', note: 'Higher quality judgement, pricier.' },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', note: 'Very cheap, decent classifier.' },
]

export function novitaConfigured() {
  return Boolean(process.env.NOVITA_API_KEY)
}

function headers() {
  const key = process.env.NOVITA_API_KEY
  if (!key) throw new ApiError(503, 'NOVITA_API_KEY is not configured')
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

export interface NovitaModel {
  id: string
  context_size: number | null
  input_price_per_m: number | null
  output_price_per_m: number | null
}

export async function listNovitaModels(): Promise<NovitaModel[]> {
  const response = await fetch(`${BASE_URL}/models`, { headers: headers(), next: { revalidate: 3600 } })
  if (!response.ok) throw new ApiError(502, `Novita models request failed (${response.status})`)
  const payload = await response.json() as { data?: Record<string, unknown>[] }
  return (payload.data || []).map((model) => ({
    id: String(model.id),
    context_size: typeof model.context_size === 'number' ? model.context_size : null,
    input_price_per_m: typeof model.input_token_price_per_m === 'number' ? model.input_token_price_per_m / 10000 : null,
    output_price_per_m: typeof model.output_token_price_per_m === 'number' ? model.output_token_price_per_m / 10000 : null,
  }))
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  json?: boolean
  timeout_ms?: number
}

export async function chatCompletion(options: ChatOptions): Promise<{ content: string; model: string; usage: Record<string, number> | null }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeout_ms ?? 45_000)
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: headers(),
      signal: controller.signal,
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0,
        max_tokens: options.max_tokens ?? 400,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
    const payload = await response.json().catch(() => ({})) as {
      choices?: { message?: { content?: string } }[]
      usage?: Record<string, number>
      error?: { message?: string }
      message?: string
    }
    if (!response.ok) {
      throw new ApiError(502, `Novita: ${payload.error?.message || payload.message || response.status}`)
    }
    return {
      content: payload.choices?.[0]?.message?.content || '',
      model: options.model,
      usage: payload.usage || null,
    }
  } finally {
    clearTimeout(timeout)
  }
}

/** Pulls the first JSON object out of a model reply that may include prose or fences. */
export function extractJson<T = Record<string, unknown>>(content: string): T | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(content)
  const candidate = fenced ? fenced[1] : content
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T
  } catch {
    return null
  }
}
