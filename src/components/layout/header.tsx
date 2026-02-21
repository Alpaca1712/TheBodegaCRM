'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, Search } from 'lucide-react';
import { signOut } from '@/lib/auth/actions';
import { GlobalSearch } from '@/components/search/global-search';
import { RemindersPanel } from '@/components/notifications/reminders-panel';
import { ThemeToggle } from '@/components/theme/theme-toggle';

interface HeaderProps {
  userEmail?: string;
  userName?: string;
}

export default function Header({ userEmail, userName }: HeaderProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
      setIsSigningOut(false);
    }
  };

  const getInitials = () => {
    if (userName) return userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    if (userEmail) return userEmail[0].toUpperCase();
    return 'U';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-6">
        <div className="flex items-center md:hidden">
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Bodega</span>
        </div>

        <div className="hidden md:block" />

        <div className="flex items-center gap-2">
          <RemindersPanel />

          <button
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-2 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/80 px-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
            <kbd className="ml-1 rounded border border-zinc-300/60 dark:border-zinc-600/60 bg-white dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors md:hidden"
          >
            <Search className="h-4 w-4" />
          </button>

          <ThemeToggle />

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                {getInitials()}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 leading-none">
                  {userName || 'User'}
                </p>
              </div>
              <ChevronDown className="h-3 w-3 text-zinc-400 dark:text-zinc-500 hidden md:block" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-lg bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-zinc-200/60 dark:ring-zinc-700/60 animate-scale-in overflow-hidden">
                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-700">
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-200">{userName || 'User'}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{userEmail || ''}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors disabled:opacity-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {isSigningOut ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
