'use client';

import { useAnalytics } from '@/hooks/use-analytics';
import { useAiLtvCac } from '@/hooks/use-ai-ltv-cac';
import {
  BarChart3, TrendingUp, DollarSign, Target, Sparkles,
  ArrowUpRight, ArrowDownRight, CheckCircle2, AlertTriangle,
} from 'lucide-react';

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-zinc-400',
  qualified: 'bg-blue-500',
  proposal: 'bg-indigo-500',
  negotiation: 'bg-amber-500',
  closed_won: 'bg-emerald-500',
  closed_lost: 'bg-red-400',
};

export default function AnalyticsPage() {
  const { data, isLoading, error } = useAnalytics();
  const { data: aiData, isLoading: aiLoading } = useAiLtvCac();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Analytics</h1>
          <p className="text-sm text-zinc-500 mt-1">Revenue, pipeline, and growth metrics</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
              <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse mb-3" />
              <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Analytics</h1>
        <div className="mt-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
          {error.message}
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...(data?.revenueByMonth?.map(m => m.revenue) || [1]), 1);
  const funnelMax = Math.max(...(data?.funnelData?.map(f => f.count) || [1]), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Analytics</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Revenue, pipeline, and growth metrics</p>
        </div>
        <a
          href="/analytics/costs"
          className="px-3 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Track Costs
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Avg. Customer LTV"
          value={`$${Math.round(data?.avgLtv || 0).toLocaleString()}`}
          sub="Lifetime revenue per customer"
          icon={DollarSign}
          accent="indigo"
        />
        <MetricCard
          label="Avg. CAC"
          value={`$${Math.round(data?.avgCac || 0).toLocaleString()}`}
          sub="Cost to acquire a customer"
          icon={Target}
          accent="amber"
        />
        <MetricCard
          label="LTV:CAC Ratio"
          value={`${(data?.ltvCacRatio || 0).toFixed(1)}x`}
          sub={data?.ltvCacRatio && data.ltvCacRatio >= 3 ? 'Healthy (3x+ is good)' : 'Aim for 3x or higher'}
          icon={TrendingUp}
          accent={data?.ltvCacRatio && data.ltvCacRatio >= 3 ? 'emerald' : 'rose'}
        />
        <MetricCard
          label="Revenue (30d)"
          value={`$${(data?.revenue30d || 0).toLocaleString()}`}
          sub="From closed-won deals"
          icon={BarChart3}
          accent="blue"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by Month */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-white text-sm">Revenue by Month</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Closed-won deal value</p>
          </div>
          <div className="p-5">
            {data?.revenueByMonth && data.revenueByMonth.some(m => m.revenue > 0) ? (
              <div className="flex items-end gap-3 h-40">
                {data.revenueByMonth.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                      ${m.revenue >= 1000 ? `${(m.revenue / 1000).toFixed(0)}k` : m.revenue}
                    </span>
                    <div className="w-full relative" style={{ height: '100px' }}>
                      <div
                        className="absolute bottom-0 w-full bg-indigo-500 dark:bg-indigo-400 rounded-t-md transition-all duration-500"
                        style={{ height: `${Math.max((m.revenue / maxRevenue) * 100, 2)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{m.month}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
                Close deals to see revenue data
              </div>
            )}
          </div>
        </div>

        {/* LTV vs CAC Trend */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-white text-sm">LTV vs CAC Trend</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Last 6 months</p>
          </div>
          <div className="p-5">
            {data?.ltvCacTrend && data.ltvCacTrend.some(m => m.ltv > 0 || m.cac > 0) ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500" /> LTV</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> CAC</span>
                </div>
                {data.ltvCacTrend.map((m) => {
                  const maxVal = Math.max(...data.ltvCacTrend!.map(t => Math.max(t.ltv, t.cac)), 1);
                  return (
                    <div key={m.month} className="space-y-1">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{m.month}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(m.ltv / maxVal) * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-zinc-500 w-10 text-right">${m.ltv.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(m.cac / maxVal) * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-zinc-500 w-10 text-right">${m.cac.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
                Track costs and close deals to see trends
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deal Funnel */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-white text-sm">Deal Conversion Funnel</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Current pipeline distribution</p>
        </div>
        <div className="p-5 space-y-3">
          {data?.funnelData?.map((item) => (
            <div key={item.stage} className="flex items-center gap-3">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 w-24 text-right">
                {STAGE_LABELS[item.stage] || item.stage}
              </span>
              <div className="flex-1 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden relative">
                <div
                  className={`h-full rounded-md transition-all duration-500 ${STAGE_COLORS[item.stage] || 'bg-zinc-400'}`}
                  style={{ width: `${Math.max((item.count / funnelMax) * 100, item.count > 0 ? 3 : 0)}%` }}
                />
                {item.count > 0 && (
                  <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-semibold text-white drop-shadow-sm">
                    {item.count}
                  </span>
                )}
              </div>
            </div>
          ))}
          {(!data?.funnelData || data.funnelData.every(f => f.count === 0)) && (
            <p className="text-center text-sm text-zinc-400 dark:text-zinc-500 py-4">
              Create deals to see your pipeline funnel
            </p>
          )}
        </div>
      </div>

      {/* AI Insights */}
      {aiLoading && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Sparkles className="h-4 w-4 animate-pulse text-indigo-500" />
            Analyzing your metrics...
          </div>
        </div>
      )}
      {aiData && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-indigo-200 dark:border-indigo-800/50">
          <div className="px-5 py-4 border-b border-indigo-100 dark:border-indigo-900/50">
            <h2 className="font-semibold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              AI Business Intelligence
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{aiData.summary}</p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                </h4>
                <ul className="space-y-1.5">
                  {aiData.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Recommendations
                </h4>
                <ul className="space-y-1.5">
                  {aiData.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <ArrowDownRight className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  const iconColors: Record<string, string> = {
    indigo: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950',
    amber: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950',
    emerald: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950',
    rose: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950',
    blue: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950',
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</span>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${iconColors[accent] || iconColors.indigo}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{sub}</p>
    </div>
  );
}
