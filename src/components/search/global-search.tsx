'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, User, Building, TrendingUp, ChevronRight, Users, Briefcase, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { searchAll } from '@/lib/api/search';

// Helper function to get icon for category type
const getIconForType = (type: 'contact' | 'company' | 'deal') => {
  switch (type) {
    case 'contact':
      return <Users className="h-4 w-4 text-slate-600" />;
    case 'company':
      return <Briefcase className="h-4 w-4 text-slate-600" />;
    case 'deal':
      return <DollarSign className="h-4 w-4 text-slate-600" />;
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

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
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
    if (onClose && !open) {
      onClose();
    }
    if (externalIsOpen === undefined) {
      setInternalIsOpen(open);
    }
  }, [onClose, externalIsOpen]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  
  const debouncedQuery = useDebounce(query, 300);
  
  // Keyboard shortcut: Cmd+K or Ctrl+K
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
  
  // Search when query changes
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
  
  // Calculate total number of results for keyboard navigation
  const totalResults = results.reduce((sum, category) => sum + category.results.length, 0);
  
  const handleResultSelect = useCallback(() => {
    if (totalResults === 0) return;
    
    // Find the selected result
    let currentIndex = 0;
    for (const category of results) {
      for (const result of category.results) {
        if (currentIndex === selectedIndex) {
          router.push(result.route);
          setIsOpen(false);
          setQuery('');
          return;
        }
        currentIndex++;
      }
    }
  }, [results, selectedIndex, totalResults, router, setIsOpen]);
  
  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || totalResults === 0) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalResults);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalResults) % totalResults);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleResultSelect();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, totalResults, handleResultSelect]);
  
  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center border-b border-slate-200 px-4 py-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts, companies, deals..."
              className="ml-3 flex-1 border-0 bg-transparent py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-0"
              autoFocus
            />
            <button
              onClick={handleClose}
              className="ml-2 rounded-md p-1 hover:bg-slate-100"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
          
          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600"></div>
                <span className="ml-3 text-sm text-slate-500">Searching...</span>
              </div>
            ) : query.trim() && results.length === 0 ? (
              <div className="py-8 text-center">
                <Search className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No results found for &quot;{query}&quot;</p>
              </div>
            ) : (
              <div>
                {results.map((category, categoryIndex) => (
                  <div key={category.type} className="mb-4">
                    <div className="mb-2 flex items-center px-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100">
                        {getIconForType(category.type)}
                      </div>
                      <span className="ml-2 text-sm font-medium text-slate-700">
                        {category.title} ({category.results.length})
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {category.results.map((result, resultIndex) => {
                        // Calculate global index for this result
                        let globalIndex = 0;
                        for (let i = 0; i < categoryIndex; i++) {
                          globalIndex += results[i].results.length;
                        }
                        globalIndex += resultIndex;
                        
                        const isSelected = globalIndex === selectedIndex;
                        
                        return (
                          <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => {
                              router.push(result.route);
                              handleClose();
                            }}
                            className={`flex w-full items-center rounded-lg p-3 text-left transition-colors ${
                              isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                              {result.type === 'contact' && <User className="h-5 w-5 text-slate-600" />}
                              {result.type === 'company' && <Building className="h-5 w-5 text-slate-600" />}
                              {result.type === 'deal' && <TrendingUp className="h-5 w-5 text-slate-600" />}
                            </div>
                            
                            <div className="ml-3 flex-1">
                              <div className="flex items-center">
                                <span className="font-medium text-slate-900">{result.title}</span>
                                {result.type === 'deal' && result.value && (
                                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                    ${result.value.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              {result.subtitle && (
                                <p className="text-sm text-slate-500">{result.subtitle}</p>
                              )}
                            </div>
                            
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Footer */}
            {results.length > 0 && (
              <div className="mt-4 border-t border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">↑↓</kbd>
                      <span className="ml-1.5">Navigate</span>
                    </div>
                    <div className="flex items-center">
                      <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">Enter</kbd>
                      <span className="ml-1.5">Select</span>
                    </div>
                    <div className="flex items-center">
                      <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">Esc</kbd>
                      <span className="ml-1.5">Close</span>
                    </div>
                  </div>
                  <div>
                    {totalResults} result{totalResults !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
