-- Campaign-specific funnel tracking.
-- Leads remain canonical CRM records; campaign_enrollments carry per-campaign progress.

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN (
    'email_outbound',
    'linkedin_inbound',
    'linkedin_outbound',
    'website_inbound',
    'direct_offer_outbound'
  )),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  description TEXT,
  target_channel TEXT,
  success_goal TEXT NOT NULL DEFAULT 'first_meeting_booked',
  lead_magnet_name TEXT,
  landing_slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, slug)
);

CREATE TABLE IF NOT EXISTS campaign_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES campaign_pipelines(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  label TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  is_goal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, stage_key),
  UNIQUE(pipeline_id, position)
);

CREATE TABLE IF NOT EXISTS campaign_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'exited')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(campaign_id, lead_id)
);

CREATE TABLE IF NOT EXISTS campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES campaign_enrollments(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'lead_added',
    'research_completed',
    'email_drafted',
    'email_sent',
    'email_replied',
    'lead_magnet_requested',
    'lead_magnet_sent',
    'challenge_link_clicked',
    'application_started',
    'application_completed',
    'meeting_booked',
    'not_interested',
    'bounced',
    'no_response',
    'stage_changed'
  )),
  stage_key TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS campaign_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('landing_page', 'lead_magnet', 'email_template', 'tracking_url', 'playbook')),
  name TEXT NOT NULL,
  slug TEXT,
  url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lead_emails
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS idx_lead_emails_one_outbound_lead_magnet_per_lead;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_emails_one_outbound_lead_magnet_per_campaign
  ON lead_emails (campaign_id, lead_id, email_type, direction)
  WHERE campaign_id IS NOT NULL
    AND email_type = 'lead_magnet'
    AND direction = 'outbound';

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_emails_one_outbound_lead_magnet_without_campaign
  ON lead_emails (lead_id, email_type, direction)
  WHERE campaign_id IS NULL
    AND email_type = 'lead_magnet'
    AND direction = 'outbound';

CREATE INDEX IF NOT EXISTS idx_campaigns_org_id ON campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaign_pipelines_campaign_id ON campaign_pipelines(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_stages_campaign_id ON campaign_stages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_campaign_id ON campaign_enrollments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_lead_id ON campaign_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_stage_key ON campaign_enrollments(stage_key);
CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign_id ON campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_event_type ON campaign_events(event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_assets_campaign_id ON campaign_assets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_lead_emails_campaign_id ON lead_emails(campaign_id);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view campaigns" ON campaigns FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert campaigns" ON campaigns FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update campaigns" ON campaigns FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete campaigns" ON campaigns FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Org members can view campaign pipelines" ON campaign_pipelines FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert campaign pipelines" ON campaign_pipelines FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update campaign pipelines" ON campaign_pipelines FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete campaign pipelines" ON campaign_pipelines FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Org members can view campaign stages" ON campaign_stages FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert campaign stages" ON campaign_stages FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update campaign stages" ON campaign_stages FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete campaign stages" ON campaign_stages FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Org members can view campaign enrollments" ON campaign_enrollments FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert campaign enrollments" ON campaign_enrollments FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update campaign enrollments" ON campaign_enrollments FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete campaign enrollments" ON campaign_enrollments FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Org members can view campaign events" ON campaign_events FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert campaign events" ON campaign_events FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Org members can view campaign assets" ON campaign_assets FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert campaign assets" ON campaign_assets FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update campaign assets" ON campaign_assets FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete campaign assets" ON campaign_assets FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_campaign_pipelines_updated_at BEFORE UPDATE ON campaign_pipelines FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_campaign_enrollments_updated_at BEFORE UPDATE ON campaign_enrollments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
