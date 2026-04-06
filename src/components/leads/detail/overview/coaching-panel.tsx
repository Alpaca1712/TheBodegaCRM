import { GraduationCap } from 'lucide-react';

const gradeColors: Record<string, string> = {
  A: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30', B: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  C: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30', D: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
  F: 'text-red-600 bg-red-50 dark:bg-red-950/30',
};

export function CoachingPanel({ coaching }: { coaching: Record<string, unknown> }) {
  const c = coaching as {
    overall_grade?: string; overall_summary?: string; mckenna_score?: number; hormozi_score?: number;
    strengths?: string[]; weaknesses?: string[]; top_improvement?: string;
    email_feedback?: Array<{ subject: string; grade: string; strengths: string[]; weaknesses: string[]; rewrite_suggestion: string }>;
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-zinc-900/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Sales Coaching Report</h3>
        </div>
        {c.overall_grade && (
          <span className={`text-lg font-bold px-2.5 py-0.5 rounded-lg ${gradeColors[c.overall_grade] || gradeColors.C}`}>
            {c.overall_grade}
          </span>
        )}
      </div>
      {c.overall_summary && <p className="text-sm text-zinc-700 dark:text-zinc-300">{c.overall_summary}</p>}
      <div className="flex gap-4">
        {c.mckenna_score != null && <div className="text-center"><p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{c.mckenna_score}/10</p><p className="text-[10px] text-zinc-500">McKenna</p></div>}
        {c.hormozi_score != null && <div className="text-center"><p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{c.hormozi_score}/10</p><p className="text-[10px] text-zinc-500">Hormozi</p></div>}
      </div>
      {c.top_improvement && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">Top Improvement</p>
          <p className="text-xs text-amber-600 dark:text-amber-400">{c.top_improvement}</p>
        </div>
      )}
      {c.email_feedback && c.email_feedback.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Per-Email Feedback</p>
          {c.email_feedback.slice(0, 5).map((ef, i) => (
            <div key={i} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{ef.subject}</p>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColors[ef.grade] || gradeColors.C}`}>{ef.grade}</span>
              </div>
              {ef.rewrite_suggestion && <p className="text-[11px] text-zinc-500">{ef.rewrite_suggestion}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
