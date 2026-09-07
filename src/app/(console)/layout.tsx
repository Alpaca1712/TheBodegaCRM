import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConsoleShell from '@/components/layout/console-shell'

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <ConsoleShell userEmail={user.email || undefined}>{children}</ConsoleShell>
}
