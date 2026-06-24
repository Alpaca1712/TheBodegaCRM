-- Deal flow, landing attribution, conference campaigns, and Gmail send metadata.

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_campaign_type_check;
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_campaign_type_check CHECK (campaign_type IN (
    'email_outbound',
    'linkedin_inbound',
    'linkedin_outbound',
    'website_inbound',
    'direct_offer_outbound',
    'conference_in_person'
  ));

ALTER TABLE campaign_events DROP CONSTRAINT IF EXISTS campaign_events_event_type_check;
ALTER TABLE campaign_events
  ADD CONSTRAINT campaign_events_event_type_check CHECK (event_type IN (
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
    'stage_changed',
    'conference_targeted',
    'pre_event_outreach_sent',
    'meeting_scheduled',
    'in_person_conversation',
    'badge_scanned',
    'diagnostic_offered',
    'post_event_follow_up_sent'
  ));

ALTER TABLE campaign_assets DROP CONSTRAINT IF EXISTS campaign_assets_asset_type_check;
ALTER TABLE campaign_assets
  ADD CONSTRAINT campaign_assets_asset_type_check CHECK (asset_type IN (
    'landing_page',
    'lead_magnet',
    'email_template',
    'tracking_url',
    'playbook',
    'conference_list',
    'calendar_link'
  ));

ALTER TABLE lead_emails
  ADD COLUMN IF NOT EXISTS sent_via TEXT NOT NULL DEFAULT 'manual' CHECK (sent_via IN ('manual', 'gmail')),
  ADD COLUMN IF NOT EXISTS gmail_error TEXT;

ALTER TABLE lead_interactions
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  campaign_enrollment_id UUID UNIQUE REFERENCES campaign_enrollments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'discovery_booked' CHECK (stage IN (
    'discovery_booked',
    'discovery_held',
    'qualified',
    'challenge_proposed',
    'challenge_active',
    'proposal_sent',
    'negotiation',
    'closed_won',
    'closed_lost',
    'no_show_nurture'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'nurture')),
  estimated_value NUMERIC(12,2),
  probability INTEGER NOT NULL DEFAULT 20 CHECK (probability >= 0 AND probability <= 100),
  discovery_booked_at TIMESTAMPTZ,
  discovery_held_at TIMESTAMPTZ,
  expected_close_date DATE,
  next_step TEXT,
  next_step_due_at TIMESTAMPTZ,
  source TEXT,
  attribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  lost_reason TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opportunity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',
    'stage_changed',
    'next_step_updated',
    'gmail_sent',
    'meeting_held',
    'closed_won',
    'closed_lost',
    'note'
  )),
  old_stage TEXT,
  new_stage TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS campaign_attribution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  campaign_enrollment_id UUID REFERENCES campaign_enrollments(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'landing_view',
    'landing_form_submission',
    'lead_created',
    'lead_matched',
    'calendar_click',
    'email_click',
    'conference_scan'
  )),
  landing_slug TEXT,
  lead_token TEXT,
  source TEXT,
  medium TEXT,
  campaign_slug TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_opportunities_org_id ON opportunities(org_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_lead_id ON opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_campaign_id ON opportunities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunity_events_opportunity_id ON opportunity_events(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_events_org_id ON opportunity_events(org_id);
CREATE INDEX IF NOT EXISTS idx_campaign_attribution_campaign_id ON campaign_attribution_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_attribution_lead_id ON campaign_attribution_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_attribution_lead_token ON campaign_attribution_events(lead_token);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_campaign_id ON lead_interactions(campaign_id);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_attribution_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view opportunities" ON opportunities FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert opportunities" ON opportunities FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update opportunities" ON opportunities FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete opportunities" ON opportunities FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Org members can view opportunity events" ON opportunity_events FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert opportunity events" ON opportunity_events FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Org members can view campaign attribution events" ON campaign_attribution_events FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert campaign attribution events" ON campaign_attribution_events FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
