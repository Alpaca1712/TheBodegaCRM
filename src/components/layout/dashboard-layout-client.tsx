'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  CalendarCheck,
  Landmark,
  Mail,
  BarChart3,
  Settings,
  Plus,
  ChevronDown,
  Zap,
  Workflow,
} from 'lucide-react';
import Header from '@/components/layout/header';
import DashboardClientWrapper from '@/components/layout/dashboard-client-wrapper';
import MobileBottomNav from '@/components/layout/mobile-bottom-nav';
import KeyboardShortcutsDialog from '@/components/ui/keyboard-shortcuts-dialog';
import { useNotificationBadges } from '@/hooks/use-notification-badges';
import { useGlobalShortcuts } from '@/hooks/use-keyboard-shortcuts';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export default function DashboardLayoutClient({
  children,
  userEmail,
  userName,
}: DashboardLayoutClientProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const { badges, loading } = useNotificationBadges();
  const pathname = usePathname();
  useGlobalShortcuts();

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href);
  };

  const navGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'CRM',
      items: [
        { href: '/contacts', label: 'Contacts', icon: Users },
        { href: '/companies', label: 'Companies', icon: Building2 },
        { href: '/deals', label: 'Deals', icon: Handshake, badge: (!loading && badges?.staleDeals) || undefined },
        { href: '/activities', label: 'Activities', icon: CalendarCheck, badge: (!loading && badges?.overdueTasks) || undefined },
        { href: '/sequences', label: 'Sequences', icon: Zap },
        { href: '/automations', label: 'Automations', icon: Workflow },
      ],
    },
    {
      label: 'Fundraising',
      items: [
        { href: '/investors', label: 'Investors', icon: Landmark },
      ],
    },
    {
      label: 'Tools',
      items: [
        { href: '/email', label: 'Email AI', icon: Mail },
        { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      ],
    },
  ];

  const quickCreateItems = [
    { href: '/contacts/new', label: 'New Contact', icon: Users },
    { href: '/companies/new', label: 'New Company', icon: Building2 },
    { href: '/deals/new', label: 'New Deal', icon: Handshake },
    { href: '/investors/new', label: 'New Investor', icon: Landmark },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <DashboardClientWrapper>
        {/* Sidebar */}
        <div className="hidden md:flex fixed inset-y-0 left-0 w-[220px] flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-30">
          {/* Logo */}
          <div className="flex items-center h-14 px-5">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-600/20">
                <span className="text-white font-bold text-xs">B</span>
              </div>
              <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Bodega</span>
            </Link>
          </div>

          {/* Quick Create */}
          <div className="px-3 pb-1">
            <div className="relative">
              <button
                onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm shadow-indigo-600/20"
              >
                <Plus className="h-3.5 w-3.5" />
                Create
                <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${isQuickCreateOpen ? 'rotate-180' : ''}`} />
              </button>
              {isQuickCreateOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-lg shadow-black/5 dark:shadow-black/30 py-1 z-50 animate-scale-in">
                  {quickCreateItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsQuickCreateOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                      >
                        <Icon className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-5">
                <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all ${
                            active
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                          <span>{item.label}</span>
                          {item.badge ? (
                            <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/60 px-1 text-[10px] font-semibold text-rose-600 dark:text-rose-300 tabular-nums">
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Bottom: Settings */}
          <div className="px-3 py-3 border-t border-zinc-100 dark:border-zinc-800">
            <Link
              href="/settings"
              className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all ${
                isActive('/settings')
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Settings className={`h-4 w-4 ${isActive('/settings') ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
              <span>Settings</span>
            </Link>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 md:ml-[220px] flex flex-col min-h-screen">
          <Header userEmail={userEmail} userName={userName} />
          <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <MobileBottomNav
          isSidebarOpen={isMobileSidebarOpen}
          onToggleSidebar={toggleMobileSidebar}
        />
        <KeyboardShortcutsDialog />
      </DashboardClientWrapper>
    </div>
  );
}
