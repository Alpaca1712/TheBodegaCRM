'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Crosshair,
  Mail,
  BarChart3,
  Settings,
  Plus,
  ChevronDown,
  Kanban,
  Bell,
  Target,
  Handshake,
  Brain,
  HeartPulse,
  MessageCircle,
} from 'lucide-react';
import Header from '@/components/layout/header';
import DashboardClientWrapper from '@/components/layout/dashboard-client-wrapper';
import MobileBottomNav from '@/components/layout/mobile-bottom-nav';
import KeyboardShortcutsDialog from '@/components/ui/keyboard-shortcuts-dialog';
import { useGlobalShortcuts } from '@/hooks/use-keyboard-shortcuts';
import CopilotChat from '@/components/ai/copilot-chat';

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
  const [atRiskCount, setAtRiskCount] = useState(0);
  const pathname = usePathname();
  useGlobalShortcuts();

  useEffect(() => {
    fetch('/api/ai/pipeline-health')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.at_risk_count) setAtRiskCount(data.at_risk_count);
      })
      .catch(() => {});
  }, []);

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
      label: 'Outreach',
      items: [
        { href: '/leads', label: 'Leads', icon: Target },
        { href: '/pipeline', label: 'Pipeline', icon: Kanban },
        { href: '/follow-ups', label: 'Follow-ups', icon: Bell },
      ],
    },
    {
      label: 'Email',
      items: [
        { href: '/email', label: 'Gmail Sync', icon: Mail },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { href: '/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/pipeline-health', label: 'Pipeline Health', icon: HeartPulse, badge: atRiskCount || undefined },
      ],
    },
  ];

  const quickCreateItems = [
    { href: '/leads/new?type=customer', label: 'New Customer Lead', icon: Users },
    { href: '/leads/new?type=investor', label: 'New Investor Lead', icon: Crosshair },
    { href: '/leads/new?type=partnership', label: 'New Partnership Lead', icon: Handshake },
  ];

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <DashboardClientWrapper>
        {/* Sidebar */}
        <div className="hidden md:flex fixed inset-y-0 left-0 w-[232px] flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200/80 dark:border-zinc-800 z-30">
          {/* Logo */}
          <div className="flex items-center h-14 px-5">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-sm shadow-red-600/25 group-hover:shadow-red-600/40 transition-shadow">
                <span className="text-white font-bold text-xs">R</span>
              </div>
              <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Rocoto</span>
            </Link>
          </div>

          {/* Quick Create */}
          <div className="px-3 pb-2">
            <div className="relative">
              <button
                onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-lg transition-all shadow-sm shadow-red-600/20 hover:shadow-red-500/30"
              >
                <Plus className="h-3.5 w-3.5" />
                New Lead
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
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
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
          <nav className="flex-1 overflow-y-auto px-3 py-2">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-5">
                <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
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
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 shadow-sm shadow-red-100 dark:shadow-none'
                              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200'
                          }`}
                        >
                          <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-red-600 dark:text-red-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                          <span>{item.label}</span>
                          {item.badge ? (
                            <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/60 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
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

          {/* Bottom: User + Settings */}
          <div className="px-3 py-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1">
            <Link
              href="/settings"
              className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all ${
                isActive('/settings')
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Settings className={`h-4 w-4 ${isActive('/settings') ? 'text-red-600 dark:text-red-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
              <span>Settings</span>
            </Link>
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 truncate">{userName || 'User'}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 truncate">{userEmail || ''}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 md:ml-[232px] flex flex-col min-h-screen">
          <Header userEmail={userEmail} userName={userName} />
          <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
            {children}
          </main>
        </div>

        {/* Co-pilot Chat */}
        <CopilotChat />

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
