'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Clock, Send, Loader2, MessageSquare, Twitter } from 'lucide-react';
import { toast } from 'sonner';
import type { FollowUpSuggestion } from '@/types/leads';

interface FollowUpSuggestionsProps {
  compact?: boolean;
}

const typeLabels: Record<string, string> = {
  follow_up_1: 'Bump (Day 4)',
  follow_up_2: 'Lead Magnet (Day 9)',
  follow_up_3: 'Channel Switch (Day 14)',
  break_up: 'Break-up (Day 21+)',
};

const channelIcons: Record<string, React.ReactNode> = {
  email: <Send className="h-3 w-3" />,
  linkedin: <MessageSquare className="h-3 w-3" />,
  twitter: <Twitter className="h-3 w-3" />,
};

export default function FollowUpSuggestions({ compact = false }: FollowUpSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<FollowUpSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const res = await fetch('/api/leads?stage=email_sent&limit=50');
      if (!res.ok) return;
      const { data: leads } = await res.json();

      const computed: FollowUpSuggestion[] = [];
      for (const lead of leads || []) {
        if (!lead.last_contacted_at) continue;
        const daysSince = Math.floor(
          (Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSince < 4) continue;

        let suggestedType: 'follow_up_1' | 'follow_up_2' | 'follow_up_3' | 'break_up' = 'follow_up_1';
        let suggestedChannel: 'email' | 'linkedin' | 'twitter' = 'email';

        if (daysSince >= 21) { suggestedType = 'break_up'; }
        else if (daysSince >= 14) { suggestedType = 'follow_up_3'; suggestedChannel = 'linkedin'; }
        else if (daysSince >= 9) { suggestedType = 'follow_up_2'; }

        computed.push({
          lead,
          lastEmail: null,
          daysSinceLastEmail: daysSince,
          suggestedFollowUpType: suggestedType,
          suggestedChannel,
        });
      }

      setSuggestions(computed.sort((a, b) => b.daysSinceLastEmail - a.daysSinceLastEmail));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (suggestion: FollowUpSuggestion) => {
    setGeneratingId(suggestion.lead.id);
    toast.info('Generating follow-up... Navigate to the lead to see it.');
    setGeneratingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!suggestions.length) {
    return compact ? null : (
      <div className="text-center py-6">
        <Bell className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No follow-ups needed right now</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {compact && (
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-red-500" />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {suggestions.length} lead{suggestions.length !== 1 ? 's' : ''} need follow-up
          </span>
        </div>
      )}

      {(compact ? suggestions.slice(0, 5) : suggestions).map((s) => (
        <div
          key={s.lead.id}
          className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <Link href={`/leads/${s.lead.id}`} className="block">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate hover:text-red-600 dark:hover:text-red-400">
                {s.lead.contact_name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{s.lead.company_name}</span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  <Clock className="h-3 w-3 inline mr-0.5" />
                  {s.daysSinceLastEmail}d ago
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 ml-3">
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
              {channelIcons[s.suggestedChannel]}
              {typeLabels[s.suggestedFollowUpType]}
            </span>
            <button
              onClick={() => handleGenerate(s)}
              disabled={generatingId === s.lead.id}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {generatingId === s.lead.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Generate
            </button>
          </div>
        </div>
      ))}

      {compact && suggestions.length > 5 && (
        <Link
          href="/follow-ups"
          className="block text-center text-xs text-red-600 dark:text-red-400 hover:text-red-500 py-2"
        >
          View all {suggestions.length} follow-ups
        </Link>
      )}
    </div>
  );
}
