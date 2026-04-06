export interface RelatedLead {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_title: string | null;
  contact_photo_url: string | null;
  stage: string;
  type: string;
}

export interface AgentMemory {
  id: string;
  memory_type: string;
  content: string;
  source: string | null;
  relevance_score: number;
  created_at: string;
}

export type TabId = 'overview' | 'emails' | 'conversation' | 'company' | 'memory';

export interface TimelineEntry {
  id: string;
  date: string;
  type: 'email' | 'interaction';
  direction: 'inbound' | 'outbound';
  channel: string;
  label: string;
  snippet: string;
  fullContent: string | null;
  subject: string | null;
  aiSummary: Record<string, unknown> | null;
  interactionType: string | null;
}
