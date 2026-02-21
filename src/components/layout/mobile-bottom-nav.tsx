'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Building2,
  DollarSign,
  Calendar,
  Mail,
  BarChart,
  Settings,
  X,
  Menu,
  Landmark,
  Zap,
  Workflow,
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
    { href: '/contacts', label: 'Contacts', icon: Users },
    { href: '/companies', label: 'Companies', icon: Building2 },
    { href: '/deals', label: 'Deals', icon: DollarSign },
    { href: '/activities', label: 'Activities', icon: Calendar },
    { href: '/sequences', label: 'Sequences', icon: Zap },
    { href: '/automations', label: 'Automations', icon: Workflow },
    { href: '/investors', label: 'Investors', icon: Landmark },
    { href: '/email', label: 'Email AI', icon: Mail },
    { href: '/analytics', label: 'Analytics', icon: BarChart },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];
  
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(href);
  };
  
  return (
    <>
      {/* Mobile bottom navigation - fixed at bottom on small screens */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shadow-lg">
        <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
          <Link 
            href="/dashboard" 
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
              isActive('/dashboard') 
                ? 'text-indigo-600 dark:text-indigo-400' 
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Home</span>
          </Link>
          
          <Link 
            href="/contacts" 
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
              isActive('/contacts') 
                ? 'text-indigo-600 dark:text-indigo-400' 
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Contacts</span>
          </Link>
          
          <div className="relative flex flex-col items-center justify-center">
            <Link 
              href="/deals" 
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
                isActive('/deals') 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <DollarSign className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Deals</span>
            </Link>
            {!loading && badges && badges.staleDeals > 0 && (
              <span className="absolute -top-0.5 right-0 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {badges.staleDeals}
              </span>
            )}
          </div>
          
          <div className="relative flex flex-col items-center justify-center">
            <Link 
              href="/activities" 
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
                isActive('/activities') 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Tasks</span>
            </Link>
            {!loading && badges && badges.overdueTasks > 0 && (
              <span className="absolute -top-0.5 right-0 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {badges.overdueTasks}
              </span>
            )}
          </div>
          
          <button
            onClick={onToggleSidebar}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
              isSidebarOpen
                ? 'text-indigo-600 dark:text-indigo-400' 
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </div>
      </nav>
      
      {/* Mobile sidebar drawer */}
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
                  <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-xs">B</span>
                  </div>
                  <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Bodega</span>
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
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-medium'
                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Icon className={`h-4.5 w-4.5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
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
      
      {/* Spacer for bottom nav */}
      <div className="md:hidden h-16" />
    </>
  );
}
