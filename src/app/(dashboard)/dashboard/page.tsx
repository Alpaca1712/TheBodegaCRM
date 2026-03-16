'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Send,
  MessageSquare,
  CalendarCheck,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Plus,
  Flame,
  Clock,
  CheckCircle2,
  Zap,
  Target,
  TrendingUp,
} from 'lucide-react';
import { PIPELINE_STAGES, STAGE_LABELS, LEAD_TYPE_COLORS, type Lead, type PipelineStage } from '@/types/leads';
import FollowUpSuggestions from '@/components/email/follow-up-suggestions';

interface DashboardData {
  totalLeads: number;
  outreachThisWeek: number;
  outreachLastWeek: number;
  totalOutbound: number;
  totalInbound: number;
  leadsContacted: number;
  leadsWithReplies: number;
  replyRate: number;
  meetingsBooked: number;
  meetingConversion: number;
  avgDaysToReply: number;
  followUpCompliance: number;
  avgTouchpoints: number;
  hotLeads: Lead[];
  pipelineCounts: Record<string, number>;
  byType: { customers: number; investors: number; partnerships: number };
  closedWon: number;
  activePipeline: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!data) return null;

  const outreachTrend = data.outreachLastWeek > 0
    ? ((data.outreachThisWeek - data.outreachLastWeek) / data.outreachLastWeek) * 100
    : data.outreachThisWeek > 0 ? 100 : 0;

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

  const maxCount = Math.max(...Object.values(data.pipelineCounts), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Outreach Command Center</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Hormozi metrics that matter</p>
        </div>
        <Link
          href="/leads/new?type=customer"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Lead
        </Link>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<Send className="h-4.5 w-4.5" />}
          iconColor="text-amber-500"
          label="Outreach This Week"
          value={data.outreachThisWeek}
          trend={outreachTrend}
          subtext={`${data.totalOutbound} total sent`}
          href="/pipeline"
        />
        <KPICard
          icon={<MessageSquare className="h-4.5 w-4.5" />}
          iconColor="text-green-500"
          label="Reply Rate"
          value={`${data.replyRate.toFixed(1)}%`}
          subtext={`${data.leadsWithReplies} of ${data.leadsContacted} replied`}
          href="/leads?stage=replied"
        />
        <KPICard
          icon={<CalendarCheck className="h-4.5 w-4.5" />}
          iconColor="text-purple-500"
          label="Meeting Conversion"
          value={`${data.meetingConversion.toFixed(0)}%`}
          subtext={`${data.meetingsBooked} meetings from replies`}
          href="/leads?stage=meeting_booked"
        />
        <KPICard
          icon={<Target className="h-4.5 w-4.5" />}
          iconColor="text-red-500"
          label="Active Pipeline"
          value={data.activePipeline}
          subtext={`${data.closedWon} closed won`}
          href="/pipeline"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniKPI
          icon={<Clock className="h-3.5 w-3.5 text-blue-500" />}
          label="Avg Days to Reply"
          value={data.avgDaysToReply > 0 ? `${data.avgDaysToReply}d` : '--'}
        />
        <MiniKPI
          icon={<Zap className="h-3.5 w-3.5 text-amber-500" />}
          label="Avg Touchpoints"
          value={data.avgTouchpoints > 0 ? data.avgTouchpoints.toString() : '--'}
        />
        <MiniKPI
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
          label="Follow-up Compliance"
          value={`${data.followUpCompliance}%`}
        />
        <MiniKPI
          icon={<TrendingUp className="h-3.5 w-3.5 text-purple-500" />}
          label="Total Leads"
          value={data.totalLeads.toString()}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Overview */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pipeline</h2>
            <Link href="/pipeline" className="text-xs text-red-600 dark:text-red-400 hover:text-red-500 flex items-center gap-1">
              Board view <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {PIPELINE_STAGES.map((stage) => {
              const count = data.pipelineCounts[stage] || 0;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 w-24 truncate">
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
              );
            })}
          </div>
        </div>

        {/* Hot Leads */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Hot Leads</h2>
          </div>
          {data.hotLeads.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-6">No hot leads this week</p>
          ) : (
            <div className="space-y-2">
              {data.hotLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{lead.contact_name}</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{lead.company_name}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${LEAD_TYPE_COLORS[lead.type].bg} ${LEAD_TYPE_COLORS[lead.type].text}`}>
                    {STAGE_LABELS[lead.stage]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audience Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/leads?type=customer" className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-center">
          <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{data.byType.customers}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Customers</p>
        </Link>
        <Link href="/leads?type=investor" className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-center">
          <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400 tabular-nums">{data.byType.investors}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Investors</p>
        </Link>
        <Link href="/leads?type=partnership" className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-center">
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{data.byType.partnerships}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Partnerships</p>
        </Link>
      </div>

      {/* Follow-up Suggestions */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
        <FollowUpSuggestions compact />
      </div>
    </div>
  );
}

function KPICard({
  icon,
  iconColor,
  label,
  value,
  trend,
  subtext,
  href,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: number | string;
  trend?: number;
  subtext: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={iconColor}>{icon}</div>
        {trend !== undefined && trend !== 0 && (
          <span className={`flex items-center gap-0.5 text-[11px] font-medium ${trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(Math.round(trend))}%
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{label}</p>
      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">{subtext}</p>
    </Link>
  );
}

function MiniKPI({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50">
      {icon}
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</p>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</p>
      </div>
    </div>
  );
}
