'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Send, Copy, Check, ChevronDown, Brain, Zap, AlertCircle, Info, Target } from 'lucide-react';
import type { Lead, LeadEmail, EmailVariant, GeneratedEmail } from '@/types/leads';
import { checkEmailQuality, countWords } from '@/lib/ai/quality';

type EmailMode = 'initial' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3' | 'break_up' | 'reply_needed' | 'post_meeting';

const MODE_CONFIG: Record<EmailMode, { label: string; description: string; followUpNumber: number; isFollowUp: boolean }> = {
  initial: { label: 'Initial SMYKM Email', description: 'First cold outreach with McKenna + Hormozi CTAs', followUpNumber: 0, isFollowUp: false },
  follow_up_1: { label: 'Follow-up #1 (Day 4 Bump)', description: 'Short bump with a new SMYKM hook, no reference to the original', followUpNumber: 1, isFollowUp: true },
  follow_up_2: { label: 'Follow-up #2 (Day 9 Value Drop)', description: 'Hormozi-style lead magnet or free resource offer', followUpNumber: 2, isFollowUp: true },
  follow_up_3: { label: 'Follow-up #3 (Day 14 Channel Switch)', description: 'LinkedIn or Twitter DM, short and casual', followUpNumber: 3, isFollowUp: true },
  break_up: { label: 'Break-up (Day 21+)', description: 'Graceful exit, leave the door open', followUpNumber: 4, isFollowUp: true },
  reply_needed: { label: 'Reply to Their Response', description: 'They replied! Use ACA framework: Acknowledge, Compliment, Ask', followUpNumber: 1, isFollowUp: true },
  post_meeting: { label: 'Post-Meeting Follow-up', description: 'Send within 24 hours with next steps', followUpNumber: 1, isFollowUp: true },
};

function detectBestMode(emails: LeadEmail[], lead: Lead): EmailMode {
  const hasInbound = emails.some(e => e.direction === 'inbound');
  const outbound = emails.filter(e => e.direction === 'outbound');
  const outboundCount = outbound.length;

  // If they replied and we haven't responded yet, reply takes priority
  if (hasInbound) {
    const lastInbound = emails.filter(e => e.direction === 'inbound')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    const lastOutbound = outbound
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    const inboundDate = new Date(lastInbound?.replied_at || lastInbound?.created_at || 0);
    const outboundDate = lastOutbound ? new Date(lastOutbound.sent_at || lastOutbound.created_at) : new Date(0);

    // Their last message is newer than our last message = we need to reply
    if (inboundDate > outboundDate) return 'reply_needed';
  }

  if (lead.stage === 'meeting_held') return 'post_meeting';

  if (outboundCount === 0) return 'initial';
  if (outboundCount === 1) return 'follow_up_1';
  if (outboundCount === 2) return 'follow_up_2';
  if (outboundCount === 3) return 'follow_up_3';
  return 'break_up';
}

function getAvailableModes(emails: LeadEmail[], lead: Lead): EmailMode[] {
  const hasInbound = emails.some(e => e.direction === 'inbound');
  const outboundCount = emails.filter(e => e.direction === 'outbound').length;
  const modes: EmailMode[] = [];

  // Always allow initial (user might want to restart)
  modes.push('initial');

  if (outboundCount >= 1) modes.push('follow_up_1');
  if (outboundCount >= 1) modes.push('follow_up_2');
  if (outboundCount >= 1) modes.push('follow_up_3');
  if (outboundCount >= 1) modes.push('break_up');
  if (hasInbound) modes.push('reply_needed');
  modes.push('post_meeting');

  return modes;
}

interface EmailGeneratorProps {
  lead: Lead;
  emails?: LeadEmail[];
  followUpType?: string | null;
  onEmailSaved?: (variant: EmailVariant, ctaType: 'mckenna' | 'hormozi') => void;
}

export default function EmailGenerator({ lead, emails = [], followUpType, onEmailSaved }: EmailGeneratorProps) {
  const detectedMode = useMemo(() => detectBestMode(emails, lead), [emails, lead]);
  const availableModes = useMemo(() => getAvailableModes(emails, lead), [emails, lead]);

  const initialMode = (followUpType && followUpType in MODE_CONFIG)
    ? followUpType as EmailMode
    : detectedMode;

  const [mode, setMode] = useState<EmailMode>(initialMode);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedEmail | null>(null);
  const [editedMckenna, setEditedMckenna] = useState<EmailVariant | null>(null);
  const [editedHormozi, setEditedHormozi] = useState<EmailVariant | null>(null);
  const [copiedSide, setCopiedSide] = useState<'mckenna' | 'hormozi' | null>(null);
  const [sendingSide, setSendingSide] = useState<'mckenna' | 'hormozi' | null>(null);
  const [customContext, setCustomContext] = useState('');
  const [customPrompt, setCustomPrompt] = useState(lead.conversation_next_step || '');
  const [showContext, setShowContext] = useState(!!lead.conversation_next_step);
  const [showModeSelector, setShowModeSelector] = useState(false);

  const config = MODE_CONFIG[mode];

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

      if (config.isFollowUp) {
        // For reply_needed/post_meeting, the follow-up API handles them via hasReply detection
        // and the followUpNumber. We pass the thread so the API can see inbound messages.
        const emailThread = buildEmailThread();

        // Determine the right followUpNumber for the API
        let followUpNumber = config.followUpNumber;
        // reply_needed and post_meeting use followUpNumber=1 but the API
        // detects them via hasReply in the thread or the stage context
        if (mode === 'reply_needed' || mode === 'post_meeting') {
          followUpNumber = 1;
        }

        const mergedContext = [customContext.trim(), customPrompt.trim()].filter(Boolean).join('\n\n');
        const payload = {
          lead: { ...lead, stage: mode === 'reply_needed' ? 'replied' : mode === 'post_meeting' ? 'meeting_held' : lead.stage },
          emailThread,
          followUpNumber,
          customContext: mergedContext || undefined,
        };

        // Generate two distinct variants in parallel
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

        data = {
          mckenna: { ...resultA, ctaType: 'mckenna' },
          hormozi: { ...resultB, ctaType: 'hormozi' },
        };
      } else {
        const mergedCtx = [customContext.trim(), customPrompt.trim()].filter(Boolean).join('\n\n');
        const res = await fetch('/api/ai/generate-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead,
            customContext: mergedCtx || undefined,
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

  const applyStrategy = () => {
    if (!lead.conversation_next_step) return;
    setCustomPrompt(lead.conversation_next_step);
    setShowContext(true);
    toast.success('Strategy applied to prompt');
  };

  const handleSend = async (side: 'mckenna' | 'hormozi') => {
    const variant = side === 'mckenna' ? editedMckenna : editedHormozi;
    if (!variant) return;

    setSendingSide(side);
    try {
      const emailType = mode === 'initial' ? 'initial'
        : mode === 'reply_needed' ? 'reply_response'
        : mode === 'post_meeting' ? 'reply_response'
        : mode;

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

      // Only update stage if it makes sense
      // Don't regress from advanced stages, don't override replied/meeting_held
      const noStageUpdate = ['replied', 'meeting_booked', 'meeting_held', 'closed_won', 'closed_lost'];
      if (!noStageUpdate.includes(lead.stage)) {
        const newStage = mode === 'initial' ? 'email_drafted' : 'follow_up';
        await fetch(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: newStage }),
        });
      }

      onEmailSaved?.(variant, side);
      toast.success('Email saved');
    } catch {
      toast.error('Failed to save email');
    } finally {
      setSendingSide(null);
    }
  };

  const handleModeChange = (newMode: EmailMode) => {
    setMode(newMode);
    setResult(null);
    setEditedMckenna(null);
    setEditedHormozi(null);
    setShowModeSelector(false);
  };

  const hasResearch = lead.company_description || lead.attack_surface_notes || lead.investment_thesis_notes || lead.personal_details || (lead.smykm_hooks?.length > 0);
  const battleCard = lead.battle_card as Record<string, unknown> | null;
  const ourAngle = battleCard?.our_angle as string | undefined;

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

  // Pre-generation view
  if (!result) {
    return (
      <div className="space-y-4">
        {/* Tactical Advice & GTM Angle */}
        {(lead.conversation_next_step || ourAngle) && (
          <div className="space-y-3">
            {lead.conversation_next_step && (
              <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-red-500" />
                    <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">AI Strategy</h4>
                  </div>
                  <button
                    onClick={applyStrategy}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-red-600 hover:bg-red-500 rounded-md transition-colors uppercase tracking-tight"
                  >
                    <Zap className="h-3 w-3" />
                    Apply Strategy
                  </button>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                  {lead.conversation_next_step}
                </p>
              </div>
            )}

            {ourAngle && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Our GTM Angle</h4>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                  {ourAngle}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Mode selector */}
        <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Email Type</p>
            {mode !== detectedMode && (
              <button
                onClick={() => handleModeChange(detectedMode)}
                className="text-[10px] text-red-600 dark:text-red-400 hover:underline font-medium"
              >
                Reset to auto-detected
              </button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowModeSelector(!showModeSelector)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{config.label}</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{config.description}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${showModeSelector ? 'rotate-180' : ''}`} />
            </button>

            {showModeSelector && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg shadow-black/5 dark:shadow-black/30 py-1 z-50 max-h-[320px] overflow-y-auto">
                {availableModes.map((m) => {
                  const c = MODE_CONFIG[m];
                  const isDetected = m === detectedMode;
                  const isActive = m === mode;
                  return (
                    <button
                      key={m}
                      onClick={() => handleModeChange(m)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors ${
                        isActive ? 'bg-red-50 dark:bg-red-950/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${isActive ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {c.label}
                        </p>
                        {isDetected && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold">
                            AUTO
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{c.description}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Outbound count context */}
          <div className="mt-3 flex items-center gap-3 text-[11px] text-zinc-400">
            <span>{emails.filter(e => e.direction === 'outbound').length} outbound sent</span>
            <span>{emails.filter(e => e.direction === 'inbound').length} inbound received</span>
            <span>Stage: {lead.stage}</span>
          </div>
        </div>

        {/* Custom prompt */}
        <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Custom prompt <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional, but powerful)</span>
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Tell the AI exactly what you want. e.g.&#10;- Write a cheeky email about how their chatbot leaks PII&#10;- Use a Hormozi-style &apos;free audit&apos; angle&#10;- Reference their CEO&apos;s tweet about AI safety from last week&#10;- Make it sound like I already found a vulnerability"
              rows={3}
              className="w-full rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50/30 dark:bg-red-950/10 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 resize-y"
            />
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
              Direct instructions to the AI. This overrides the default approach and becomes the primary directive.
            </p>
          </div>

          <div>
            <button
              onClick={() => setShowContext(!showContext)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${showContext ? '' : '-rotate-90'}`} />
              Extra context {customContext && <span className="text-red-500">*</span>}
            </button>
            {showContext && (
              <div className="mt-2">
                <textarea
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  placeholder="Paste supporting info: special offers, links, competitor intel, example emails, raw notes..."
                  rows={2}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-y"
                />
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                  Background material the AI can draw from. It won&apos;t copy this verbatim.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Generate button */}
        <div className="text-center pt-2">
          <button
            onClick={generate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-linear-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-lg transition-all shadow-sm shadow-red-600/20 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isGenerating ? 'Generating...' : `Generate ${config.label.split(' (')[0]}`}
          </button>
        </div>
      </div>
    );
  }

  // Post-generation view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Generated Email</h3>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">{config.label}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowContext(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              showContext || customPrompt || customContext
                ? 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/30'
                : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {(customPrompt || customContext) ? 'Prompt *' : 'Prompt'}
          </button>
          <button
            onClick={() => { setResult(null); setEditedMckenna(null); setEditedHormozi(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Change Type
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

      {showContext && (
        <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-3 space-y-2">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Custom prompt</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Tell the AI what to do differently this time..."
              rows={2}
              className="w-full rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50/30 dark:bg-red-950/10 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 resize-y"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Extra context</label>
            <textarea
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="Supporting info, links, example emails..."
              rows={2}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-y"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VariantCard
          title={config.isFollowUp ? 'Variant A' : 'McKenna CTA'}
          subtitle={config.isFollowUp ? 'Edit and send' : 'Sell the conversation'}
          variant={editedMckenna!}
          mode={mode}
          onSubjectChange={(s) => setEditedMckenna((v) => v ? { ...v, subject: s, quality: checkEmailQuality(s, v.body, mode === 'initial' ? 'initial' : 'follow_up') } : v)}
          onBodyChange={(b) => setEditedMckenna((v) => v ? { ...v, body: b, wordCount: countWords(b), quality: checkEmailQuality(v.subject, b, mode === 'initial' ? 'initial' : 'follow_up') } : v)}
          onCopy={() => handleCopy('mckenna')}
          onSend={() => handleSend('mckenna')}
          isCopied={copiedSide === 'mckenna'}
          isSending={sendingSide === 'mckenna'}
        />

        <VariantCard
          title={config.isFollowUp ? 'Variant B' : 'Hormozi CTA'}
          subtitle={config.isFollowUp ? 'Alternative version' : 'Lead with value'}
          variant={editedHormozi!}
          mode={mode}
          onSubjectChange={(s) => setEditedHormozi((v) => v ? { ...v, subject: s, quality: checkEmailQuality(s, v.body, mode === 'initial' ? 'initial' : 'follow_up') } : v)}
          onBodyChange={(b) => setEditedHormozi((v) => v ? { ...v, body: b, wordCount: countWords(b), quality: checkEmailQuality(v.subject, b, mode === 'initial' ? 'initial' : 'follow_up') } : v)}
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
  mode,
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
  mode: EmailMode;
  onSubjectChange: (s: string) => void;
  onBodyChange: (b: string) => void;
  onCopy: () => void;
  onSend: () => void;
  isCopied: boolean;
  isSending: boolean;
}) {
  const [showIssues, setShowIssues] = useState(false);
  const q = variant.quality || checkEmailQuality(variant.subject, variant.body, mode === 'initial' ? 'initial' : 'follow_up');

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4 space-y-3 relative overflow-hidden">
      {/* Quality Indicator Bar */}
      <div className={`absolute top-0 left-0 w-1 h-full ${
        q.score >= 90 ? 'bg-emerald-500' : q.score >= 70 ? 'bg-amber-500' : 'bg-red-500'
      }`} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowIssues(!showIssues)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tabular-nums transition-colors ${
              q.score >= 90 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' :
              q.score >= 70 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40' :
              'bg-red-50 text-red-600 dark:bg-red-950/40'
            }`}
          >
            {q.score}% Score
            <ChevronDown className={`h-3 w-3 transition-transform ${showIssues ? 'rotate-180' : ''}`} />
          </button>
          <span className={`text-[10px] font-mono tabular-nums px-2 py-0.5 rounded ${
            variant.wordCount > 200
              ? 'bg-red-50 text-red-600 dark:bg-red-950/40'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}>
            {variant.wordCount}w
          </span>
        </div>
      </div>

      {showIssues && q.issues.length > 0 && (
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
            <Info className="h-3 w-3" />
            Quality Issues
          </div>
          {q.issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
              <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
              {issue}
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Subject</label>
        <input
          value={variant.subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Body</label>
        <textarea
          value={variant.body}
          onChange={(e) => onBodyChange(e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-y"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onCopy}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
        >
          {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={onSend}
          type="button"
          disabled={isSending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>
    </div>
  );
}
