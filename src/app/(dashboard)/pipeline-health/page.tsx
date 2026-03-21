'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { HeartPulse, AlertTriangle, Shield, Loader2, RefreshCw, ArrowRight, Sparkles } from 'lucide-react';
import { STAGE_LABELS, type PipelineStage } from '@/types/leads';

interface LeadRisk {
  lead_id: string;
  contact_name: string;
  company_name: string;
  stage: string;
  risk_score: number;
  risk_factors: string[];
  recommendation: string;
}

interface PipelineHealthData {
  overall_score: number;
  total_leads: number;
  at_risk_count: number;
  healthy_count: number;
  leads: LeadRisk[];
  ai_summary: string;
}

export default function PipelineHealthPage() {
  const [data, setData] = useState<PipelineHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/pipeline-health');
      if (res.ok) {
        const result = await res.json();
        setData(result);
        return result;
      }
    } catch { /* ignore */ }
    return null;
  }, []);

  const fetchAiRecommendations = useCallback(async (leads: LeadRisk[]) => {
    const riskyIds = leads.filter(l => l.risk_score > 15).slice(0, 10).map(l => l.lead_id);
    if (riskyIds.length === 0) return;

    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/pipeline-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: riskyIds }),
      });
      if (res.ok) {
        const { recommendations } = await res.json();
        if (Array.isArray(recommendations) && recommendations.length > 0) {
          setData(prev => {
            if (!prev) return prev;
            const updated = { ...prev, leads: prev.leads.map(l => {
              const rec = recommendations.find((r: { lead_id: string; recommendation: string }) => r.lead_id === l.lead_id);
              return rec ? { ...l, recommendation: rec.recommendation } : l;
            })};
            return updated;
          });
        }
      }
    } catch { /* ignore */ } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth().then(result => {
      setLoading(false);
      if (result?.leads) fetchAiRecommendations(result.leads);
    });
  }, [fetchHealth, fetchAiRecommendations]);

  const handleRefresh = async () => {
    const result = await fetchHealth();
    if (result?.leads) fetchAiRecommendations(result.leads);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!data) return <p className="text-sm text-zinc-500 text-center py-20">Failed to load pipeline health.</p>;

  const scoreColor = data.overall_score >= 70 ? 'text-emerald-500' : data.overall_score >= 40 ? 'text-amber-500' : 'text-red-500';
  const scoreBg = data.overall_score >= 70 ? 'from-emerald-500/10 to-emerald-500/5' : data.overall_score >= 40 ? 'from-amber-500/10 to-amber-500/5' : 'from-red-500/10 to-red-500/5';

  const riskBuckets = {
    critical: data.leads.filter(l => l.risk_score > 50),
    warning: data.leads.filter(l => l.risk_score > 15 && l.risk_score <= 50),
    healthy: data.leads.filter(l => l.risk_score <= 15),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Pipeline Health</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Risk assessment across your active pipeline</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Health Score Hero */}
      <div className={`rounded-2xl bg-linear-to-br ${scoreBg} border border-zinc-200/80 dark:border-zinc-700/80 p-6`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HeartPulse className={`h-5 w-5 ${scoreColor}`} />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Overall Health</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-bold tabular-nums ${scoreColor}`}>{data.overall_score}</span>
              <span className="text-lg text-zinc-400 font-medium">/100</span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 max-w-lg leading-relaxed">{data.ai_summary}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/40 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{data.at_risk_count}</p>
              <p className="text-[10px] text-zinc-500">At Risk</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 mb-1">
                <Shield className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{data.healthy_count}</p>
              <p className="text-[10px] text-zinc-500">Healthy</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI loading indicator */}
      {aiLoading && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
          <Sparkles className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Generating AI recommendations...</span>
        </div>
      )}

      {/* Risk Buckets */}
      {riskBuckets.critical.length > 0 && (
        <RiskSection title="Critical" subtitle="Immediate attention needed" color="red" leads={riskBuckets.critical} />
      )}
      {riskBuckets.warning.length > 0 && (
        <RiskSection title="Warning" subtitle="Starting to go cold" color="amber" leads={riskBuckets.warning} />
      )}
      {riskBuckets.healthy.length > 0 && (
        <RiskSection title="Healthy" subtitle="On track" color="emerald" leads={riskBuckets.healthy} />
      )}
    </div>
  );
}

function RiskSection({ title, subtitle, color, leads }: {
  title: string;
  subtitle: string;
  color: 'red' | 'amber' | 'emerald';
  leads: LeadRisk[];
}) {
  const colorMap = {
    red: { dot: 'bg-red-500', badge: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-900/50' },
    amber: { dot: 'bg-amber-500', badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/50' },
    emerald: { dot: 'bg-emerald-500', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/50' },
  };
  const c = colorMap[color];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-2 w-2 rounded-full ${c.dot}`} />
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        <span className="text-xs text-zinc-500">({leads.length})</span>
        <span className="text-[11px] text-zinc-400">{subtitle}</span>
      </div>
      <div className="space-y-2">
        {leads.map(lead => (
          <Link
            key={lead.lead_id}
            href={`/leads/${lead.lead_id}`}
            className={`flex items-center justify-between p-4 rounded-xl border ${c.border} bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{lead.contact_name}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                  {STAGE_LABELS[lead.stage as PipelineStage] || lead.stage}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{lead.company_name}</p>
              {lead.risk_factors.length > 0 && (
                <p className="text-[11px] text-zinc-400 mt-1">{lead.risk_factors.join(' / ')}</p>
              )}
              {lead.recommendation && (
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-2.5 py-1.5 leading-relaxed">
                  {lead.recommendation}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 ml-4">
              <span className={`text-xs font-bold tabular-nums px-2 py-1 rounded-lg ${c.badge}`}>
                {lead.risk_score}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
