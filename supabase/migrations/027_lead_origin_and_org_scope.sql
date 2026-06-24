-- Migration: 027_lead_origin_and_org_scope
-- Track whether a lead came from the website, manual CRM entry, imports, or other channels.
-- Keep `source` as freeform campaign/detail text.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_type_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_source_type_check
  CHECK (source_type IN ('manual', 'website', 'import', 'outreach', 'gmail', 'referral', 'api', 'other'));

UPDATE leads
SET source_type = CASE
  WHEN source IN ('rocoto_landing_page', 'rocoto_pentest_challenge') THEN 'website'
  WHEN source = 'csv_import' THEN 'import'
  WHEN source = 'gmail' THEN 'gmail'
  WHEN source = 'referral' THEN 'referral'
  WHEN source IS NULL OR source = '' THEN 'manual'
  ELSE source_type
END;

CREATE UNIQUE INDEX IF NOT EXISTS leads_org_contact_email_unique
  ON leads (org_id, lower(contact_email))
  WHERE org_id IS NOT NULL AND contact_email IS NOT NULL;

ALTER TABLE lead_interactions DROP CONSTRAINT IF EXISTS lead_interactions_channel_check;
ALTER TABLE lead_interactions
  ADD CONSTRAINT lead_interactions_channel_check
  CHECK (channel IN ('web', 'linkedin', 'twitter', 'phone', 'in_person', 'other'));

ALTER TABLE lead_interactions DROP CONSTRAINT IF EXISTS lead_interactions_interaction_type_check;
ALTER TABLE lead_interactions
  ADD CONSTRAINT lead_interactions_interaction_type_check
  CHECK (interaction_type IN (
    'form_submission',
    'lead_magnet_requested',
    'qualification_completed',
    'dm_sent',
    'dm_received',
    'connection_request',
    'connection_accepted',
    'comment',
    'post_like',
    'post_share',
    'call',
    'meeting',
    'other'
  ));

CREATE INDEX IF NOT EXISTS idx_leads_source_type ON leads(source_type);
