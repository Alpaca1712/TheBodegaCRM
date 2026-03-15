'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Send, Copy, Check } from 'lucide-react';
import type { Lead, EmailVariant, GeneratedEmail } from '@/types/leads';

interface EmailGeneratorProps {
  lead: Lead;
  onEmailSaved?: (variant: EmailVariant, ctaType: 'mckenna' | 'hormozi') => void;
}

export default function EmailGenerator({ lead, onEmailSaved }: EmailGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedEmail | null>(null);
  const [editedMckenna, setEditedMckenna] = useState<EmailVariant | null>(null);
  const [editedHormozi, setEditedHormozi] = useState<EmailVariant | null>(null);
  const [copiedSide, setCopiedSide] = useState<'mckenna' | 'hormozi' | null>(null);
  const [sendingSide, setSendingSide] = useState<'mckenna' | 'hormozi' | null>(null);

  const generate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
      });

      if (!res.ok) throw new Error('Failed to generate');
      const data: GeneratedEmail = await res.json();
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
      // Determine the email_type based on current stage
      let emailType = 'initial';
      if (lead.stage === 'email_sent' || lead.stage === 'no_response') emailType = 'follow_up_1';
      if (lead.stage === 'follow_up') emailType = 'follow_up_2';
      if (lead.stage === 'replied') emailType = 'reply_response';
      if (lead.stage === 'meeting_held') emailType = 'reply_response';

      // Save the email to lead_emails with the correct type
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

      // Update the lead stage
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
      <div className="text-center py-8">
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
          {isGenerating ? 'Generating 2 variants...' : 'Generate SMYKM Email'}
        </button>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
          Generates McKenna CTA and Hormozi CTA side by side
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Generated Emails</h3>
        <button
          onClick={generate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Regenerate
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* McKenna variant */}
        <VariantCard
          title="McKenna CTA"
          subtitle="Sell the conversation"
          variant={editedMckenna!}
          onSubjectChange={(s) => setEditedMckenna((v) => v ? { ...v, subject: s } : v)}
          onBodyChange={(b) => setEditedMckenna((v) => v ? { ...v, body: b, wordCount: countWords(b) } : v)}
          onCopy={() => handleCopy('mckenna')}
          onSend={() => handleSend('mckenna')}
          isCopied={copiedSide === 'mckenna'}
          isSending={sendingSide === 'mckenna'}
        />

        {/* Hormozi variant */}
        <VariantCard
          title="Hormozi CTA"
          subtitle="Lead with value"
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
