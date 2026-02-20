import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayoutClient from '@/components/layout/dashboard-layout-client'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  // Get user details from session
  const user = session.user
  const userEmail = user.email || undefined
  const userName = user.user_metadata?.name || undefined
  
  return (
    <DashboardLayoutClient 
      userEmail={userEmail} 
      userName={userName}
    >
      {children}
    </DashboardLayoutClient>
  )
}

