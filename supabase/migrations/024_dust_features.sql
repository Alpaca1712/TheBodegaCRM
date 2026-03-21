-- Agent Memory table for persistent AI context across conversations
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'objection', 'personal', 'strategic', 'context')),
  content TEXT NOT NULL,
  source TEXT CHECK (source IN ('email', 'interaction', 'manual', 'research')),
  source_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  relevance_score INTEGER DEFAULT 5 CHECK (relevance_score BETWEEN 1 AND 10)
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_lead_id ON agent_memory(lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_org_id ON agent_memory(org_id);

-- New columns on leads for account snapshot and risk scoring
ALTER TABLE leads ADD COLUMN IF NOT EXISTS account_snapshot JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS snapshot_generated_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS risk_score INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS risk_factors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS risk_assessed_at TIMESTAMPTZ;

-- AI summary on interactions for meeting summaries
ALTER TABLE lead_interactions ADD COLUMN IF NOT EXISTS ai_summary JSONB;

-- RLS for agent_memory (org-based, matching existing pattern)
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view agent memories"
  ON agent_memory FOR SELECT
  USING (org_id IN (
    SELECT om.org_id FROM org_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert agent memories"
  ON agent_memory FOR INSERT
  WITH CHECK (org_id IN (
    SELECT om.org_id FROM org_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Org members can update agent memories"
  ON agent_memory FOR UPDATE
  USING (org_id IN (
    SELECT om.org_id FROM org_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Org members can delete agent memories"
  ON agent_memory FOR DELETE
  USING (org_id IN (
    SELECT om.org_id FROM org_members om
    WHERE om.user_id = auth.uid()
  ));
