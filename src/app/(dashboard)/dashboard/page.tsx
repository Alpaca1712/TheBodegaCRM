'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Target,
  Mail,
  MessageSquare,
  CalendarCheck,
  ArrowRight,
  Users,
  Crosshair,
  Loader2,
  Plus,
} from 'lucide-react';
import { PIPELINE_STAGES, STAGE_LABELS, type Lead, type PipelineStage } from '@/types/leads';
import FollowUpSuggestions from '@/components/email/follow-up-suggestions';

interface DashboardData {
  totalLeads: number;
  customerCount: number;
  investorCount: number;
  emailsSentThisWeek: number;
  repliesThisWeek: number;
  meetingsBooked: number;
  pipelineByStage: { stage: PipelineStage; count: number }[];
  recentLeads: Lead[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/leads?limit=200');
      if (!res.ok) throw new Error('Failed');
      const { data: leads, count } = await res.json();
      const allLeads: Lead[] = leads || [];

      const pipelineCounts: Record<string, number> = {};
      for (const lead of allLeads) {
        pipelineCounts[lead.stage] = (pipelineCounts[lead.stage] || 0) + 1;
      }

      setData({
        totalLeads: count || allLeads.length,
        customerCount: allLeads.filter((l: Lead) => l.type === 'customer').length,
        investorCount: allLeads.filter((l: Lead) => l.type === 'investor').length,
        emailsSentThisWeek: allLeads.filter((l: Lead) => l.stage !== 'researched' && l.stage !== 'email_drafted').length,
        repliesThisWeek: allLeads.filter((l: Lead) => l.stage === 'replied').length,
        meetingsBooked: allLeads.filter((l: Lead) => l.stage === 'meeting_booked' || l.stage === 'meeting_held').length,
        pipelineByStage: PIPELINE_STAGES.map((stage) => ({
          stage,
          count: pipelineCounts[stage] || 0,
        })),
        recentLeads: allLeads.slice(0, 5),
      });
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!data) return null;

  const stageBarColors: Record<string, string> = {
    researched: 'bg-zinc-400',
    email_drafted: 'bg-blue-500',
    email_sent: 'bg-amber-500',
    replied: 'bg-green-500',
    meeting_booked: 'bg-purple-500',
    meeting_held: 'bg-indigo-500',
    follow_up: 'bg-orange-500',
    closed_won: 'bg-emerald-500',
    closed_lost: 'bg-red-500',
    no_response: 'bg-zinc-300',
  };

  const maxCount = Math.max(...data.pipelineByStage.map((s) => s.count), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Rocoto cold email outreach</p>
        </div>
        <Link
          href="/leads/new?type=customer"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Lead
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Target className="h-5 w-5 text-red-500" />} label="Total Leads" value={data.totalLeads} href="/leads" />
        <StatCard icon={<Mail className="h-5 w-5 text-amber-500" />} label="Emails Active" value={data.emailsSentThisWeek} href="/pipeline" />
        <StatCard icon={<MessageSquare className="h-5 w-5 text-green-500" />} label="Replies" value={data.repliesThisWeek} href="/leads?stage=replied" />
        <StatCard icon={<CalendarCheck className="h-5 w-5 text-purple-500" />} label="Meetings" value={data.meetingsBooked} href="/leads?stage=meeting_booked" />
      </div>

      {/* Audience breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/leads?type=customer"
          className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Customers</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Companies shipping AI agents</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{data.customerCount}</span>
            <ArrowRight className="h-4 w-4 text-zinc-400" />
          </div>
        </Link>

        <Link
          href="/leads?type=investor"
          className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center">
              <Crosshair className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Investors</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Pre-seed / seed VCs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{data.investorCount}</span>
            <ArrowRight className="h-4 w-4 text-zinc-400" />
          </div>
        </Link>
      </div>

      {/* Pipeline Overview */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pipeline Overview</h2>
          <Link href="/pipeline" className="text-xs text-red-600 dark:text-red-400 hover:text-red-500 flex items-center gap-1">
            View board <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-2.5">
          {data.pipelineByStage.map(({ stage, count }) => (
            <div key={stage} className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 w-28 truncate">
                {STAGE_LABELS[stage]}
              </span>
              <div className="flex-1 h-5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${stageBarColors[stage]} transition-all duration-500`}
                  style={{ width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? '8px' : '0' }}
                />
              </div>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 tabular-nums w-6 text-right">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up Suggestions */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
        <FollowUpSuggestions compact />
      </div>

      {/* Recent Leads */}
      {data.recentLeads.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent Leads</h2>
            <Link href="/leads" className="text-xs text-red-600 dark:text-red-400 hover:text-red-500 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {data.recentLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{lead.contact_name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{lead.company_name}</p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                  lead.type === 'customer'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300'
                }`}>
                  {STAGE_LABELS[lead.stage]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        {icon}
        <ArrowRight className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600" />
      </div>
      <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </Link>
  );
}
