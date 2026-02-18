import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login')
  }
  
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
              <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                <span>🏠</span>
                <span>Dashboard</span>
              </a>
            </li>
            <li>
              <a href="/contacts" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                <span>👤</span>
                <span>Contacts</span>
              </a>
            </li>
            <li>
              <a href="/companies" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                <span>🏢</span>
                <span>Companies</span>
              </a>
            </li>
            <li>
              <a href="/deals" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                <span>💰</span>
                <span>Deals</span>
              </a>
            </li>
            <li>
              <a href="/activities" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                <span>📅</span>
                <span>Activities</span>
              </a>
            </li>
          </ul>
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-sm">{session.user.email?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium truncate">{session.user.email}</p>
              <p className="text-xs text-slate-400">Signed in</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 ml-64">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
