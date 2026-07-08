import type { SupabaseClient } from '@supabase/supabase-js'
import { refreshAccessToken } from '@/lib/api/gmail'

export interface GoogleAccount {
  id: string
  user_id: string
  email_address: string
  access_token: string
  refresh_token: string
  token_expires_at: string
}

export async function getGoogleAccountAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ account: GoogleAccount; accessToken: string } | null> {
  const { data: account, error } = await supabase
    .from('email_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('sync_enabled', true)
    .order('last_synced_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!account) return null

  const typedAccount = account as GoogleAccount
  let accessToken = typedAccount.access_token
  const expiresAt = new Date(typedAccount.token_expires_at)

  if (expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    const newTokens = await refreshAccessToken(typedAccount.refresh_token)
    accessToken = newTokens.access_token
    await supabase
      .from('email_accounts')
      .update({
        access_token: newTokens.access_token,
        token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      })
      .eq('id', typedAccount.id)
      .eq('user_id', userId)
  }

  return { account: typedAccount, accessToken }
}
