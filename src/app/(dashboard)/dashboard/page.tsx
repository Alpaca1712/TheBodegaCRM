'use client';

import { useState, useEffect, useCallback } from 'react';
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
  HeartPulse,
  AlertTriangle,
  Shield,
  Users,
  Crosshair,
  Handshake,
  Sparkles,
} from 'lucide-react';
import { PIPELINE_STAGES, STAGE_LABELS, LEAD_TYPE_COLORS, type Lead } from '@/types/leads';
import FollowUpSuggestions from '@/components/email/follow-up-suggestions';
import { toast } from 'sonner';

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

interface PipelineHealthData {
  overall_score: number;
  at_risk_count: number;
  healthy_count: number;
  leads: Array<{
    lead_id: string;
    contact_name: string;
    company_name: string;
    stage: string;
    risk_score: number;
    risk_factors: string[];
    recommendation: string;
  }>;
  ai_summary: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [health, setHealth] = useState<PipelineHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string>('all');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = activeType !== 'all' ? `?type=${activeType}` : '';
      const [dashRes, healthData] = await Promise.all([
        fetch(`/api/dashboard${query}`),
        fetch(`/api/ai/pipeline-health${query}`).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (!dashRes.ok) throw new Error(`Dashboard request failed (${dashRes.status})`);
      const dashData = await dashRes.json();
      setData(dashData);
      setHealth(healthData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [activeType]);

  useEffect(() => { loadDashboard(); }, [loadDashboard, activeType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{error || 'Failed to load dashboard data'}</p>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

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

  const healthColor = health
    ? health.overall_score >= 70 ? 'text-emerald-500' : health.overall_score >= 40 ? 'text-amber-500' : 'text-red-500'
    : 'text-zinc-400';

  const healthBg = health
    ? health.overall_score >= 70 ? 'bg-emerald-50 dark:bg-emerald-950/30' : health.overall_score >= 40 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-red-50 dark:bg-red-950/30'
    : 'bg-zinc-50 dark:bg-zinc-800';

  const leadTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string; subtext: string }> = {
    all: { label: 'Overall Funnel', icon: <Target className="h-5 w-5" />, color: 'text-zinc-500', subtext: 'Total pipeline metrics' },
    customer: { label: 'Customer Motion', icon: <Users className="h-5 w-5" />, color: 'text-blue-500', subtext: 'Reaching teams shipping AI' },
    investor: { label: 'Investor Motion', icon: <Crosshair className="h-5 w-5" />, color: 'text-purple-500', subtext: 'VC and angel outreach' },
    partnership: { label: 'Partnerships', icon: <Handshake className="h-5 w-5" />, color: 'text-emerald-500', subtext: 'Strategic alliances' },
  };

  const currentConfig = leadTypeConfig[activeType] || leadTypeConfig.all;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`h-12 w-12 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-sm ${currentConfig.color}`}>
            {currentConfig.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{currentConfig.label}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{currentConfig.subtext}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
            {Object.keys(leadTypeConfig).map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeType === type
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <Link
            href={`/leads/new?type=${activeType === 'all' ? 'customer' : activeType}`}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-lg transition-all shadow-sm shadow-red-600/20"
          >
            <Plus className="h-3.5 w-3.5" />
            New Lead
          </Link>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<Send className="h-4 w-4" />}
          iconBg="bg-amber-50 dark:bg-amber-950/40"
          iconColor="text-amber-600 dark:text-amber-400"
          label="Outreach This Week"
          value={data.outreachThisWeek}
          trend={outreachTrend}
          subtext={`${data.totalOutbound} total sent`}
          href="/pipeline"
        />
        <KPICard
          icon={<MessageSquare className="h-4 w-4" />}
          iconBg="bg-green-50 dark:bg-green-950/40"
          iconColor="text-green-600 dark:text-green-400"
          label="Reply Rate"
          value={`${data.replyRate.toFixed(1)}%`}
          subtext={`${data.leadsWithReplies} of ${data.leadsContacted} replied`}
          href="/leads?stage=replied"
        />
        <KPICard
          icon={<CalendarCheck className="h-4 w-4" />}
          iconBg="bg-purple-50 dark:bg-purple-950/40"
          iconColor="text-purple-600 dark:text-purple-400"
          label="Meeting Conversion"
          value={`${data.meetingConversion.toFixed(0)}%`}
          subtext={`${data.meetingsBooked} meetings from replies`}
          href="/leads?stage=meeting_booked"
        />
        <KPICard
          icon={<Target className="h-4 w-4" />}
          iconBg="bg-red-50 dark:bg-red-950/40"
          iconColor="text-red-600 dark:text-red-400"
          label="Active Pipeline"
          value={data.activePipeline}
          subtext={`${data.closedWon} closed won`}
          href="/pipeline"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniKPI icon={<Clock className="h-3.5 w-3.5 text-blue-500" />} label="Avg Days to Reply" value={data.avgDaysToReply > 0 ? `${data.avgDaysToReply}d` : '--'} />
        <MiniKPI icon={<Zap className="h-3.5 w-3.5 text-amber-500" />} label="Avg Touchpoints" value={data.avgTouchpoints > 0 ? data.avgTouchpoints.toString() : '--'} />
        <MiniKPI icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />} label="Follow-up Compliance" value={`${data.followUpCompliance}%`} />
        <MiniKPI icon={<TrendingUp className="h-3.5 w-3.5 text-purple-500" />} label="Total Leads" value={data.totalLeads.toString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pipeline Overview */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pipeline</h2>
            <Link href="/pipeline" className="text-xs text-red-600 dark:text-red-400 hover:text-red-500 flex items-center gap-1 font-medium">
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

        {/* Pipeline Health */}
        <div className={`rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 ${healthBg} p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className={`h-4 w-4 ${healthColor}`} />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pipeline Health</h2>
          </div>
          {health ? (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <span className={`text-3xl font-bold tabular-nums ${healthColor}`}>{health.overall_score}</span>
                <span className="text-xs text-zinc-500">/100</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">{health.ai_summary}</p>
              <div className="flex gap-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{health.at_risk_count} at risk</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{health.healthy_count} healthy</span>
                </div>
              </div>
              {health.leads.filter(l => l.risk_score > 30).slice(0, 3).map(lead => (
                <Link
                  key={lead.lead_id}
                  href={`/leads/${lead.lead_id}`}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/50 dark:hover:bg-zinc-800/50 transition-colors mb-1"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{lead.contact_name}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{lead.risk_factors[0]}</p>
                  </div>
                  <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
                    lead.risk_score > 50 ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                  }`}>
                    {lead.risk_score}
                  </span>
                </Link>
              ))}
            </>
          ) : (
            <p className="text-xs text-zinc-500 text-center py-6">Loading health data...</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hot Leads */}
        <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Hot Leads</h2>
          </div>
          {data.hotLeads.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-6">No hot leads this week</p>
          ) : (
            <div className="space-y-1">
              {data.hotLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{lead.contact_name}</p>
                      {lead.icp_score != null && lead.icp_score >= 80 && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 uppercase tracking-tight">
                          High ICP
                        </span>
                      )}
                      {lead.conversation_signals?.some(s => s.type === 'positive' && (Date.now() - new Date(s.detected_at).getTime() < 7 * 86400000)) && (
                        <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
                      )}
                    </div>
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

        {/* Audience Breakdown */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Audience</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link href="/leads?type=customer" className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">{data.byType.customers}</p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1 font-medium">Customers</p>
            </Link>
            <Link href="/leads?type=investor" className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">{data.byType.investors}</p>
              <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1 font-medium">Investors</p>
            </Link>
            <Link href="/leads?type=partnership" className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{data.byType.partnerships}</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1 font-medium">Partnerships</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Follow-up Suggestions */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5">
        <FollowUpSuggestions compact typeFilter={activeType} />
      </div>
    </div>
  );
}

function KPICard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  trend,
  subtext,
  href,
}: {
  icon: React.ReactNode;
  iconBg: string;
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
      className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-all hover:shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`h-8 w-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <div className={iconColor}>{icon}</div>
        </div>
        {trend !== undefined && trend !== 0 && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(Math.round(trend))}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">{value}</p>
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">{label}</p>
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
    <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50">
      <div className="h-7 w-7 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</p>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{label}</p>
      </div>
    </div>
  );
}
