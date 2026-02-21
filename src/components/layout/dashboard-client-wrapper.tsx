'use client';

import { ReactNode } from 'react';
import { useGlobalShortcuts } from '@/hooks/use-keyboard-shortcuts';

interface DashboardClientWrapperProps {
  children: ReactNode;
}

export default function DashboardClientWrapper({ children }: DashboardClientWrapperProps) {
  // Enable global keyboard shortcuts
  useGlobalShortcuts();
  
  return (
    <>
      {children}
      {/* Keyboard shortcut helper UI */}
      <div className="fixed bottom-4 right-4 hidden md:block">
        <div className="bg-white border border-zinc-300 rounded-lg p-3 shadow-lg">
          <h3 className="text-sm font-medium text-zinc-900 mb-2">Keyboard Shortcuts</h3>
          <div className="space-y-1 text-xs text-zinc-600">
            <div className="flex justify-between">
              <span>Search</span>
              <kbd className="px-2 py-1 bg-zinc-100 border border-zinc-300 rounded text-zinc-700 font-mono">⌘K</kbd>
            </div>
            <div className="flex justify-between">
              <span>New Item</span>
              <kbd className="px-2 py-1 bg-zinc-100 border border-zinc-300 rounded text-zinc-700 font-mono">⌘N</kbd>
            </div>
            <div className="flex justify-between">
              <span>Save Form</span>
              <kbd className="px-2 py-1 bg-zinc-100 border border-zinc-300 rounded text-zinc-700 font-mono">⌘S</kbd>
            </div>
            <div className="flex justify-between">
              <span>Refresh</span>
              <kbd className="px-2 py-1 bg-zinc-100 border border-zinc-300 rounded text-zinc-700 font-mono">⌘R</kbd>
            </div>
            <div className="flex justify-between">
              <span>Close/Back</span>
              <kbd className="px-2 py-1 bg-zinc-100 border border-zinc-300 rounded text-zinc-700 font-mono">Esc</kbd>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
