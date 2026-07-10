-- Make the requested campaign the default destination for direct website
-- applications and other landing submissions that do not carry campaign_id.

DO $$
DECLARE
  target_campaign_id UUID := '68317082-0131-4779-bec7-e706f70334af';
  target_org_id UUID;
BEGIN
  SELECT org_id
  INTO target_org_id
  FROM campaigns
  WHERE id = target_campaign_id;

  IF target_org_id IS NULL THEN
    RAISE NOTICE 'Default website campaign % was not found; skipping default landing assignment.', target_campaign_id;
    RETURN;
  END IF;

  UPDATE campaigns
  SET is_default_landing = false
  WHERE org_id = target_org_id
    AND is_default_landing = true
    AND id <> target_campaign_id;

  UPDATE campaigns
  SET
    is_default_landing = true,
    status = 'active',
    updated_at = NOW()
  WHERE id = target_campaign_id;
END $$;
