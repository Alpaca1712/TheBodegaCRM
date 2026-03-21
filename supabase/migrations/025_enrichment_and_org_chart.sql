-- Profile photo and company enrichment
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_photo_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_website TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Org chart: array of team members discovered via research
-- Each entry: { name, title, linkedin_url, photo_url, department, reports_to, lead_id? }
ALTER TABLE leads ADD COLUMN IF NOT EXISTS org_chart JSONB DEFAULT '[]'::jsonb;

-- ICP fit score (0-100) and battle card data for GTM
ALTER TABLE leads ADD COLUMN IF NOT EXISTS icp_score INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS icp_reasons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS battle_card JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS battle_card_generated_at TIMESTAMPTZ;
