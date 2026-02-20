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

-- Policy: users can see their own templates or shared templates in their org
CREATE POLICY "Users can view own templates" ON email_templates
  FOR SELECT USING (
    user_id = auth.uid() OR 
    (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()) AND is_shared = true)
  );

-- Policy: users can insert their own templates
CREATE POLICY "Users can insert own templates" ON email_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: users can update their own templates
CREATE POLICY "Users can update own templates" ON email_templates
  FOR UPDATE USING (user_id = auth.uid());

-- Policy: users can delete their own templates
CREATE POLICY "Users can delete own templates" ON email_templates
  FOR DELETE USING (user_id = auth.uid());

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

-- Insert some default templates
INSERT INTO email_templates (user_id, name, subject, body, category, tags) VALUES
  (
    '00000000-0000-0000-0000-000000000000', -- placeholder user_id
    'Follow-up after meeting',
    'Following up on our meeting',
    'Hi {{contact_name}},

It was great meeting with you today. As discussed, here are the next steps:

1. {{action_item_1}}
2. {{action_item_2}}

Looking forward to your feedback!

Best,
{{your_name}}',
    'meeting_followup',
    ARRAY['follow-up', 'meeting']
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'Deal follow-up',
    'Following up on our conversation',
    'Hi {{contact_name}},

Just wanted to follow up on our recent conversation about {{deal_title}}. Do you have any questions or thoughts?

Looking forward to hearing from you.

Best,
{{your_name}}',
    'follow_up',
    ARRAY['deal', 'follow-up']
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'Investor intro',
    'Introduction from {{your_company}}',
    'Hi {{investor_name}},

I''m {{your_name}} from {{your_company}}. We''re building {{company_description}} and I wanted to connect as we''re in the process of raising our {{round_name}} round.

Would you be open to a brief intro call next week?

Best,
{{your_name}}',
    'intro',
    ARRAY['investor', 'intro']
  );
