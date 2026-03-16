-- 021: Fix new-user signup trigger + add org_id to leads tables for team sharing

-- ============================================================
-- PART 1: Fix the handle_new_user trigger
-- The profile row MUST exist before handle_new_user_org runs.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure profiles has a unique constraint on user_id for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ============================================================
-- PART 2: Add org_id to leads, lead_emails, lead_interactions
-- ============================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE lead_interactions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill org_id from the user's active org (or first org they own)
UPDATE leads SET org_id = (
  SELECT COALESCE(p.active_org_id, om.org_id)
  FROM profiles p
  LEFT JOIN org_members om ON om.user_id = p.user_id AND om.role = 'owner'
  WHERE p.user_id = leads.user_id
  LIMIT 1
) WHERE org_id IS NULL;

UPDATE lead_emails SET org_id = (
  SELECT COALESCE(p.active_org_id, om.org_id)
  FROM profiles p
  LEFT JOIN org_members om ON om.user_id = p.user_id AND om.role = 'owner'
  WHERE p.user_id = lead_emails.user_id
  LIMIT 1
) WHERE org_id IS NULL;

UPDATE lead_interactions SET org_id = (
  SELECT COALESCE(p.active_org_id, om.org_id)
  FROM profiles p
  LEFT JOIN org_members om ON om.user_id = p.user_id AND om.role = 'owner'
  WHERE p.user_id = lead_interactions.user_id
  LIMIT 1
) WHERE org_id IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_org_id ON leads(org_id);
CREATE INDEX IF NOT EXISTS idx_lead_emails_org_id ON lead_emails(org_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_org_id ON lead_interactions(org_id);

-- ============================================================
-- PART 3: Switch RLS from user-only to org-based
-- ============================================================

-- Leads
DROP POLICY IF EXISTS "Users can view their own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert their own leads" ON leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON leads;

CREATE POLICY "Org members can view leads" ON leads FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert leads" ON leads FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update leads" ON leads FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete leads" ON leads FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

-- Lead Emails
DROP POLICY IF EXISTS "Users can view their own lead emails" ON lead_emails;
DROP POLICY IF EXISTS "Users can insert their own lead emails" ON lead_emails;
DROP POLICY IF EXISTS "Users can update their own lead emails" ON lead_emails;
DROP POLICY IF EXISTS "Users can delete their own lead emails" ON lead_emails;

CREATE POLICY "Org members can view lead emails" ON lead_emails FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert lead emails" ON lead_emails FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update lead emails" ON lead_emails FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete lead emails" ON lead_emails FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

-- Lead Interactions
DROP POLICY IF EXISTS "Users can view own lead interactions" ON lead_interactions;
DROP POLICY IF EXISTS "Users can insert own lead interactions" ON lead_interactions;
DROP POLICY IF EXISTS "Users can update own lead interactions" ON lead_interactions;
DROP POLICY IF EXISTS "Users can delete own lead interactions" ON lead_interactions;

CREATE POLICY "Org members can view lead interactions" ON lead_interactions FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert lead interactions" ON lead_interactions FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update lead interactions" ON lead_interactions FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete lead interactions" ON lead_interactions FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));
