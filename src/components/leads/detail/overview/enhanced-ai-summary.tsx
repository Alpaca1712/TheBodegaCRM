'use client';

import { useState } from 'react';
import { ArrowRight, Brain, CheckCircle2, Hash, Linkedin, Loader2, MapPin, Phone, Twitter, Zap } from 'lucide-react';
import { toast } from 'sonner';
import type { Lead } from '@/types/leads';
import { CopyButton } from '@/components/ui/copy-button';

const channelIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="h-3.5 w-3.5" />,
  twitter: <Twitter className="h-3.5 w-3.5" />,
  phone: <Phone className="h-3.5 w-3.5" />,
  in_person: <MapPin className="h-3.5 w-3.5" />,
  other: <Hash className="h-3.5 w-3.5" />,
};

function parseNextStep(nextStep: string): { channel: string | null; framework: string | null; text: string; tactical: string | null } {
  const channelMatch = nextStep.match(/^\[([^\]]+)\]\s*/);
  let rest = channelMatch ? nextStep.slice(channelMatch[0].length) : nextStep;
  const frameworkMatch = rest.match(/^\[([^\]]+)\]\s*/);
  rest = frameworkMatch ? rest.slice(frameworkMatch[0].length) : rest;
  const tacticalSplit = rest.split('\n\nTactical: ');
  return { channel: channelMatch?.[1] || null, framework: frameworkMatch?.[1] || null, text: tacticalSplit[0], tactical: tacticalSplit[1] || null };
}

interface EnhancedAISummaryProps {
  lead: Lead;
  onRefresh?: () => void;
}

export function EnhancedAISummary({ lead, onRefresh }: EnhancedAISummaryProps) {
  const [isDrafting, setIsDrafting] = useState(false);
  const parsed = lead.conversation_next_step ? parseNextStep(lead.conversation_next_step) : null;

  const handleMagicDraft = async () => {
    setIsDrafting(true);
    const promise = (async () => {
      const res = await fetch('/api/ai/draft-next-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (!res.ok) throw new Error('Magic drafting failed');
      onRefresh?.();
    })();

    toast.promise(promise, {
      loading: 'Magic drafting next step...',
      success: 'Draft ready in Emails tab',
      error: 'Drafting failed',
    });

    promise.finally(() => setIsDrafting(false));
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
      <div className="group/summary">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI Strategy</h3>
          </div>
          <CopyButton
            value={lead.conversation_summary || ''}
            label="Strategy"
            className="opacity-0 group-hover/summary:opacity-100 focus:opacity-100"
          />
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{lead.conversation_summary}</p>
      </div>

      {parsed && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 space-y-3 group/next">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-xs font-semibold text-green-800 dark:text-green-300 uppercase tracking-wider">Next Step</p>
            </div>
            <div className="flex items-center gap-1.5">
              <CopyButton
                value={parsed.text}
                label="Next Step"
                className="opacity-0 group-hover/next:opacity-100 focus:opacity-100"
              />
              <button
                onClick={handleMagicDraft}
                disabled={isDrafting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors shadow-sm shadow-amber-500/20 disabled:opacity-50"
              >
                {isDrafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 fill-current" />}
                Magic Draft
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {parsed.channel && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white/60 dark:bg-zinc-800/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                {channelIcons[parsed.channel.toLowerCase()] || <Zap className="h-3 w-3" />}
                {parsed.channel}
              </span>
            )}
            {parsed.framework && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white/60 dark:bg-zinc-800/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                {parsed.framework}
              </span>
            )}
          </div>
          <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed font-medium">{parsed.text}</p>
          {parsed.tactical && (
            <div className="flex items-start gap-2 pt-2 border-t border-green-200/50 dark:border-green-700/50">
              <Zap className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">{parsed.tactical}</p>
            </div>
          )}
        </div>
      )}

      {!parsed && lead.conversation_next_step && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 group/fallback">
          <div className="flex items-start gap-2 min-w-0">
            <ArrowRight className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed font-medium">{lead.conversation_next_step}</p>
          </div>
          <div className="flex items-center gap-1.5 ml-4 shrink-0">
            <CopyButton
              value={lead.conversation_next_step}
              label="Next Step"
              className="opacity-0 group-hover/fallback:opacity-100 focus:opacity-100"
            />
            <button
              onClick={handleMagicDraft}
              disabled={isDrafting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors shadow-sm shadow-amber-500/20 disabled:opacity-50"
            >
              {isDrafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 fill-current" />}
              Magic Draft
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
