'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  User,
  Building,
  TrendingUp,
  ChevronRight,
  Users,
  Briefcase,
  DollarSign,
  UserPlus,
  Building2,
  Handshake,
  CalendarPlus,
  Landmark,
  BarChart3,
  Settings,
  Mail,
  Zap,
  Workflow,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { searchAll } from '@/lib/api/search';

const getIconForType = (type: 'contact' | 'company' | 'deal') => {
  switch (type) {
    case 'contact':
      return <Users className="h-4 w-4 text-zinc-500" />;
    case 'company':
      return <Briefcase className="h-4 w-4 text-zinc-500" />;
    case 'deal':
      return <DollarSign className="h-4 w-4 text-zinc-500" />;
  }
};

type SearchResult = {
  id: string;
  type: 'contact' | 'company' | 'deal';
  title: string;
  subtitle?: string;
  value?: number | null;
  avatar?: string;
  route: string;
};

type SearchCategory = {
  type: 'contact' | 'company' | 'deal';
  title: string;
  icon: React.ReactNode;
  results: SearchResult[];
};

type QuickAction = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  group: 'create' | 'navigate';
};

const quickActions: QuickAction[] = [
  { id: 'new-contact', label: 'New Contact', description: 'Add a new contact', icon: UserPlus, route: '/contacts/new', group: 'create' },
  { id: 'new-company', label: 'New Company', description: 'Add a new company', icon: Building2, route: '/companies/new', group: 'create' },
  { id: 'new-deal', label: 'New Deal', description: 'Create a deal', icon: Handshake, route: '/deals/new', group: 'create' },
  { id: 'new-investor', label: 'New Investor', description: 'Track an investor', icon: Landmark, route: '/investors/new', group: 'create' },
  { id: 'new-activity', label: 'Log Activity', description: 'Log a call, meeting, or task', icon: CalendarPlus, route: '/activities', group: 'create' },
  { id: 'nav-contacts', label: 'Contacts', description: 'View all contacts', icon: Users, route: '/contacts', group: 'navigate' },
  { id: 'nav-companies', label: 'Companies', description: 'View all companies', icon: Building2, route: '/companies', group: 'navigate' },
  { id: 'nav-deals', label: 'Deals', description: 'View pipeline', icon: Handshake, route: '/deals', group: 'navigate' },
  { id: 'nav-analytics', label: 'Analytics', description: 'View reports', icon: BarChart3, route: '/analytics', group: 'navigate' },
  { id: 'nav-email', label: 'Email AI', description: 'Email intelligence', icon: Mail, route: '/email', group: 'navigate' },
  { id: 'nav-sequences', label: 'Sequences', description: 'Sales engagement', icon: Zap, route: '/sequences', group: 'navigate' },
  { id: 'nav-automations', label: 'Automations', description: 'Workflow rules', icon: Workflow, route: '/automations', group: 'navigate' },
  { id: 'nav-settings', label: 'Settings', description: 'Account settings', icon: Settings, route: '/settings', group: 'navigate' },
  { id: 'import-contacts', label: 'Import Contacts', description: 'Upload CSV', icon: Upload, route: '/contacts/import', group: 'create' },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface GlobalSearchProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function GlobalSearch({ isOpen: externalIsOpen, onClose }: GlobalSearchProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen ?? internalIsOpen;

  const setIsOpen = useCallback((open: boolean) => {
    if (onClose && !open) onClose();
    if (externalIsOpen === undefined) setInternalIsOpen(open);
  }, [onClose, externalIsOpen]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const debouncedQuery = useDebounce(query, 300);

  // Filter quick actions based on query
  const filteredActions = query.trim()
    ? quickActions.filter(
        (a) =>
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          a.description.toLowerCase().includes(query.toLowerCase())
      )
    : quickActions;

  const createActions = filteredActions.filter((a) => a.group === 'create');
  const navActions = filteredActions.filter((a) => a.group === 'navigate');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const searchResults = await searchAll(debouncedQuery);
        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };
    performSearch();
  }, [debouncedQuery]);

  // Build a flat list of all selectable items for keyboard navigation
  const allItems: { type: 'result' | 'action'; route: string }[] = [];
  results.forEach((category) => {
    category.results.forEach((result) => {
      allItems.push({ type: 'result', route: result.route });
    });
  });
  if (!query.trim()) {
    filteredActions.forEach((action) => {
      allItems.push({ type: 'action', route: action.route });
    });
  } else {
    filteredActions.forEach((action) => {
      allItems.push({ type: 'action', route: action.route });
    });
  }

  const totalItems = allItems.length;

  const handleSelect = useCallback(() => {
    if (totalItems === 0) return;
    const item = allItems[selectedIndex];
    if (item) {
      router.push(item.route);
      setIsOpen(false);
      setQuery('');
    }
  }, [allItems, selectedIndex, totalItems, router, setIsOpen]);

  useEffect(() => {
    if (!isOpen || totalItems === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, totalItems, handleSelect]);

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  if (!isOpen) return null;

  let globalIndex = -1;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in"
        onClick={handleClose}
      />

      <div className="flex min-h-full items-start justify-center p-4 pt-[15vh]">
        <div
          className="relative w-full max-w-xl transform overflow-hidden rounded-xl bg-white dark:bg-zinc-900 shadow-2xl animate-scale-in border border-zinc-200 dark:border-zinc-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center border-b border-zinc-200 dark:border-zinc-700 px-4 py-3">
            <Search className="h-5 w-5 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
              placeholder="Search or type a command..."
              className="ml-3 flex-1 border-0 bg-transparent py-1 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-0 text-sm"
              autoFocus
            />
            <button onClick={handleClose} className="ml-2 rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-indigo-600" />
                <span className="ml-3 text-sm text-zinc-500">Searching...</span>
              </div>
            )}

            {!isLoading && query.trim() && results.length === 0 && filteredActions.length === 0 && (
              <div className="py-8 text-center">
                <Search className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No results for &quot;{query}&quot;</p>
              </div>
            )}

            {/* Search results */}
            {results.map((category) => (
              <div key={category.type}>
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {category.title}
                  </span>
                </div>
                {category.results.map((result) => {
                  globalIndex++;
                  const idx = globalIndex;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => { router.push(result.route); handleClose(); }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected ? 'bg-indigo-50 dark:bg-indigo-950' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        {result.type === 'contact' && <User className="h-4 w-4 text-zinc-500" />}
                        {result.type === 'company' && <Building className="h-4 w-4 text-zinc-500" />}
                        {result.type === 'deal' && <TrendingUp className="h-4 w-4 text-zinc-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{result.title}</span>
                        {result.subtitle && (
                          <span className="block text-xs text-zinc-500 dark:text-zinc-400 truncate">{result.subtitle}</span>
                        )}
                      </div>
                      {result.type === 'deal' && result.value && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          ${result.value.toLocaleString()}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600" />
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Quick Actions - shown when no query or as filtered actions */}
            {!isLoading && (
              <>
                {createActions.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        {query.trim() ? 'Actions' : 'Quick Actions'}
                      </span>
                    </div>
                    {createActions.map((action) => {
                      globalIndex++;
                      const idx = globalIndex;
                      const isSelected = idx === selectedIndex;
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.id}
                          onClick={() => { router.push(action.route); handleClose(); }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isSelected ? 'bg-indigo-50 dark:bg-indigo-950' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950">
                            <Icon className="h-4 w-4 text-indigo-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">{action.label}</span>
                            <span className="block text-xs text-zinc-500 dark:text-zinc-400">{action.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {navActions.length > 0 && !query.trim() && (
                  <div>
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Go to
                      </span>
                    </div>
                    {navActions.map((action) => {
                      globalIndex++;
                      const idx = globalIndex;
                      const isSelected = idx === selectedIndex;
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.id}
                          onClick={() => { router.push(action.route); handleClose(); }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isSelected ? 'bg-indigo-50 dark:bg-indigo-950' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                            <Icon className="h-4 w-4 text-zinc-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">{action.label}</span>
                            <span className="block text-xs text-zinc-500 dark:text-zinc-400">{action.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Bottom padding */}
            <div className="h-2" />
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 px-4 py-2.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <kbd className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono">↑↓</kbd>
                  <span>navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono">↵</kbd>
                  <span>select</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono">esc</kbd>
                  <span>close</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
