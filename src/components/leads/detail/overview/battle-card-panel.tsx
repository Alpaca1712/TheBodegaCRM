'use client';

import { useState } from 'react';
import { Swords, ChevronDown, Target } from 'lucide-react';

export function BattleCardPanel({ card, defaultExpanded = true }: { card: Record<string, unknown>; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bc = card as {
    company_overview?: string; their_product?: string;
    their_strengths?: string[]; their_weaknesses?: string[];
    competitive_landscape?: string[]; our_angle?: string;
    objection_handlers?: Array<{ objection: string; response: string }>;
    discovery_questions?: string[]; trigger_events?: string[];
    icp_score?: number; icp_reasons?: string[]; pricing_intel?: string; tech_stack?: string[];
    decision_makers?: Array<{ role: string; concerns: string; pitch_angle: string }>;
  };

  const hasContent = bc.our_angle || bc.their_product || bc.company_overview;
  if (!hasContent) return null;

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Battle Card</h3>
          {bc.icp_score != null && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums ${
              bc.icp_score >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' :
              bc.icp_score >= 50 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' :
              bc.icp_score >= 30 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' :
              'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
            }`}>ICP: {bc.icp_score}/100</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>

      {bc.our_angle && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Our Angle</p>
          <p className="text-sm text-zinc-800 dark:text-zinc-200">{bc.our_angle}</p>
        </div>
      )}

      {expanded && (
        <div className="space-y-4">
          {bc.company_overview && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Company Overview</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{bc.company_overview}</p>
            </div>
          )}

          {bc.their_product && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Their Product</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{bc.their_product}</p>
            </div>
          )}

          {bc.tech_stack && bc.tech_stack.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Tech Stack</p>
              <div className="flex flex-wrap gap-1.5">
                {bc.tech_stack.map((t, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{t}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {bc.their_strengths && bc.their_strengths.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Their Strengths</p>
                <ul className="space-y-1">
                  {bc.their_strengths.map((s, i) => <li key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-1"><span className="text-emerald-500 mt-0.5">+</span>{s}</li>)}
                </ul>
              </div>
            )}
            {bc.their_weaknesses && bc.their_weaknesses.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-1">Their Weaknesses</p>
                <ul className="space-y-1">
                  {bc.their_weaknesses.map((w, i) => <li key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-1"><span className="text-red-500 mt-0.5">-</span>{w}</li>)}
                </ul>
              </div>
            )}
          </div>

          {bc.competitive_landscape && bc.competitive_landscape.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Competitive Landscape</p>
              <ul className="space-y-1">
                {bc.competitive_landscape.map((c, i) => <li key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5"><span className="text-zinc-400 mt-0.5 shrink-0">&bull;</span>{c}</li>)}
              </ul>
            </div>
          )}

          {bc.objection_handlers && bc.objection_handlers.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Objection Handlers</p>
              <div className="space-y-2">
                {bc.objection_handlers.map((oh, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 space-y-1">
                    <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">&quot;{oh.objection}&quot;</p>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{oh.response}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bc.discovery_questions && bc.discovery_questions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Discovery Questions</p>
              <ul className="space-y-1">
                {bc.discovery_questions.map((q, i) => <li key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400">{i + 1}. {q}</li>)}
              </ul>
            </div>
          )}

          {bc.trigger_events && bc.trigger_events.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Trigger Events</p>
              <div className="flex flex-wrap gap-1.5">
                {bc.trigger_events.map((t, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">{t}</span>
                ))}
              </div>
            </div>
          )}

          {bc.decision_makers && bc.decision_makers.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Decision Makers</p>
              <div className="space-y-2">
                {bc.decision_makers.map((dm, i) => (
                  <div key={i} className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{dm.role}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Concerns: {dm.concerns}</p>
                    <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">Pitch: {dm.pitch_angle}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bc.icp_reasons && bc.icp_reasons.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">ICP Fit Reasons</p>
              <ul className="space-y-1">
                {bc.icp_reasons.map((r, i) => <li key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5"><Target className="h-3 w-3 text-zinc-400 mt-0.5 shrink-0" />{r}</li>)}
              </ul>
            </div>
          )}

          {bc.pricing_intel && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Pricing Intel</p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{bc.pricing_intel}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
