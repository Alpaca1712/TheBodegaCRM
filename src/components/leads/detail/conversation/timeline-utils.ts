import type { LeadEmail, LeadInteraction } from '@/types/leads';
import { CHANNEL_LABELS, INTERACTION_TYPE_LABELS } from '@/types/leads';
import type { TimelineEntry } from '@/types/leads-detail';

export function decodeEntities(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export function buildTimeline(emails: LeadEmail[], interactions: LeadInteraction[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const e of emails) {
    const subj = decodeEntities(e.subject);
    const body = decodeEntities(e.body);
    entries.push({
      id: e.id, date: e.sent_at || e.created_at, type: 'email', direction: e.direction,
      channel: 'email', label: e.direction === 'outbound' ? 'Email sent' : 'Email received',
      snippet: subj || body?.slice(0, 120) || '', fullContent: body || null, subject: subj || null,
      aiSummary: null, interactionType: null,
    });
  }
  for (const ix of interactions) {
    const isOutbound = ['dm_sent', 'connection_request', 'comment', 'post_like', 'post_share', 'call', 'meeting'].includes(ix.interaction_type);
    entries.push({
      id: ix.id, date: ix.occurred_at, type: 'interaction', direction: isOutbound ? 'outbound' : 'inbound',
      channel: ix.channel, label: `${CHANNEL_LABELS[ix.channel]} - ${INTERACTION_TYPE_LABELS[ix.interaction_type]}`,
      snippet: ix.summary || ix.content?.slice(0, 120) || '', fullContent: ix.content, subject: ix.summary,
      aiSummary: ix.ai_summary || null, interactionType: ix.interaction_type,
    });
  }
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return entries;
}
