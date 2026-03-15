-- Migration: 013_leads
-- Rocoto cold email CRM: unified leads table and email history

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('customer', 'investor')),

  -- Company / fund info
  company_name TEXT NOT NULL,
  product_name TEXT,
  fund_name TEXT,

  -- Contact info
  contact_name TEXT NOT NULL,
  contact_title TEXT,
  contact_email TEXT,
  contact_twitter TEXT,
  contact_linkedin TEXT,

  -- Research fields
  company_description TEXT,
  attack_surface_notes TEXT,
  investment_thesis_notes TEXT,
  personal_details TEXT,
  smykm_hooks TEXT[] DEFAULT '{}',

  -- Pipeline
  stage TEXT NOT NULL DEFAULT 'researched' CHECK (stage IN (
    'researched',
    'email_drafted',
    'email_sent',
    'replied',
    'meeting_booked',
    'meeting_held',
    'follow_up',
    'closed_won',
    'closed_lost',
    'no_response'
  )),

  -- Metadata
  source TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN (
    'initial',
    'follow_up_1',
    'follow_up_2',
    'follow_up_3',
    'reply_response',
    'meeting_request',
    'lead_magnet',
    'break_up'
  )),
  cta_type TEXT CHECK (cta_type IN ('mckenna', 'hormozi')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  reply_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own leads" ON leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own leads" ON leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own leads" ON leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own leads" ON leads FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own lead emails" ON lead_emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own lead emails" ON lead_emails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own lead emails" ON lead_emails FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own lead emails" ON lead_emails FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_type ON leads(type);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_contact_email ON leads(contact_email);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_lead_emails_lead_id ON lead_emails(lead_id);
CREATE INDEX idx_lead_emails_user_id ON lead_emails(user_id);
CREATE INDEX idx_lead_emails_sent_at ON lead_emails(sent_at);
CREATE INDEX idx_lead_emails_email_type ON lead_emails(email_type);

-- Triggers
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_lead_emails_updated_at BEFORE UPDATE ON lead_emails FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
