'use client';

import { ReactNode } from 'react';
import { useGlobalShortcuts } from '@/hooks/use-keyboard-shortcuts';

interface DashboardClientWrapperProps {
  children: ReactNode;
}

export default function DashboardClientWrapper({ children }: DashboardClientWrapperProps) {
  // Enable global keyboard shortcuts
  useGlobalShortcuts();
  
  return <>{children}</>;
}
