-- Migration: 006_investors
-- Investors and investment rounds for fundraising pipeline

-- Investors table (VCs, angels, firms)
CREATE TABLE IF NOT EXISTS investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  firm TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  linkedin_url TEXT,
  type TEXT NOT NULL DEFAULT 'vc' CHECK (type IN ('vc', 'angel', 'family_office', 'corporate', 'accelerator', 'other')),
  check_size_min NUMERIC(14,2),
  check_size_max NUMERIC(14,2),
  stage_preference TEXT[], -- e.g. {'pre_seed', 'seed', 'series_a'}
  thesis TEXT, -- what they invest in
  notes TEXT,
  relationship_status TEXT NOT NULL DEFAULT 'cold' CHECK (relationship_status IN ('cold', 'warm', 'hot', 'portfolio', 'passed')),
  last_contacted_at TIMESTAMPTZ,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL, -- link to a contact record
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Investments table (individual rounds/raises)
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  round_name TEXT NOT NULL, -- e.g. "Seed Round", "Series A"
  amount NUMERIC(14,2),
  valuation_pre NUMERIC(14,2),
  valuation_post NUMERIC(14,2),
  equity_percentage NUMERIC(5,2),
  instrument TEXT DEFAULT 'equity' CHECK (instrument IN ('equity', 'safe', 'convertible_note', 'other')),
  stage TEXT NOT NULL DEFAULT 'intro' CHECK (stage IN ('intro', 'pitch', 'due_diligence', 'term_sheet', 'negotiation', 'closed', 'passed')),
  pitch_date DATE,
  close_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Investor policies
CREATE POLICY "Users can view their own investors" ON investors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own investors" ON investors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own investors" ON investors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own investors" ON investors FOR DELETE USING (auth.uid() = user_id);

-- Investment policies
CREATE POLICY "Users can view their own investments" ON investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own investments" ON investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own investments" ON investments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own investments" ON investments FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_investors_user_id ON investors(user_id);
CREATE INDEX idx_investors_relationship_status ON investors(relationship_status);
CREATE INDEX idx_investors_type ON investors(type);
CREATE INDEX idx_investments_user_id ON investments(user_id);
CREATE INDEX idx_investments_investor_id ON investments(investor_id);
CREATE INDEX idx_investments_stage ON investments(stage);

-- Updated_at triggers
CREATE TRIGGER update_investors_updated_at BEFORE UPDATE ON investors FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON investments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
