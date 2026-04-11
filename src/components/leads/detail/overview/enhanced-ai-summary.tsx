import { Brain, CheckCircle2, ArrowRight, Zap, Linkedin, Twitter, Phone, MapPin, Hash } from 'lucide-react';
import type { Lead } from '@/types/leads';

const channelIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="h-3.5 w-3.5" />, twitter: <Twitter className="h-3.5 w-3.5" />,
  phone: <Phone className="h-3.5 w-3.5" />, in_person: <MapPin className="h-3.5 w-3.5" />, other: <Hash className="h-3.5 w-3.5" />,
};

function parseNextStep(nextStep: string): { channel: string | null; framework: string | null; text: string; tactical: string | null } {
  const channelMatch = nextStep.match(/^\[([^\]]+)\]\s*/);
  let rest = channelMatch ? nextStep.slice(channelMatch[0].length) : nextStep;
  const frameworkMatch = rest.match(/^\[([^\]]+)\]\s*/);
  rest = frameworkMatch ? rest.slice(frameworkMatch[0].length) : rest;
  const tacticalSplit = rest.split('\n\nTactical: ');
  return { channel: channelMatch?.[1] || null, framework: frameworkMatch?.[1] || null, text: tacticalSplit[0], tactical: tacticalSplit[1] || null };
}

export function EnhancedAISummary({ lead }: { lead: Lead }) {
  const parsed = lead.conversation_next_step ? parseNextStep(lead.conversation_next_step) : null;
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-red-500" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI Strategy</h3>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{lead.conversation_summary}</p>
      {parsed && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="text-xs font-semibold text-green-800 dark:text-green-300">Next Step</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {parsed.channel && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white/60 dark:bg-zinc-800/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">{channelIcons[parsed.channel.toLowerCase()] || <Zap className="h-3 w-3" />}{parsed.channel}</span>}
            {parsed.framework && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white/60 dark:bg-zinc-800/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">{parsed.framework}</span>}
          </div>
          <p className="text-sm text-green-700 dark:text-green-400">{parsed.text}</p>
          {parsed.tactical && (
            <div className="flex items-start gap-2 pt-1 border-t border-green-200/50 dark:border-green-700/50">
              <Zap className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">{parsed.tactical}</p>
            </div>
          )}
        </div>
      )}
      {!parsed && lead.conversation_next_step && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <ArrowRight className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-400">{lead.conversation_next_step}</p>
        </div>
      )}
    </div>
  );
}
