'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Send, Copy, Check } from 'lucide-react';
import type { Lead, LeadEmail, EmailVariant, GeneratedEmail } from '@/types/leads';

const FOLLOWUP_LABELS: Record<string, string> = {
  follow_up_1: 'Follow-up #1 — Bump (Day 4)',
  follow_up_2: 'Follow-up #2 — Lead Magnet (Day 9)',
  follow_up_3: 'Follow-up #3 — Channel Switch (Day 14)',
  break_up: 'Break-up Email (Day 21+)',
  reply_needed: 'Reply to Their Response (ACA)',
  post_meeting: 'Post-Meeting Follow-up',
};

function getFollowUpNumber(type: string): number {
  const map: Record<string, number> = { follow_up_1: 1, follow_up_2: 2, follow_up_3: 3, break_up: 4 };
  return map[type] || 1;
}

function detectFollowUpType(emails: LeadEmail[], lead: Lead): string | null {
  if (lead.stage === 'replied') return 'reply_needed';
  if (lead.stage === 'meeting_held') return 'post_meeting';

  const outboundCount = emails.filter(e => e.direction === 'outbound').length;
  if (outboundCount === 0) return null; // needs initial, not a follow-up
  if (outboundCount === 1) return 'follow_up_1';
  if (outboundCount === 2) return 'follow_up_2';
  if (outboundCount === 3) return 'follow_up_3';
  if (outboundCount >= 4) return 'break_up';
  return null;
}

interface EmailGeneratorProps {
  lead: Lead;
  emails?: LeadEmail[];
  followUpType?: string | null;
  onEmailSaved?: (variant: EmailVariant, ctaType: 'mckenna' | 'hormozi') => void;
}

export default function EmailGenerator({ lead, emails = [], followUpType, onEmailSaved }: EmailGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedEmail | null>(null);
  const [editedMckenna, setEditedMckenna] = useState<EmailVariant | null>(null);
  const [editedHormozi, setEditedHormozi] = useState<EmailVariant | null>(null);
  const [copiedSide, setCopiedSide] = useState<'mckenna' | 'hormozi' | null>(null);
  const [sendingSide, setSendingSide] = useState<'mckenna' | 'hormozi' | null>(null);
  const [customContext, setCustomContext] = useState('');
  const [showContext, setShowContext] = useState(false);

  const resolvedType = followUpType || detectFollowUpType(emails, lead);
  const isFollowUp = resolvedType && resolvedType !== 'initial';

  // No longer auto-generating — let the user add custom context first

  const buildEmailThread = () => {
    return [...emails]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(e => ({
        direction: e.direction,
        subject: e.subject,
        body: e.body,
        sent_at: e.sent_at,
        created_at: e.created_at,
        email_type: e.email_type,
      }));
  };

  const generate = async () => {
    setIsGenerating(true);
    try {
      let data: GeneratedEmail;

      if (isFollowUp) {
        const followUpNumber = getFollowUpNumber(resolvedType!);
        const emailThread = buildEmailThread();
        const payload = {
          lead,
          emailThread,
          followUpNumber,
          customContext: customContext.trim() || undefined,
        };

        const [resA, resB] = await Promise.all([
          fetch('/api/ai/generate-followup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
          fetch('/api/ai/generate-followup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
        ]);

        if (!resA.ok || !resB.ok) throw new Error('Failed to generate follow-up');
        const [resultA, resultB] = await Promise.all([resA.json(), resB.json()]);
        const wcA = resultA.body.split(/\s+/).filter(Boolean).length;
        const wcB = resultB.body.split(/\s+/).filter(Boolean).length;

        data = {
          mckenna: { subject: resultA.subject, body: resultA.body, ctaType: 'mckenna', wordCount: wcA },
          hormozi: { subject: resultB.subject, body: resultB.body, ctaType: 'hormozi', wordCount: wcB },
        };
      } else {
        // Initial email — use the standard generate-email API
        const res = await fetch('/api/ai/generate-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead,
            customContext: customContext.trim() || undefined,
          }),
        });

        if (!res.ok) throw new Error('Failed to generate');
        data = await res.json();
      }

      setResult(data);
      setEditedMckenna(data.mckenna);
      setEditedHormozi(data.hormozi);
    } catch {
      toast.error('Failed to generate email. Check API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (side: 'mckenna' | 'hormozi') => {
    const variant = side === 'mckenna' ? editedMckenna : editedHormozi;
    if (!variant) return;
    await navigator.clipboard.writeText(`Subject: ${variant.subject}\n\n${variant.body}`);
    setCopiedSide(side);
    setTimeout(() => setCopiedSide(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleSend = async (side: 'mckenna' | 'hormozi') => {
    const variant = side === 'mckenna' ? editedMckenna : editedHormozi;
    if (!variant) return;

    setSendingSide(side);
    try {
      const emailType = resolvedType || 'initial';

      await fetch('/api/lead-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          email_type: emailType,
          cta_type: side,
          subject: variant.subject,
          body: variant.body,
          direction: 'outbound',
        }),
      });

      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'email_drafted' }),
      });
      if (!res.ok) throw new Error('Failed to update stage');

      onEmailSaved?.(variant, side);
      toast.success('Email saved and stage updated to "Email Drafted"');
    } catch {
      toast.error('Failed to save email');
    } finally {
      setSendingSide(null);
    }
  };

  const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

  const hasResearch = lead.company_description || lead.attack_surface_notes || lead.investment_thesis_notes || lead.personal_details || (lead.smykm_hooks?.length > 0);

  if (!hasResearch) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Research required</p>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Fill in the research fields before generating an email. The SMYKM framework requires deep, specific homework about the recipient.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="py-6 space-y-4 max-w-lg mx-auto">
        {isFollowUp && (
          <div className="text-center">
            <div className="px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 inline-block">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                {FOLLOWUP_LABELS[resolvedType!] || resolvedType}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
            Custom context <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
            placeholder="e.g. Mention our free pilot offer, reference their recent Series B, include a specific vulnerability we found..."
            rows={3}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-y"
          />
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
            Add anything the AI should weave into the email: special offers, recent news, specific angles, etc.
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={generate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isGenerating ? 'Generating...' : isFollowUp ? `Generate ${FOLLOWUP_LABELS[resolvedType!]?.split(' — ')[0] || 'Follow-up'}` : 'Generate SMYKM Email'}
          </button>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            {isFollowUp ? 'Generates a follow-up based on your conversation history' : 'Generates McKenna CTA and Hormozi CTA side by side'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Generated Email</h3>
          {isFollowUp && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              {FOLLOWUP_LABELS[resolvedType!] || resolvedType}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowContext(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              showContext || customContext
                ? 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/30'
                : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {customContext ? 'Context *' : 'Context'}
          </button>
          <button
            onClick={generate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerate
          </button>
        </div>
      </div>

      {(showContext || customContext) && (
        <div>
          <textarea
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
            placeholder="Add context for regeneration: special offers, angles, recent news..."
            rows={2}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-y"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VariantCard
          title={isFollowUp ? 'Variant A' : 'McKenna CTA'}
          subtitle={isFollowUp ? 'Edit and send' : 'Sell the conversation'}
          variant={editedMckenna!}
          onSubjectChange={(s) => setEditedMckenna((v) => v ? { ...v, subject: s } : v)}
          onBodyChange={(b) => setEditedMckenna((v) => v ? { ...v, body: b, wordCount: countWords(b) } : v)}
          onCopy={() => handleCopy('mckenna')}
          onSend={() => handleSend('mckenna')}
          isCopied={copiedSide === 'mckenna'}
          isSending={sendingSide === 'mckenna'}
        />

        <VariantCard
          title={isFollowUp ? 'Variant B' : 'Hormozi CTA'}
          subtitle={isFollowUp ? 'Alternative version' : 'Lead with value'}
          variant={editedHormozi!}
          onSubjectChange={(s) => setEditedHormozi((v) => v ? { ...v, subject: s } : v)}
          onBodyChange={(b) => setEditedHormozi((v) => v ? { ...v, body: b, wordCount: countWords(b) } : v)}
          onCopy={() => handleCopy('hormozi')}
          onSend={() => handleSend('hormozi')}
          isCopied={copiedSide === 'hormozi'}
          isSending={sendingSide === 'hormozi'}
        />
      </div>
    </div>
  );
}

function VariantCard({
  title,
  subtitle,
  variant,
  onSubjectChange,
  onBodyChange,
  onCopy,
  onSend,
  isCopied,
  isSending,
}: {
  title: string;
  subtitle: string;
  variant: EmailVariant;
  onSubjectChange: (s: string) => void;
  onBodyChange: (b: string) => void;
  onCopy: () => void;
  onSend: () => void;
  isCopied: boolean;
  isSending: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
        <span className={`text-[11px] font-mono tabular-nums px-2 py-0.5 rounded ${
          variant.wordCount > 200
            ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
            : 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400'
        }`}>
          {variant.wordCount} words
        </span>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Subject</label>
        <input
          value={variant.subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Body</label>
        <textarea
          value={variant.body}
          onChange={(e) => onBodyChange(e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-y"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
        >
          {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={onSend}
          disabled={isSending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Save & Stage
        </button>
      </div>
    </div>
  );
}
