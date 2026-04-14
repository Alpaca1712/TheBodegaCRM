'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Send, Brain, ArrowRight, Linkedin, Twitter, Phone, MapPin, Hash } from 'lucide-react';
import {
  type InteractionChannel, type InteractionType,
  CHANNEL_INTERACTION_TYPES, INTERACTION_CHANNELS, CHANNEL_LABELS, INTERACTION_TYPE_LABELS,
} from '@/types/leads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const channelIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="h-3.5 w-3.5" />, twitter: <Twitter className="h-3.5 w-3.5" />,
  phone: <Phone className="h-3.5 w-3.5" />, in_person: <MapPin className="h-3.5 w-3.5" />, other: <Hash className="h-3.5 w-3.5" />,
};

export function LogInteractionCard({ leadId, onLogged }: { leadId: string; onLogged: () => void }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<InteractionChannel>('linkedin');
  const [interactionType, setInteractionType] = useState<InteractionType>('dm_sent');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ analysis: Record<string, unknown> | null } | null>(null);
  const availableTypes = CHANNEL_INTERACTION_TYPES[channel];

  useEffect(() => {
    if (!availableTypes.includes(interactionType)) setInteractionType(availableTypes[0]);
  }, [channel, availableTypes, interactionType]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (!submitting && (summary.trim() || content.trim())) {
        handleSubmit();
      }
    }
  };

  const handleSubmit = async () => {
    if (!summary.trim() && !content.trim()) { toast.error('Add a summary or content'); return; }
    setSubmitting(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/lead-interactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId, channel, interaction_type: interactionType, content: content || null, summary: summary || null }) });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setLastResult({ analysis: data.analysis });
      toast.success('Interaction logged and analyzed');
      setContent(''); setSummary('');
      onLogged();
    } catch { toast.error('Failed to log interaction'); } finally { setSubmitting(false); }
  };

  const analysisData = lastResult?.analysis as {
    conversation_summary?: string; next_step?: string; warmth?: string; framework_tag?: string;
  } | null;

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4">
      <button
        onClick={() => { setOpen(!open); if (open) setLastResult(null); }}
        className="flex items-center gap-2 w-full text-left"
        aria-expanded={open}
      >
        <Plus className={`h-3.5 w-3.5 text-red-500 transition-transform ${open ? 'rotate-45' : ''}`} />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log Interaction</h3>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Select interaction channel">
            {INTERACTION_CHANNELS.map((ch) => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${channel === ch ? 'bg-red-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                aria-pressed={channel === ch}
                aria-label={CHANNEL_LABELS[ch]}
              >
                {channelIcons[ch]}{CHANNEL_LABELS[ch]}
              </button>
            ))}
          </div>
          <select
            value={interactionType}
            onChange={(e) => setInteractionType(e.target.value as InteractionType)}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors"
            aria-label="Interaction type"
          >
            {availableTypes.map((t) => <option key={t} value={t}>{INTERACTION_TYPE_LABELS[t]}</option>)}
          </select>
          <Input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Quick summary..."
            className="h-8 bg-zinc-50 dark:bg-zinc-800 text-xs"
            aria-label="Interaction summary"
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste DM, call notes..."
            className="min-h-[60px] bg-zinc-50 dark:bg-zinc-800 text-xs"
            aria-label="Interaction content"
          />
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            isLoading={submitting}
            className="w-full h-8 text-xs"
          >
            {!submitting && <Send className="h-3.5 w-3.5 mr-1.5" />}
            {submitting ? 'Analyzing...' : 'Log & Analyze'}
          </Button>
        </div>
      )}

      {analysisData && (
        <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 space-y-2">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-green-600" />
            <span className="text-[11px] font-semibold text-green-700 dark:text-green-300">AI Analysis Complete</span>
            {analysisData.warmth && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto ${
                analysisData.warmth === 'hot' ? 'bg-red-100 dark:bg-red-900/40 text-red-600' :
                analysisData.warmth === 'warm' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' :
                'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
              }`}>{analysisData.warmth}</span>
            )}
          </div>
          {analysisData.conversation_summary && <p className="text-xs text-zinc-700 dark:text-zinc-300">{analysisData.conversation_summary}</p>}
          {analysisData.next_step && (
            <div className="flex items-start gap-1.5 pt-1 border-t border-green-200/50 dark:border-green-700/50">
              <ArrowRight className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-green-700 dark:text-green-400">{analysisData.next_step}</p>
            </div>
          )}
          {analysisData.framework_tag && (
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 font-medium">{analysisData.framework_tag}</span>
          )}
          <p className="text-[10px] text-green-600 dark:text-green-500">View full details in the Conversation tab timeline.</p>
        </div>
      )}
    </div>
  );
}
