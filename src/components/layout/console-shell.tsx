'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, LogOut, Mail, Menu, Send, Settings, Target, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { signOut } from '@/lib/auth/actions';
import { api } from '@/lib/api/client';
import { ThemeToggle } from '@/components/theme/theme-toggle';

interface ConsoleShellProps {
  children: ReactNode;
  userEmail?: string;
}

const NAV = [
  { href: '/leads', label: 'Leads', icon: Target },
  { href: '/sequences', label: 'Sequences', icon: Send },
  { href: '/inbox', label: 'Inbox', icon: Inbox, badgeKey: 'inbox' as const },
  { href: '/emails', label: 'Emails', icon: Mail },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function ConsoleShell({ children, userEmail }: ConsoleShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: () => api<{ data: { inbox: { unhandled: number } } }>('/stats'),
    refetchInterval: 60_000,
  });
  const inboxCount = stats.data?.data.inbox.unhandled || 0;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const nav = (
    <nav className="flex-1 overflow-y-auto px-2.5 py-3">
      <ul className="space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const badge = item.badgeKey === 'inbox' ? inboxCount : 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-red-600 dark:text-red-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
                {badge ? (
                  <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-amber-100 px-1.5 text-[10px] font-semibold tabular-nums text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const account = (
    <div className="space-y-2 border-t border-zinc-200/80 px-3 py-3 dark:border-zinc-800">
      <div className="px-1">
        <p className="truncate text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{userEmail}</p>
        <p className="text-[11px] text-zinc-400">Pigeon Labs</p>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          onClick={async () => {
            setSigningOut(true);
            try {
              await signOut();
            } catch {
              setSigningOut(false);
            }
          }}
          disabled={signingOut}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f4f4f5] dark:bg-zinc-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:flex">
        <div className="flex h-14 items-center px-4">
          <Link href="/leads" className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-sm shadow-red-600/20">
              <span className="text-sm font-bold text-white">B</span>
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-white bg-amber-400 dark:border-zinc-900" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Bodega</span>
          </Link>
        </div>
        {nav}
        {account}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[260px] flex-col bg-white dark:bg-zinc-900">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700">
                  <span className="text-sm font-bold text-white">B</span>
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-white bg-amber-400" />
                </div>
                <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">Bodega</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="rounded-md p-1 text-zinc-500" aria-label="Close menu">
                <X className="h-4 w-4" />
              </button>
            </div>
            {nav}
            {account}
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:ml-[232px]">
        <header className="sticky top-0 z-20 flex h-12 items-center border-b border-zinc-200/80 bg-[#f4f4f5]/80 px-3 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/80">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 text-zinc-500" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Bodega</span>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
