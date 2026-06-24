-- Remove campaign setup fields that duplicated template/stage behavior.
-- Route-level attribution still lives on campaign_attribution_events.landing_slug.

DROP TABLE IF EXISTS campaign_assets;

ALTER TABLE campaigns
  DROP COLUMN IF EXISTS landing_slug,
  DROP COLUMN IF EXISTS target_channel,
  DROP COLUMN IF EXISTS success_goal;
