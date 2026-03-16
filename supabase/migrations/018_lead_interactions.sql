-- Lead interactions: track LinkedIn DMs, calls, meetings, and other non-email touchpoints
CREATE TABLE lead_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('linkedin', 'twitter', 'phone', 'in_person', 'other')),
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'dm_sent', 'dm_received', 'connection_request', 'connection_accepted',
    'comment', 'post_like', 'post_share', 'call', 'meeting', 'other'
  )),
  content TEXT,
  summary TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own lead interactions" ON lead_interactions;
CREATE POLICY "Users can view their own lead interactions" ON lead_interactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own lead interactions" ON lead_interactions;
CREATE POLICY "Users can insert their own lead interactions" ON lead_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own lead interactions" ON lead_interactions;
CREATE POLICY "Users can update their own lead interactions" ON lead_interactions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own lead interactions" ON lead_interactions;
CREATE POLICY "Users can delete their own lead interactions" ON lead_interactions FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX idx_lead_interactions_user_id ON lead_interactions(user_id);
CREATE INDEX idx_lead_interactions_channel ON lead_interactions(channel);
CREATE INDEX idx_lead_interactions_occurred_at ON lead_interactions(occurred_at);
