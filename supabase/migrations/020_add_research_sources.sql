ALTER TABLE leads ADD COLUMN IF NOT EXISTS research_sources JSONB DEFAULT '[]'::jsonb;
