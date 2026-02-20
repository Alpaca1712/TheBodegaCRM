'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  enabled?: boolean | (() => boolean);
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const router = useRouter();
  const pathname = usePathname();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    shortcuts.forEach((shortcut) => {
      // Check if shortcut is enabled
      const enabled = typeof shortcut.enabled === 'function' 
        ? shortcut.enabled() 
        : shortcut.enabled !== false;
      
      if (!enabled) return;

      // Check modifiers
      const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
      const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey;
      const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.altKey ? event.altKey : !event.altKey;
      
      // Check key (case-insensitive)
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      
      if (ctrlMatch && metaMatch && shiftMatch && altMatch && keyMatch) {
        event.preventDefault();
        shortcut.action();
      }
    });
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export function useGlobalShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  const shortcuts: ShortcutConfig[] = [
    // Global search
    {
      key: 'k',
      metaKey: true,
      action: () => {
        // This would open the global search modal
        // For now, we'll navigate to the search page or trigger search
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: 'Focus search',
      enabled: true
    },
    // New item based on current page
    {
      key: 'n',
      metaKey: true,
      action: () => {
        // Determine which new page to navigate to based on current route
        if (pathname.startsWith('/contacts')) {
          router.push('/contacts/new');
        } else if (pathname.startsWith('/companies')) {
          router.push('/companies/new');
        } else if (pathname.startsWith('/deals')) {
          router.push('/deals/new');
        } else if (pathname.startsWith('/investors')) {
          router.push('/investors/new');
        } else if (pathname.startsWith('/email/templates')) {
          // For email templates, we need to trigger the new template modal
          const newButton = document.querySelector('button:contains("New Template"), button[aria-label*="New Template"]') as HTMLButtonElement;
          if (newButton) {
            newButton.click();
          }
        }
      },
      description: 'Create new item',
      enabled: true
    },
    // Escape to close modals or go back
    {
      key: 'Escape',
      action: () => {
        // Close any open modals
        const modals = document.querySelectorAll('[role="dialog"], .modal, .dialog');
        const openModal = Array.from(modals).find(modal => {
          const style = window.getComputedStyle(modal);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        
        if (openModal) {
          const closeButton = openModal.querySelector('button[aria-label="Close"], button:contains("Close")') as HTMLButtonElement;
          if (closeButton) {
            closeButton.click();
          }
        } else if (pathname !== '/dashboard') {
          // If no modal open, go back or to dashboard
          router.back();
        }
      },
      description: 'Close modal or go back',
      enabled: true
    },
    // Save (Ctrl/Cmd + S)
    {
      key: 's',
      metaKey: true,
      action: () => {
        // Find save button in forms
        const saveButton = document.querySelector('button:contains("Save"), button:contains("Update"), button[type="submit"]') as HTMLButtonElement;
        if (saveButton && !saveButton.disabled) {
          saveButton.click();
        }
      },
      description: 'Save form',
      enabled: () => {
        // Only enable on form pages
        return pathname.includes('/new') || pathname.includes('/edit') || pathname.includes('/[id]');
      }
    },
    // Refresh data (Cmd/Ctrl + R)
    {
      key: 'r',
      metaKey: true,
      action: () => {
        // Trigger refresh buttons if they exist
        const refreshButton = document.querySelector('button[aria-label="Refresh"], button:contains("Refresh")') as HTMLButtonElement;
        if (refreshButton) {
          refreshButton.click();
        } else {
          window.location.reload();
        }
      },
      description: 'Refresh data',
      enabled: true
    },
  ];

  useKeyboardShortcuts(shortcuts);
}
