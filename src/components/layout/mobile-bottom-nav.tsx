'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Kanban,
  Mail,
  BarChart,
  Settings,
  X,
  Menu,
  Send,
} from 'lucide-react';
import { useNotificationBadges } from '@/hooks/use-notification-badges';

interface MobileBottomNavProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function MobileBottomNav({ 
  isSidebarOpen, 
  onToggleSidebar 
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const { badges, loading } = useNotificationBadges();
  
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/leads', label: 'Leads', icon: Users },
    { href: '/pipeline', label: 'Pipeline', icon: Kanban },
    { href: '/follow-ups', label: 'Follow-ups', icon: Send },
    { href: '/email', label: 'Email', icon: Mail },
    { href: '/analytics', label: 'Analytics', icon: BarChart },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];
  
  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href);
  };
  
  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shadow-lg">
        <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
          <Link 
            href="/dashboard" 
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
              isActive('/dashboard') 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Home</span>
          </Link>
          
          <Link 
            href="/leads" 
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
              isActive('/leads') 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Leads</span>
          </Link>
          
          <div className="relative flex flex-col items-center justify-center">
            <Link 
              href="/follow-ups" 
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
                isActive('/follow-ups') 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
              aria-label={!loading && badges && badges.followUpsDue > 0 ? `Follow-ups, ${badges.followUpsDue} due` : 'Follow-ups'}
            >
              <Send className="h-5 w-5" />
              <span className="text-[10px] mt-0.5" aria-hidden="true">Follow-ups</span>
            </Link>
            {!loading && badges && badges.followUpsDue > 0 && (
              <span
                className="absolute -top-0.5 right-0 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold"
                aria-hidden="true"
              >
                {badges.followUpsDue}
              </span>
            )}
          </div>
          
          <Link 
            href="/pipeline" 
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
              isActive('/pipeline') 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Kanban className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Pipeline</span>
          </Link>
          
          <button
            onClick={onToggleSidebar}
            aria-expanded={isSidebarOpen}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
              isSidebarOpen
                ? 'text-red-600 dark:text-red-400' 
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </div>
      </nav>
      
      {isSidebarOpen && (
        <>
          <div 
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" 
            onClick={onToggleSidebar}
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-zinc-900 shadow-xl border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-red-600 flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-xs">R</span>
                  </div>
                  <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Rocoto</span>
                </div>
                <button
                  onClick={onToggleSidebar}
                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3">
                <ul className="space-y-0.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onToggleSidebar}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                            active
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 font-medium'
                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Icon className={`h-4.5 w-4.5 ${active ? 'text-red-600 dark:text-red-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
      
      <div className="md:hidden h-16" />
    </>
  );
}
