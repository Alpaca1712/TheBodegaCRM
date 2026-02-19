'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, Search } from 'lucide-react';
import { signOut } from '@/lib/auth/actions';
import { GlobalSearch } from '@/components/search/global-search';

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
  
  // Get initials from name or email for avatar fallback
  const getInitials = () => {
    if (userName) {
      return userName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (userEmail) {
      return userEmail[0].toUpperCase();
    }
    return 'U';
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-slate-900">TheBodegaCRM</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="hidden items-center space-x-2 rounded-lg bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 md:flex"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
            <kbd className="ml-2 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs text-slate-500">
              ⌘K
            </kbd>
          </button>
          
          {/* Mobile search button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 md:hidden"
          >
            <Search className="h-5 w-5 text-slate-600" />
          </button>
          
          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-3 rounded-lg p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
                {getInitials()}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-slate-700">
                  {userName || 'User'}
                </p>
                <p className="text-xs text-slate-500">
                  {userEmail || 'No email'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-slate-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="p-1">
                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="group flex w-full items-center rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {isSigningOut ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Global search modal */}
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
