-- Migration: 009_email_templates.sql
-- Create email_templates table for storing reusable follow-up templates

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'follow_up', 'intro', 'pitch', 'meeting_followup', 'deal_update', 'newsletter')),
  is_shared BOOLEAN DEFAULT false,
  tags TEXT[],
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Org-based RLS policies (multi-tenancy)
-- Users can see their own templates + shared templates within their org
CREATE POLICY "Org members can view templates" ON email_templates
  FOR SELECT USING (
    org_id IN (SELECT public.get_user_org_ids())
    AND (user_id = auth.uid() OR is_shared = true)
  );

CREATE POLICY "Org members can insert templates" ON email_templates
  FOR INSERT WITH CHECK (
    org_id IN (SELECT public.get_user_org_ids())
  );

-- Only the template owner can update/delete
CREATE POLICY "Owner can update templates" ON email_templates
  FOR UPDATE USING (
    org_id IN (SELECT public.get_user_org_ids()) AND user_id = auth.uid()
  );

CREATE POLICY "Owner can delete templates" ON email_templates
  FOR DELETE USING (
    org_id IN (SELECT public.get_user_org_ids()) AND user_id = auth.uid()
  );

-- Create index for faster queries
CREATE INDEX idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX idx_email_templates_org_id ON email_templates(org_id);
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_is_shared ON email_templates(is_shared);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Default templates are created per-user via the application layer,
-- not as seed data, since user_id requires a valid auth.users reference.
