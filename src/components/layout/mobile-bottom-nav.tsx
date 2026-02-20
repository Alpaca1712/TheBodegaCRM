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
    { href: '/investors', label: 'Investors', icon: Building2 },
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex items-center justify-around px-2 py-3">
          {/* Main navigation items - limited to 4 for mobile */}
          <Link 
            href="/dashboard" 
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
              isActive('/dashboard') 
                ? 'text-indigo-600 bg-indigo-50' 
                : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          
          <Link 
            href="/contacts" 
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
              isActive('/contacts') 
                ? 'text-indigo-600 bg-indigo-50' 
                : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
            }`}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs mt-1">Contacts</span>
          </Link>
          
          <div className="relative flex flex-col items-center justify-center">
            <Link 
              href="/deals" 
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                isActive('/deals') 
                  ? 'text-indigo-600 bg-indigo-50' 
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
              }`}
            >
              <DollarSign className="h-5 w-5" />
              <span className="text-xs mt-1">Deals</span>
            </Link>
            {!loading && badges && badges.staleDeals > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {badges.staleDeals}
              </span>
            )}
          </div>
          
          <div className="relative flex flex-col items-center justify-center">
            <Link 
              href="/activities" 
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                isActive('/activities') 
                  ? 'text-indigo-600 bg-indigo-50' 
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
              }`}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs mt-1">Tasks</span>
            </Link>
            {!loading && badges && badges.overdueTasks > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {badges.overdueTasks}
              </span>
            )}
          </div>
          
          {/* More menu toggle */}
          <button
            onClick={onToggleSidebar}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
              isSidebarOpen
                ? 'text-indigo-600 bg-indigo-50' 
                : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
            }`}
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="text-xs mt-1">More</span>
          </button>
        </div>
      </nav>
      
      {/* Mobile sidebar drawer */}
      {isSidebarOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50" 
            onClick={onToggleSidebar}
          />
          
          {/* Sidebar drawer */}
          <div className="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">Navigation</h2>
                  <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onToggleSidebar}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                            active
                              ? 'bg-indigo-50 text-indigo-600 font-medium'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
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
