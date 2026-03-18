-- 023: Add UPDATE policy on org_invites so users can accept invites,
-- and update the signup trigger to auto-accept pending invites.

-- Allow users to accept invites sent to their email
CREATE POLICY "Users can accept invites sent to them" ON org_invites FOR UPDATE
  USING (email = (SELECT auth.jwt()->>'email'));

-- Update the signup trigger to also check for pending invites.
-- If a new user has a pending invite, add them to that org and set it as active.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  org_slug TEXT;
  inv RECORD;
  found_invite BOOLEAN := FALSE;
BEGIN
  -- Step 1: Create profile
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Step 2: Check for pending invites matching this email
  FOR inv IN
    SELECT id, org_id, role, invited_by
    FROM org_invites
    WHERE email = NEW.email
      AND accepted_at IS NULL
      AND expires_at > NOW()
  LOOP
    INSERT INTO org_members (org_id, user_id, role, invited_by)
    VALUES (inv.org_id, NEW.id, inv.role, inv.invited_by)
    ON CONFLICT (org_id, user_id) DO NOTHING;

    UPDATE org_invites SET accepted_at = NOW() WHERE id = inv.id;

    IF NOT found_invite THEN
      UPDATE profiles SET active_org_id = inv.org_id WHERE user_id = NEW.id;
      found_invite := TRUE;
    END IF;
  END LOOP;

  -- Step 3: Always create a personal org (even if they have invites)
  org_slug := COALESCE(replace(NEW.email, '@', '-at-'), NEW.id::text);

  INSERT INTO organizations (name, slug)
  VALUES (
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'My Organization'
    ),
    org_slug
  )
  ON CONFLICT (slug) DO UPDATE
    SET slug = org_slug || '-' || substr(gen_random_uuid()::text, 1, 8)
  RETURNING id INTO new_org_id;

  INSERT INTO org_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner')
  ON CONFLICT (org_id, user_id) DO NOTHING;

  -- Only set active org to personal org if no invite was found
  IF NOT found_invite THEN
    UPDATE profiles SET active_org_id = new_org_id
    WHERE user_id = NEW.id AND active_org_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;
