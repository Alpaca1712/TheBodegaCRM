-- One campaign can be marked as the default destination for landing-page
-- submissions when Rocoto Landing does not send an explicit campaign_id.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS is_default_landing BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_one_default_landing_per_org
  ON campaigns(org_id)
  WHERE is_default_landing;

COMMENT ON COLUMN campaigns.is_default_landing IS
  'Default campaign for landing-page submissions that arrive without campaign_id or campaign_slug.';

-- Backfill one sensible default per org from existing inbound landing campaigns.
WITH ranked_candidates AS (
  SELECT
    campaigns.id,
    ROW_NUMBER() OVER (
      PARTITION BY campaigns.org_id
      ORDER BY
        CASE
          WHEN pipelines.template_key = 'website_inbound_lead_magnet' THEN 0
          WHEN pipelines.template_key = 'linkedin_inbound_playbook' THEN 1
          ELSE 2
        END,
        campaigns.updated_at DESC,
        campaigns.created_at DESC
    ) AS default_rank
  FROM campaigns
  JOIN campaign_pipelines pipelines ON pipelines.campaign_id = campaigns.id
  WHERE campaigns.status IN ('active', 'draft')
    AND pipelines.template_key IN ('website_inbound_lead_magnet', 'linkedin_inbound_playbook')
    AND NOT EXISTS (
      SELECT 1
      FROM campaigns existing_default
      WHERE existing_default.org_id = campaigns.org_id
        AND existing_default.is_default_landing = true
    )
)
UPDATE campaigns
SET is_default_landing = true
FROM ranked_candidates
WHERE ranked_candidates.id = campaigns.id
  AND ranked_candidates.default_rank = 1;
