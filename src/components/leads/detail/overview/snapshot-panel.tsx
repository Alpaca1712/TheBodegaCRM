import { Camera, AlertCircle, Sparkles } from 'lucide-react';

const gradeColors: Record<string, string> = {
  A: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30', B: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  C: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30', D: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
  F: 'text-red-600 bg-red-50 dark:bg-red-950/30',
};

export function SnapshotPanel({ snapshot }: { snapshot: Record<string, unknown> }) {
  const s = snapshot as {
    executive_summary?: string; health_grade?: string; sentiment_score?: number;
    relationship_highlights?: Array<{ date: string; event: string; significance: string }>;
    active_blockers?: string[]; opportunities?: string[]; recommended_actions?: string[];
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/50 dark:to-zinc-900/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Account Snapshot</h3>
        </div>
        <div className="flex items-center gap-2">
          {s.health_grade && (
            <span className={`text-lg font-bold px-2.5 py-0.5 rounded-lg ${gradeColors[s.health_grade] || gradeColors.C}`}>
              {s.health_grade}
            </span>
          )}
          {s.sentiment_score != null && (
            <span className="text-xs text-zinc-500">Sentiment: {s.sentiment_score}/10</span>
          )}
        </div>
      </div>
      {s.executive_summary && <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{s.executive_summary}</p>}
      {s.active_blockers && s.active_blockers.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Blockers</p>
          <ul className="space-y-1">{s.active_blockers.map((b, i) => <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5"><AlertCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />{b}</li>)}</ul>
        </div>
      )}
      {s.opportunities && s.opportunities.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Opportunities</p>
          <ul className="space-y-1">{s.opportunities.map((o, i) => <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5"><Sparkles className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />{o}</li>)}</ul>
        </div>
      )}
      {s.recommended_actions && s.recommended_actions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Recommended Actions</p>
          <ol className="space-y-1">{s.recommended_actions.map((a, i) => <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5"><span className="text-[10px] font-bold text-blue-500 mt-0.5">{i + 1}.</span>{a}</li>)}</ol>
        </div>
      )}
    </div>
  );
}
