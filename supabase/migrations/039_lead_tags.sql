-- Lead-native tags for CRM workflow markers.
-- Used by campaign sequence rules to mark outcomes like "Needs a manual reply".

CREATE TABLE IF NOT EXISTS lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'zinc',
  source TEXT NOT NULL DEFAULT 'manual',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS lead_tags_lead_name_unique
  ON lead_tags (lead_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_lead_tags_lead_id ON lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_org_id ON lead_tags(org_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_name ON lead_tags(org_id, name);

ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view lead tags" ON lead_tags;
CREATE POLICY "Org members can view lead tags" ON lead_tags FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Org members can insert lead tags" ON lead_tags;
CREATE POLICY "Org members can insert lead tags" ON lead_tags FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Org members can update lead tags" ON lead_tags;
CREATE POLICY "Org members can update lead tags" ON lead_tags FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Org members can delete lead tags" ON lead_tags;
CREATE POLICY "Org members can delete lead tags" ON lead_tags FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

DROP TRIGGER IF EXISTS update_lead_tags_updated_at ON lead_tags;
CREATE TRIGGER update_lead_tags_updated_at
  BEFORE UPDATE ON lead_tags
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
