import { db } from '@/lib/db'
import type { AiSettings, LandingSettings, SenderSettings } from '@/types'

interface SettingsMap {
  ai: AiSettings
  sender: SenderSettings
  landing: LandingSettings
}

const DEFAULTS: SettingsMap = {
  ai: { default_model: 'deepseek/deepseek-v4-flash' },
  sender: {
    from_name: 'Pigeon Labs',
    from_email: process.env.DEFAULT_FROM_EMAIL || 'hello@mail.pigeonlabs.nyc',
    reply_to: null,
    signature: '',
  },
  landing: { base_url: process.env.LANDING_BASE_URL || 'https://www.artoo.love' },
}

export async function getSetting<K extends keyof SettingsMap>(key: K): Promise<SettingsMap[K]> {
  const { data, error } = await db().from('settings').select('value').eq('key', key).maybeSingle()
  if (error) throw error
  return { ...DEFAULTS[key], ...((data?.value as Partial<SettingsMap[K]>) || {}) }
}

export async function getAllSettings(): Promise<SettingsMap> {
  const { data, error } = await db().from('settings').select('key, value')
  if (error) throw error
  const stored = Object.fromEntries((data || []).map((row) => [row.key, row.value])) as Partial<Record<keyof SettingsMap, object>>
  return {
    ai: { ...DEFAULTS.ai, ...(stored.ai || {}) },
    sender: { ...DEFAULTS.sender, ...(stored.sender || {}) },
    landing: { ...DEFAULTS.landing, ...(stored.landing || {}) },
  }
}

export async function updateSetting<K extends keyof SettingsMap>(key: K, patch: Partial<SettingsMap[K]>) {
  const current = await getSetting(key)
  const value = { ...current, ...patch }
  const { error } = await db()
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw error
  return value
}
