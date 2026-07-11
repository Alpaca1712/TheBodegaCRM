-- Repair environments where the lead-origin migration was not applied.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_type_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_source_type_check
  CHECK (source_type IN ('manual', 'website', 'import', 'outreach', 'gmail', 'referral', 'api', 'other'));

CREATE INDEX IF NOT EXISTS idx_leads_source_type ON leads(source_type);
