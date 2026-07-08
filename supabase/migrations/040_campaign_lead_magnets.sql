-- Campaign-specific lead magnets backed by Google Docs.
-- These are deliverables, not channels: a LinkedIn outbound, email outbound,
-- website inbound, or conference campaign can all use the same mechanism.

CREATE TABLE IF NOT EXISTS campaign_lead_magnets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  google_doc_id TEXT NOT NULL,
  google_doc_url TEXT,
  cta_phrase TEXT NOT NULL DEFAULT 'Apply for our Pentest Challenge, and walk into your next deal ready.',
  cta_link_text TEXT NOT NULL DEFAULT 'Pentest Challenge',
  filename_template TEXT NOT NULL DEFAULT '{{company_name}} - {{lead_magnet}}.pdf',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_lead_magnets_campaign_id ON campaign_lead_magnets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_lead_magnets_org_id ON campaign_lead_magnets(org_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_lead_magnets_one_default
  ON campaign_lead_magnets(campaign_id)
  WHERE is_default;

ALTER TABLE campaign_lead_magnets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view campaign lead magnets" ON campaign_lead_magnets;
CREATE POLICY "Org members can view campaign lead magnets" ON campaign_lead_magnets FOR SELECT
  USING (org_id IN (SELECT active_org_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Org members can insert campaign lead magnets" ON campaign_lead_magnets;
CREATE POLICY "Org members can insert campaign lead magnets" ON campaign_lead_magnets FOR INSERT
  WITH CHECK (org_id IN (SELECT active_org_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Org members can update campaign lead magnets" ON campaign_lead_magnets;
CREATE POLICY "Org members can update campaign lead magnets" ON campaign_lead_magnets FOR UPDATE
  USING (org_id IN (SELECT active_org_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Org members can delete campaign lead magnets" ON campaign_lead_magnets;
CREATE POLICY "Org members can delete campaign lead magnets" ON campaign_lead_magnets FOR DELETE
  USING (org_id IN (SELECT active_org_id FROM profiles WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_campaign_lead_magnets_updated_at ON campaign_lead_magnets;
CREATE TRIGGER update_campaign_lead_magnets_updated_at
  BEFORE UPDATE ON campaign_lead_magnets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
