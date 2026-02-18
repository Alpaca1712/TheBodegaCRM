import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/header'

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
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-white">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white">TheBodegaCRM</h1>
          <p className="text-slate-400 text-sm mt-1">Customer Relationship Management</p>
        </div>
        <nav className="mt-6 px-4">
          <ul className="space-y-2">
            <li>
              <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                <span>🏠</span>
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link href="/contacts" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                <span>👤</span>
                <span>Contacts</span>
              </Link>
            </li>
            <li>
              <Link href="/companies" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                <span>🏢</span>
                <span>Companies</span>
              </Link>
            </li>
            <li>
              <Link href="/deals" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                <span>💰</span>
                <span>Deals</span>
              </Link>
            </li>
            <li>
              <Link href="/activities" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                <span>📅</span>
                <span>Activities</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Main content with header */}
      <div className="flex-1 ml-64 flex flex-col">
        <Header userEmail={userEmail} userName={userName} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
