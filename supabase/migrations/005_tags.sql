-- Migration: 005_tags.sql
-- Create tags and contact_tags tables
-- For TheBodegaCRM

-- Tags table (user-defined labels for contacts)
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'gray',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Junction table for contacts and tags (many-to-many relationship)
CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contact_id, tag_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags table
-- Users can only see their own tags
CREATE POLICY "Users can view their own tags" 
  ON tags FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own tags
CREATE POLICY "Users can insert their own tags" 
  ON tags FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tags
CREATE POLICY "Users can update their own tags" 
  ON tags FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own tags
CREATE POLICY "Users can delete their own tags" 
  ON tags FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for contact_tags table
-- Users can only see contact tags for contacts they own
CREATE POLICY "Users can view contact tags for their contacts" 
  ON contact_tags FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM contacts c 
      WHERE c.id = contact_tags.contact_id 
      AND c.user_id = auth.uid()
    )
  );

-- Users can insert contact tags for contacts they own
CREATE POLICY "Users can insert contact tags for their contacts" 
  ON contact_tags FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c 
      WHERE c.id = contact_tags.contact_id 
      AND c.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM tags t 
      WHERE t.id = contact_tags.tag_id 
      AND t.user_id = auth.uid()
    )
  );

-- Users can delete contact tags for contacts they own
CREATE POLICY "Users can delete contact tags for their contacts" 
  ON contact_tags FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM contacts c 
      WHERE c.id = contact_tags.contact_id 
      AND c.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_contact_id ON contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag_id ON contact_tags(tag_id);

-- Create trigger to update updated_at timestamp for tags
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
