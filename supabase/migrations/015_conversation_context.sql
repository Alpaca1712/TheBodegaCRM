-- Migration: 015_conversation_context
-- Add conversation intelligence: full thread context, domain grouping, and AI-driven pipeline updates.

-- ═══════════════════════════════════════════════════════════════════
-- STEP 1: Add conversation context fields to leads
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_domain TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversation_summary TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversation_next_step TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversation_signals JSONB DEFAULT '[]';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS auto_stage_reason TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS thread_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS total_emails_in INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS total_emails_out INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_outbound_at TIMESTAMPTZ;

-- Auto-populate email_domain from contact_email
UPDATE leads
SET email_domain = SPLIT_PART(contact_email, '@', 2)
WHERE contact_email IS NOT NULL AND email_domain IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_email_domain ON leads(email_domain);

-- ═══════════════════════════════════════════════════════════════════
-- STEP 2: Add direction and thread tracking to lead_emails
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS direction TEXT CHECK (direction IN ('inbound', 'outbound')) DEFAULT 'outbound';
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS gmail_message_id TEXT;
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS gmail_thread_id TEXT;
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS from_address TEXT;
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS to_address TEXT;

CREATE INDEX IF NOT EXISTS idx_lead_emails_gmail_message_id ON lead_emails(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_lead_emails_gmail_thread_id ON lead_emails(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_lead_emails_direction ON lead_emails(direction);
