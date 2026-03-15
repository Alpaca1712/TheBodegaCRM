'use client';

import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Mail, MessageSquare, CalendarCheck, Clock, Target } from 'lucide-react';
import { PIPELINE_STAGES, STAGE_LABELS, type Lead, type PipelineStage } from '@/types/leads';

interface AnalyticsData {
  totalLeads: number;
  totalEmailsSent: number;
  totalReplies: number;
  totalMeetings: number;
  replyRate: number;
  meetingConversionRate: number;
  avgDaysToReply: number;
  avgDaysToMeeting: number;
  byType: { customers: number; investors: number; partnerships: number };
  byPriority: { high: number; medium: number; low: number };
  byStage: { stage: PipelineStage; count: number }[];
  bySource: { source: string; count: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/leads?limit=500');
      if (!res.ok) throw new Error('Failed');
      const { data: leads } = await res.json();
      const allLeads: Lead[] = leads || [];

      const emailSent = allLeads.filter((l) =>
        !['researched', 'email_drafted'].includes(l.stage)
      ).length;

      const replied = allLeads.filter((l) =>
        ['replied', 'meeting_booked', 'meeting_held', 'closed_won'].includes(l.stage)
      ).length;

      const meetings = allLeads.filter((l) =>
        ['meeting_booked', 'meeting_held', 'closed_won'].includes(l.stage)
      ).length;

      const sourceCounts: Record<string, number> = {};
      for (const lead of allLeads) {
        const src = lead.source || 'Unknown';
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      }

      const stageCounts: Record<string, number> = {};
      for (const lead of allLeads) {
        stageCounts[lead.stage] = (stageCounts[lead.stage] || 0) + 1;
      }

      setData({
        totalLeads: allLeads.length,
        totalEmailsSent: emailSent,
        totalReplies: replied,
        totalMeetings: meetings,
        replyRate: emailSent > 0 ? (replied / emailSent) * 100 : 0,
        meetingConversionRate: replied > 0 ? (meetings / replied) * 100 : 0,
        avgDaysToReply: 0,
        avgDaysToMeeting: 0,
        byType: {
          customers: allLeads.filter((l) => l.type === 'customer').length,
          investors: allLeads.filter((l) => l.type === 'investor').length,
          partnerships: allLeads.filter((l) => l.type === 'partnership').length,
        },
        byPriority: {
          high: allLeads.filter((l) => l.priority === 'high').length,
          medium: allLeads.filter((l) => l.priority === 'medium').length,
          low: allLeads.filter((l) => l.priority === 'low').length,
        },
        byStage: PIPELINE_STAGES.map((stage) => ({
          stage,
          count: stageCounts[stage] || 0,
        })),
        bySource: Object.entries(sourceCounts)
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count),
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Analytics</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Cold email outreach performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Mail className="h-5 w-5 text-amber-500" />}
          label="Emails Sent"
          value={data.totalEmailsSent.toString()}
        />
        <MetricCard
          icon={<MessageSquare className="h-5 w-5 text-green-500" />}
          label="Reply Rate"
          value={`${data.replyRate.toFixed(1)}%`}
          subtext={`${data.totalReplies} replies`}
        />
        <MetricCard
          icon={<CalendarCheck className="h-5 w-5 text-purple-500" />}
          label="Meeting Rate"
          value={`${data.meetingConversionRate.toFixed(1)}%`}
          subtext={`${data.totalMeetings} meetings`}
        />
        <MetricCard
          icon={<Target className="h-5 w-5 text-red-500" />}
          label="Total Leads"
          value={data.totalLeads.toString()}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Pipeline Funnel</h2>
          <div className="space-y-3">
            {data.byStage.filter((s) => s.count > 0).map(({ stage, count }) => {
              const maxCount = Math.max(...data.byStage.map((s) => s.count), 1);
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 w-28 truncate">
                    {STAGE_LABELS[stage]}
                  </span>
                  <div className="flex-1 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max((count / maxCount) * 100, 10)}%` }}
                    >
                      <span className="text-[10px] font-semibold text-white">{count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {data.byStage.every((s) => s.count === 0) && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">No data yet</p>
            )}
          </div>
        </div>

        {/* By Type */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Lead Breakdown</h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">By Type</p>
              <div className="flex gap-3">
                <div className="flex-1 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">{data.byType.customers}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Customers</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                  <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">{data.byType.investors}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">Investors</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                  <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{data.byType.partnerships}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Partnerships</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">By Priority</p>
              <div className="flex gap-3">
                <div className="flex-1 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                  <p className="text-lg font-semibold text-red-700 dark:text-red-300">{data.byPriority.high}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">High</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">{data.byPriority.medium}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Medium</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                  <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">{data.byPriority.low}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Low</p>
                </div>
              </div>
            </div>

            {data.bySource.length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">By Source</p>
                <div className="space-y-1.5">
                  {data.bySource.slice(0, 6).map(({ source, count }) => (
                    <div key={source} className="flex items-center justify-between py-1 px-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">{source}</span>
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversion Metrics */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Conversion Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ConversionStep
            label="Emails Sent"
            value={data.totalEmailsSent}
            arrow
          />
          <ConversionStep
            label="Replies"
            value={data.totalReplies}
            rate={data.replyRate}
            arrow
          />
          <ConversionStep
            label="Meetings"
            value={data.totalMeetings}
            rate={data.meetingConversionRate}
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50">
      <div className="mb-2">{icon}</div>
      <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      {subtext && <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{subtext}</p>}
    </div>
  );
}

function ConversionStep({
  label,
  value,
  rate,
  arrow,
}: {
  label: string;
  value: number;
  rate?: number;
  arrow?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 text-center p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800">
        <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
        {rate !== undefined && (
          <p className="text-[11px] text-green-600 dark:text-green-400 mt-1 flex items-center justify-center gap-0.5">
            <TrendingUp className="h-3 w-3" />
            {rate.toFixed(1)}%
          </p>
        )}
      </div>
      {arrow && (
        <div className="text-zinc-300 dark:text-zinc-600 hidden md:block">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
}
