'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Brain, TrendingUp, AlertCircle, MessageSquare, Clock, Sparkles,
} from 'lucide-react';
import type { Lead, LeadEmail, LeadInteraction, ConversationSignal } from '@/types/leads';
import { buildTimeline } from './timeline-utils';
import { TimelineEntryCard } from './timeline-entry-card';
import { LogMeetingCard } from './log-meeting-card';

const signalIcons: Record<string, React.ReactNode> = {
  positive: <TrendingUp className="h-3.5 w-3.5 text-green-500" />,
  negative: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
  neutral: <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />,
  action_needed: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  upsell_opportunity: <Sparkles className="h-3.5 w-3.5 text-purple-500" />,
};

const signalColors: Record<string, string> = {
  positive: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
  negative: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
  neutral: 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800',
  action_needed: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
  upsell_opportunity: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30',
};

export function ConversationIntel({ lead, emails, interactions, onRefresh }: { lead: Lead; emails: LeadEmail[]; interactions: LeadInteraction[]; onRefresh: () => void }) {
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingType, setMeetingType] = useState<'call' | 'meeting' | 'demo'>('meeting');
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'email' | 'interaction'>('all');

  const hasData = lead.conversation_summary || (lead.conversation_signals?.length ?? 0) > 0 || emails.length > 0 || interactions.length > 0;
  const timeline = buildTimeline(emails, interactions);
  const filteredTimeline = timeline.filter(e => timelineFilter === 'all' || e.type === timelineFilter);

  const emailCount = timeline.filter(e => e.type === 'email').length;
  const interactionCount = timeline.filter(e => e.type === 'interaction').length;

  const handleMeetingSummary = async () => {
    if (!meetingNotes.trim()) return;
    setMeetingLoading(true);
    try {
      const res = await fetch('/api/ai/meeting-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, content: meetingNotes, meetingType }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Meeting summarized and logged');
      setMeetingNotes('');
      setMeetingOpen(false);
      onRefresh();
    } catch { toast.error('Failed to summarize'); } finally { setMeetingLoading(false); }
  };

  if (!hasData) {
    return (
      <div className="space-y-4">
        <LogMeetingCard
          open={meetingOpen} setOpen={setMeetingOpen}
          notes={meetingNotes} setNotes={setMeetingNotes}
          type={meetingType} setType={setMeetingType}
          loading={meetingLoading} onSubmit={handleMeetingSummary}
        />
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
          <Brain className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-500">No conversation data yet</p>
          <p className="text-xs text-zinc-400 mt-1">Sync Gmail or log an interaction to start.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <LogMeetingCard
        open={meetingOpen} setOpen={setMeetingOpen}
        notes={meetingNotes} setNotes={setMeetingNotes}
        type={meetingType} setType={setMeetingType}
        loading={meetingLoading} onSubmit={handleMeetingSummary}
      />

      {lead.conversation_signals && lead.conversation_signals.length > 0 && (
        <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Signals</h3>
          <div className="space-y-2">
            {lead.conversation_signals.map((signal: ConversationSignal, i: number) => (
              <div key={i} className={`flex items-start gap-2.5 p-3 rounded-lg border ${signalColors[signal.type] || signalColors.neutral}`}>
                <div className="mt-0.5">{signalIcons[signal.type] || signalIcons.neutral}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">{signal.signal}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Source: {signal.source}{signal.detected_at && ` / ${new Date(signal.detected_at).toLocaleDateString()}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Activity Timeline</h3>
          <div className="flex items-center gap-1">
            {[
              { id: 'all' as const, label: 'All', count: timeline.length },
              { id: 'email' as const, label: 'Emails', count: emailCount },
              { id: 'interaction' as const, label: 'Interactions', count: interactionCount },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setTimelineFilter(f.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  timelineFilter === f.id
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {f.label} <span className={timelineFilter === f.id ? 'text-red-200' : 'text-zinc-400'}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {filteredTimeline.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-4">No {timelineFilter === 'all' ? 'activity' : timelineFilter + 's'} yet.</p>
        ) : (
          <div className="space-y-0">
            {filteredTimeline.map((entry, i) => (
              <TimelineEntryCard key={entry.id} entry={entry} isLast={i === filteredTimeline.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
