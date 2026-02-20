-- Migration: 007_email_and_ai
-- Gmail integration (metadata only) and AI summaries

-- Connected email accounts (Gmail OAuth tokens)
CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'gmail' CHECK (provider IN ('gmail')),
  email_address TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, email_address)
);

-- Email metadata + AI summaries (no full body stored)
CREATE TABLE IF NOT EXISTS email_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  thread_id TEXT,
  subject TEXT,
  from_address TEXT NOT NULL,
  to_addresses TEXT[],
  date TIMESTAMPTZ NOT NULL,
  snippet TEXT, -- Gmail's built-in snippet (first ~100 chars)
  ai_summary TEXT, -- AI-generated summary of the email
  ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'neutral', 'negative', 'urgent')),
  ai_action_items TEXT[], -- extracted action items
  ai_suggested_stage TEXT, -- suggested deal stage based on content
  ai_follow_up_draft TEXT, -- AI-generated follow-up email
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  investor_id UUID REFERENCES investors(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email_account_id, gmail_message_id)
);

-- LTV/CAC tracking — acquisition costs per contact source
CREATE TABLE IF NOT EXISTS acquisition_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- e.g. 'google_ads', 'referral', 'cold_outreach', 'event'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  leads_generated INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisition_costs ENABLE ROW LEVEL SECURITY;

-- Email account policies
CREATE POLICY "Users can view their own email accounts" ON email_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own email accounts" ON email_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own email accounts" ON email_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own email accounts" ON email_accounts FOR DELETE USING (auth.uid() = user_id);

-- Email summary policies
CREATE POLICY "Users can view their own email summaries" ON email_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own email summaries" ON email_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own email summaries" ON email_summaries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own email summaries" ON email_summaries FOR DELETE USING (auth.uid() = user_id);

-- Acquisition cost policies
CREATE POLICY "Users can view their own acquisition costs" ON acquisition_costs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own acquisition costs" ON acquisition_costs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own acquisition costs" ON acquisition_costs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own acquisition costs" ON acquisition_costs FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_email_accounts_user_id ON email_accounts(user_id);
CREATE INDEX idx_email_summaries_user_id ON email_summaries(user_id);
CREATE INDEX idx_email_summaries_contact_id ON email_summaries(contact_id);
CREATE INDEX idx_email_summaries_deal_id ON email_summaries(deal_id);
CREATE INDEX idx_email_summaries_investor_id ON email_summaries(investor_id);
CREATE INDEX idx_email_summaries_date ON email_summaries(date);
CREATE INDEX idx_acquisition_costs_user_id ON acquisition_costs(user_id);
CREATE INDEX idx_acquisition_costs_source ON acquisition_costs(source);

-- Triggers
CREATE TRIGGER update_email_accounts_updated_at BEFORE UPDATE ON email_accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_email_summaries_updated_at BEFORE UPDATE ON email_summaries FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_acquisition_costs_updated_at BEFORE UPDATE ON acquisition_costs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
