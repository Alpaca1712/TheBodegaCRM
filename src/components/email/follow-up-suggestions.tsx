'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Clock, Send, Loader2, MessageSquare, Twitter, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Lead, LeadEmail } from '@/types/leads';

interface FollowUpSuggestionsProps {
  compact?: boolean;
}

interface FollowUpItem {
  lead: Lead;
  lastEmail: LeadEmail | null;
  daysSinceLastContact: number;
  suggestedAction: string;
  suggestedType: 'follow_up_1' | 'follow_up_2' | 'follow_up_3' | 'break_up' | 'reply_needed' | 'post_meeting';
  suggestedChannel: 'email' | 'linkedin' | 'twitter';
  urgency: 'overdue' | 'due_today' | 'upcoming';
  sequenceDay: string;
}

const FOLLOW_UP_STAGES = ['email_sent', 'replied', 'follow_up', 'no_response', 'meeting_held'] as const;

const ACTION_LABELS: Record<string, { label: string; description: string }> = {
  follow_up_1: { label: 'Bump (Day 4)', description: 'Short 2-3 sentence bump. Reference original email + one new piece of value.' },
  follow_up_2: { label: 'Lead Magnet (Day 9)', description: "Hormozi approach: deliver value, don't ask for a meeting. Offer a free breakdown or resource." },
  follow_up_3: { label: 'Channel Switch (Day 14)', description: 'Move to LinkedIn or Twitter DM. Short, reference the email, acknowledge they are busy.' },
  break_up: { label: 'Break-up (Day 21+)', description: 'Last email. Give them an easy out. "If this isn\'t a priority right now, totally understand."' },
  reply_needed: { label: 'Reply to Response', description: 'They replied! Use Hormozi ACA framework: Acknowledge, Compliment, Ask.' },
  post_meeting: { label: 'Post-Meeting Follow-up', description: 'Send follow-up within 24 hours with next steps.' },
};

const URGENCY_STYLES: Record<string, string> = {
  overdue: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  due_today: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  upcoming: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
};

const URGENCY_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  due_today: 'Due today',
  upcoming: 'Coming up',
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-3 w-3" />,
  linkedin: <MessageSquare className="h-3 w-3" />,
  twitter: <Twitter className="h-3 w-3" />,
};

function computeFollowUp(lead: Lead, allEmails: LeadEmail[]): FollowUpItem | null {
  const lastContactDate = lead.last_contacted_at || lead.updated_at;
  if (!lastContactDate) return null;

  const daysSince = Math.floor(
    (Date.now() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const lastEmail = allEmails.length > 0 ? allEmails[0] : null;

  // Build a set of email types already sent for this lead
  const sentTypes = new Set(
    allEmails
      .filter(e => e.direction === 'outbound')
      .map(e => e.email_type)
  );

  // Replied leads need an ACA response
  if (lead.stage === 'replied') {
    // Check if we already responded to their reply
    const theirReplyDate = lead.last_inbound_at;
    const ourLastOutbound = allEmails.find(e => e.direction === 'outbound');
    if (theirReplyDate && ourLastOutbound?.sent_at && new Date(ourLastOutbound.sent_at) > new Date(theirReplyDate)) {
      return null; // Already responded
    }

    return {
      lead,
      lastEmail,
      daysSinceLastContact: daysSince,
      suggestedAction: 'They replied — respond using ACA framework',
      suggestedType: 'reply_needed',
      suggestedChannel: 'email',
      urgency: daysSince >= 2 ? 'overdue' : daysSince >= 1 ? 'due_today' : 'upcoming',
      sequenceDay: `${daysSince}d since reply`,
    };
  }

  // Post-meeting follow-up
  if (lead.stage === 'meeting_held') {
    if (sentTypes.has('reply_response') && daysSince < 2) return null;
    return {
      lead,
      lastEmail,
      daysSinceLastContact: daysSince,
      suggestedAction: 'Send post-meeting follow-up with next steps',
      suggestedType: 'post_meeting',
      suggestedChannel: 'email',
      urgency: daysSince >= 2 ? 'overdue' : daysSince >= 1 ? 'due_today' : 'upcoming',
      sequenceDay: `${daysSince}d since meeting`,
    };
  }

  // Email sent / follow_up / no_response — use the McKenna+Hormozi sequence
  if (daysSince < 3) return null;

  // Walk the sequence: find the next step that hasn't been done
  const sequence: Array<{ type: FollowUpItem['suggestedType']; channel: FollowUpItem['suggestedChannel']; minDays: number; label: string }> = [
    { type: 'follow_up_1', channel: 'email', minDays: 4, label: 'Day 4' },
    { type: 'follow_up_2', channel: 'email', minDays: 9, label: 'Day 9' },
    { type: 'follow_up_3', channel: 'linkedin', minDays: 14, label: 'Day 14' },
    { type: 'break_up', channel: 'email', minDays: 21, label: 'Day 21+' },
  ];

  let nextStep = null;
  for (const step of sequence) {
    if (!sentTypes.has(step.type)) {
      nextStep = step;
      break;
    }
  }

  // If all follow-ups have been sent, nothing to do
  if (!nextStep) return null;

  const urgency: FollowUpItem['urgency'] =
    daysSince >= nextStep.minDays + 5 ? 'overdue' :
    daysSince >= nextStep.minDays ? 'due_today' : 'upcoming';

  // Don't show if it's too early for this step
  if (daysSince < nextStep.minDays - 1) return null;

  return {
    lead,
    lastEmail,
    daysSinceLastContact: daysSince,
    suggestedAction: ACTION_LABELS[nextStep.type].description,
    suggestedType: nextStep.type,
    suggestedChannel: nextStep.channel,
    urgency,
    sequenceDay: nextStep.label,
  };
}

export default function FollowUpSuggestions({ compact = false }: FollowUpSuggestionsProps) {
  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowUps();
  }, []);

  const loadFollowUps = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch leads in stages that need follow-up
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .in('stage', FOLLOW_UP_STAGES)
        .order('last_contacted_at', { ascending: true });

      if (!leads?.length) {
        setLoading(false);
        return;
      }

      // Fetch all emails for these leads (sorted newest first)
      const leadIds = leads.map(l => l.id);
      const { data: emails } = await supabase
        .from('lead_emails')
        .select('*')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false });

      // Group emails by lead_id
      const emailsByLead = new Map<string, LeadEmail[]>();
      for (const email of emails || []) {
        const existing = emailsByLead.get(email.lead_id) || [];
        existing.push(email as LeadEmail);
        emailsByLead.set(email.lead_id, existing);
      }

      const computed: FollowUpItem[] = [];
      for (const lead of leads) {
        const leadEmails = emailsByLead.get(lead.id) || [];
        const item = computeFollowUp(lead as Lead, leadEmails);
        if (item) computed.push(item);
      }

      // Sort: overdue first, then due_today, then upcoming. Within each, most days first.
      const urgencyOrder = { overdue: 0, due_today: 1, upcoming: 2 };
      computed.sort((a, b) => {
        const urgDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        if (urgDiff !== 0) return urgDiff;
        return b.daysSinceLastContact - a.daysSinceLastContact;
      });

      setItems(computed);
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!items.length) {
    return compact ? null : (
      <div className="text-center py-12">
        <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">All caught up!</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          No leads need follow-up right now. Follow-ups appear when leads are in the email_sent, replied, follow_up, no_response, or meeting_held stages.
        </p>
      </div>
    );
  }

  const overdueCount = items.filter(i => i.urgency === 'overdue').length;
  const dueTodayCount = items.filter(i => i.urgency === 'due_today').length;

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center gap-4 text-sm">
          {overdueCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
              <AlertTriangle className="h-4 w-4" />
              {overdueCount} overdue
            </span>
          )}
          {dueTodayCount > 0 && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <Clock className="h-4 w-4" />
              {dueTodayCount} due today
            </span>
          )}
          <span className="text-zinc-500 dark:text-zinc-400">
            {items.length} total follow-up{items.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {compact && (
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4 text-red-500" />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {items.length} lead{items.length !== 1 ? 's' : ''} need follow-up
          </span>
        </div>
      )}

      {(compact ? items.slice(0, 5) : items).map((item) => (
        <div
          key={item.lead.id}
          className={`rounded-xl border p-4 transition-colors ${URGENCY_STYLES[item.urgency]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/leads/${item.lead.id}`}
                  className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-red-600 dark:hover:text-red-400 truncate"
                >
                  {item.lead.contact_name}
                </Link>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {item.lead.company_name}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] mb-2">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.daysSinceLastContact}d since last contact
                </span>
                <span className="font-medium">
                  {URGENCY_LABELS[item.urgency]}
                </span>
              </div>

              {!compact && (
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {item.suggestedAction}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 font-medium">
                {CHANNEL_ICONS[item.suggestedChannel]}
                {ACTION_LABELS[item.suggestedType].label}
              </span>
              <Link
                href={`/leads/${item.lead.id}?tab=generate`}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                <Send className="h-3 w-3" />
                Generate
              </Link>
            </div>
          </div>
        </div>
      ))}

      {compact && items.length > 5 && (
        <Link
          href="/follow-ups"
          className="block text-center text-xs text-red-600 dark:text-red-400 hover:text-red-500 py-2 font-medium"
        >
          View all {items.length} follow-ups →
        </Link>
      )}
    </div>
  );
}
