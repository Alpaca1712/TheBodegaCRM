-- 022: Combine handle_new_user + handle_new_user_org into one reliable trigger.
-- The two separate triggers had no guaranteed execution order, causing signup failures.

-- Drop both old triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;

-- Single combined function: profile first, then org + membership
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  org_slug TEXT;
BEGIN
  -- Step 1: Create profile
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Step 2: Create organization
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

  -- Step 3: Add user as org owner
  INSERT INTO org_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner')
  ON CONFLICT (org_id, user_id) DO NOTHING;

  -- Step 4: Set active org on profile
  UPDATE profiles SET active_org_id = new_org_id
  WHERE user_id = NEW.id AND active_org_id IS NULL;

  RETURN NEW;
END;
$$;

-- Single trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
