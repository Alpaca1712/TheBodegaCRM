'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  TrendingUp,
  Mail,
  MessageSquare,
  CalendarCheck,
  Target,
  Zap,
  ArrowDown,
} from 'lucide-react';
import { STAGE_LABELS } from '@/types/leads';

interface FunnelStep { stage: string; count: number }
interface TypeRate { contacted: number; replied: number; rate: number }
interface CTAPerf { sent: number; replied: number; rate: number }
interface ChannelPerf { channel: string; touchpoints: number; leadsReached: number }

interface AnalyticsData {
  totalLeads: number;
  totalOutbound: number;
  totalInbound: number;
  leadsContacted: number;
  leadsWithReplies: number;
  replyRate: number;
  meetingsBooked: number;
  funnel: FunnelStep[];
  replyRateByType: Record<string, TypeRate>;
  ctaPerformance: Record<string, CTAPerf>;
  avgTouchpointsToReply: number;
  channelPerformance: ChannelPerf[];
  replyDayBuckets: Record<string, number>;
  weeklyTrend: { week: string; count: number }[];
  byType: { customers: number; investors: number; partnerships: number };
  bySource: { source: string; count: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
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

  const maxWeekly = Math.max(...data.weeklyTrend.map(w => w.count), 1);
  const maxReplyBucket = Math.max(...Object.values(data.replyDayBuckets), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Analytics</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Hormozi outreach performance deep dive</p>
      </div>

      {/* Top-line KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <TopMetric icon={<Mail className="h-4 w-4 text-amber-500" />} label="Emails Sent" value={data.totalOutbound} />
        <TopMetric icon={<Target className="h-4 w-4 text-blue-500" />} label="Leads Contacted" value={data.leadsContacted} />
        <TopMetric icon={<MessageSquare className="h-4 w-4 text-green-500" />} label="Reply Rate" value={`${data.replyRate.toFixed(1)}%`} />
        <TopMetric icon={<CalendarCheck className="h-4 w-4 text-purple-500" />} label="Meetings" value={data.meetingsBooked} />
        <TopMetric icon={<Zap className="h-4 w-4 text-orange-500" />} label="Avg Touchpoints" value={data.avgTouchpointsToReply || '--'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Conversion Funnel</h2>
          {data.funnel.length > 0 && data.funnel[0].count > 0 ? (
            <div className="space-y-1">
              {data.funnel.map((step, i) => {
                const maxFunnel = data.funnel[0].count || 1;
                const pct = (step.count / maxFunnel) * 100;
                const dropOff = i > 0 && data.funnel[i - 1].count > 0
                  ? Math.round(((data.funnel[i - 1].count - step.count) / data.funnel[i - 1].count) * 100)
                  : null;
                return (
                  <div key={step.stage}>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 w-28 truncate">
                        {STAGE_LABELS[step.stage as keyof typeof STAGE_LABELS] || step.stage}
                      </span>
                      <div className="flex-1 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-lg transition-all duration-700 flex items-center justify-end pr-3"
                          style={{ width: `${Math.max(pct, 8)}%` }}
                        >
                          <span className="text-[11px] font-semibold text-white">{step.count}</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-zinc-400 tabular-nums w-10 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    {dropOff !== null && dropOff > 0 && (
                      <div className="flex items-center gap-1 ml-32 my-0.5">
                        <ArrowDown className="h-3 w-3 text-red-400" />
                        <span className="text-[10px] text-red-400 font-medium">{dropOff}% drop-off</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6">No funnel data yet</p>
          )}
        </div>

        {/* Reply Rate by Type */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Reply Rate by Lead Type</h2>
          <div className="space-y-4">
            {Object.entries(data.replyRateByType).map(([type, stats]) => {
              const colors: Record<string, { bar: string; text: string }> = {
                customer: { bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
                investor: { bar: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
                partnership: { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
              };
              const c = colors[type] || colors.customer;
              const label = type === 'customer' ? 'Customers' : type === 'investor' ? 'Investors' : 'Partnerships';
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
                    <span className={`text-xs font-semibold tabular-nums ${c.text}`}>{stats.rate.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${c.bar} rounded-full transition-all duration-500`} style={{ width: `${Math.max(stats.rate, stats.contacted > 0 ? 3 : 0)}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">{stats.replied} replies from {stats.contacted} contacted</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Performance */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">CTA Performance: McKenna vs Hormozi</h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(data.ctaPerformance).map(([cta, stats]) => {
              const isMck = cta === 'mckenna';
              return (
                <div key={cta} className={`p-4 rounded-lg ${isMck ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                  <p className={`text-xs font-semibold mb-2 ${isMck ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300'}`}>
                    {isMck ? 'McKenna CTA' : 'Hormozi CTA'}
                  </p>
                  <p className={`text-2xl font-bold tabular-nums ${isMck ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                    {stats.rate.toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    {stats.replied} replies / {stats.sent} sent
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Channel Performance */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Channel Performance</h2>
          {data.channelPerformance.length > 0 ? (
            <div className="space-y-3">
              {data.channelPerformance.map(ch => {
                const maxTp = Math.max(...data.channelPerformance.map(c => c.touchpoints), 1);
                const labels: Record<string, string> = { email: 'Email', linkedin: 'LinkedIn', twitter: 'Twitter/X', phone: 'Phone' };
                return (
                  <div key={ch.channel}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{labels[ch.channel] || ch.channel}</span>
                      <span className="text-[11px] text-zinc-500 tabular-nums">{ch.touchpoints} touchpoints, {ch.leadsReached} leads</span>
                    </div>
                    <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${(ch.touchpoints / maxTp) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6">No channel data yet</p>
          )}
        </div>

        {/* Time-to-Reply Distribution */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Time to Reply (days)</h2>
          <div className="flex items-end gap-2 h-32">
            {Object.entries(data.replyDayBuckets).map(([bucket, count]) => (
              <div key={bucket} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">{count}</span>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-t-md overflow-hidden" style={{ height: '100%' }}>
                  <div
                    className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-md transition-all duration-500"
                    style={{ height: `${maxReplyBucket > 0 ? (count / maxReplyBucket) * 100 : 0}%`, marginTop: 'auto' }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{bucket}d</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Outreach Trend */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Weekly Outreach Volume</h2>
          <div className="flex items-end gap-1.5 h-32">
            {data.weeklyTrend.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">{w.count}</span>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-t-md overflow-hidden" style={{ height: '100%' }}>
                  <div
                    className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-md transition-all duration-500"
                    style={{ height: `${(w.count / maxWeekly) * 100}%`, marginTop: 'auto' }}
                  />
                </div>
                <span className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate w-full text-center">{w.week}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Type */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Lead Breakdown</h2>
          <div className="flex gap-3">
            <div className="flex-1 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
              <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">{data.byType.customers}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Customers</p>
            </div>
            <div className="flex-1 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-center">
              <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">{data.byType.investors}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400">Investors</p>
            </div>
            <div className="flex-1 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-center">
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{data.byType.partnerships}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Partnerships</p>
            </div>
          </div>
        </div>

        {/* By Source */}
        {data.bySource.length > 0 && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">By Source</h2>
            <div className="space-y-1.5">
              {data.bySource.slice(0, 8).map(({ source, count }) => (
                <div key={source} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{source}</span>
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TopMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50">
      <div className="mb-2">{icon}</div>
      <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}
