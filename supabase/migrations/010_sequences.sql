-- Migration: 010_sequences.sql
-- Apollo-style email sequences with multi-channel touch points and AI personalization.
-- Inspired by Apollo.io sequences + Samantha McKenna's "Show Me You Know Me" methodology.

-- ─── Sequences ───
-- A sequence is a multi-step outreach cadence (e.g., "Cold Outreach - SaaS Founders")

CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  tags TEXT[],
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Sequence Steps ───
-- Each step is a touch point: email, LinkedIn, call, or manual task.
-- Supports both templates and AI-generated personalized content.

CREATE TABLE IF NOT EXISTS sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin', 'call', 'task')),
  delay_days INTEGER NOT NULL DEFAULT 0,
  subject_template TEXT,
  body_template TEXT,
  ai_personalization BOOLEAN DEFAULT true,
  ai_prompt TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sequence_id, step_number)
);

-- ─── Sequence Enrollments ───
-- Tracks which contacts are enrolled in which sequences.

CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'replied', 'bounced', 'opted_out', 'removed')),
  current_step INTEGER NOT NULL DEFAULT 1,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  UNIQUE(sequence_id, contact_id)
);

-- ─── Step Executions ───
-- Granular tracking of each step for each enrolled contact.

CREATE TABLE IF NOT EXISTS sequence_step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'pending_review', 'sent', 'opened', 'clicked', 'replied', 'bounced', 'skipped', 'failed')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  generated_subject TEXT,
  generated_body TEXT,
  personalization_data JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RLS Policies ───

ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_step_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view sequences" ON sequences
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Org members can insert sequences" ON sequences
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Owner can update sequences" ON sequences
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()) AND user_id = auth.uid());

CREATE POLICY "Owner can delete sequences" ON sequences
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()) AND user_id = auth.uid());

CREATE POLICY "Org members can view steps" ON sequence_steps
  FOR SELECT USING (
    sequence_id IN (SELECT id FROM sequences WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

CREATE POLICY "Org members can manage steps" ON sequence_steps
  FOR ALL USING (
    sequence_id IN (SELECT id FROM sequences WHERE org_id IN (SELECT public.get_user_org_ids()) AND user_id = auth.uid())
  );

CREATE POLICY "Org members can view enrollments" ON sequence_enrollments
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Org members can manage enrollments" ON sequence_enrollments
  FOR ALL USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Org members can view executions" ON sequence_step_executions
  FOR SELECT USING (
    enrollment_id IN (
      SELECT id FROM sequence_enrollments WHERE org_id IN (SELECT public.get_user_org_ids())
    )
  );

CREATE POLICY "Org members can manage executions" ON sequence_step_executions
  FOR ALL USING (
    enrollment_id IN (
      SELECT id FROM sequence_enrollments WHERE org_id IN (SELECT public.get_user_org_ids())
    )
  );

-- ─── Indexes ───

CREATE INDEX idx_sequences_org ON sequences(org_id);
CREATE INDEX idx_sequences_status ON sequences(status);
CREATE INDEX idx_sequence_steps_seq ON sequence_steps(sequence_id, step_number);
CREATE INDEX idx_enrollments_seq ON sequence_enrollments(sequence_id);
CREATE INDEX idx_enrollments_contact ON sequence_enrollments(contact_id);
CREATE INDEX idx_enrollments_status ON sequence_enrollments(status);
CREATE INDEX idx_executions_enrollment ON sequence_step_executions(enrollment_id);
CREATE INDEX idx_executions_scheduled ON sequence_step_executions(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_executions_status ON sequence_step_executions(status);

-- ─── Triggers ───

CREATE TRIGGER update_sequences_updated_at
  BEFORE UPDATE ON sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sequence_steps_updated_at
  BEFORE UPDATE ON sequence_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sequence_step_executions_updated_at
  BEFORE UPDATE ON sequence_step_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
