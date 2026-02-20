'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/header';
import DashboardClientWrapper from '@/components/layout/dashboard-client-wrapper';
import MobileBottomNav from '@/components/layout/mobile-bottom-nav';
import { useNotificationBadges } from '@/hooks/use-notification-badges';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
}

export default function DashboardLayoutClient({ 
  children, 
  userEmail, 
  userName 
}: DashboardLayoutClientProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { badges, loading } = useNotificationBadges();
  
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };
  
  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardClientWrapper>
        {/* Sidebar - hidden on mobile */}
        <div className="hidden md:block fixed inset-y-0 left-0 w-64 bg-slate-900 text-white">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white">TheBodegaCRM</h1>
            <p className="text-slate-400 text-sm mt-1">Customer Relationship Management</p>
          </div>
          <nav className="mt-6 px-4">
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                  <span>🏠</span>
                  <span>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                  <span>👤</span>
                  <span>Contacts</span>
                </Link>
              </li>
              <li>
                <Link href="/companies" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                  <span>🏢</span>
                  <span>Companies</span>
                </Link>
              </li>
              <li>
                <Link href="/deals" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                  <span>💰</span>
                  <span>Deals</span>
                  {!loading && badges && badges.staleDeals > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {badges.staleDeals}
                    </span>
                  )}
                </Link>
              </li>
              <li>
                <Link href="/activities" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                  <span>📅</span>
                  <span>Activities</span>
                  {!loading && badges && badges.overdueTasks > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {badges.overdueTasks}
                    </span>
                  )}
                </Link>
              </li>
              <li>
                <Link href="/investors" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                  <span>🏦</span>
                  <span>Investors</span>
                </Link>
              </li>
              <li>
                <Link href="/email" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                  <span>📧</span>
                  <span>Email AI</span>
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                  <span>📊</span>
                  <span>Analytics</span>
                </Link>
              </li>
              <li>
                <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                  <span>⚙️</span>
                  <span>Settings</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        
        {/* Main content with header */}
        <div className="flex-1 md:ml-64 flex flex-col">
          <Header userEmail={userEmail} userName={userName} />
          <main className="flex-1 p-4 md:p-6 pb-16 md:pb-6">
            {children}
          </main>
        </div>
        
        {/* Mobile bottom navigation */}
        <MobileBottomNav 
          isSidebarOpen={isMobileSidebarOpen}
          onToggleSidebar={toggleMobileSidebar}
        />
      </DashboardClientWrapper>
    </div>
  );
}
