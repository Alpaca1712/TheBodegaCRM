-- Align campaign funnels with observable signals from Gmail and Rocoto Landing.

UPDATE campaign_enrollments enrollment
SET
  stage_key = 'playbook_opt_in',
  updated_at = NOW()
WHERE enrollment.stage_key = 'campaign_link_created'
  AND EXISTS (
    SELECT 1
    FROM campaign_stages stage
    WHERE stage.campaign_id = enrollment.campaign_id
      AND stage.org_id = enrollment.org_id
      AND stage.stage_key = 'playbook_opt_in'
  );

UPDATE campaign_stages stage
SET
  stage_key = 'playbook_opt_in',
  label = 'Playbook Opt-in'
WHERE stage.stage_key = 'campaign_link_created'
  AND NOT EXISTS (
    SELECT 1
    FROM campaign_stages existing
    WHERE existing.campaign_id = stage.campaign_id
      AND existing.stage_key = 'playbook_opt_in'
  );

UPDATE campaign_enrollments enrollment
SET
  stage_key = 'playbook_opt_in',
  updated_at = NOW()
WHERE enrollment.stage_key = 'campaign_link_created'
  AND EXISTS (
    SELECT 1
    FROM campaign_stages stage
    WHERE stage.campaign_id = enrollment.campaign_id
      AND stage.org_id = enrollment.org_id
      AND stage.stage_key = 'playbook_opt_in'
  );

UPDATE campaign_events event
SET stage_key = 'playbook_opt_in'
WHERE event.stage_key = 'campaign_link_created';

UPDATE campaign_events event
SET stage_key = 'challenge_link_clicked'
WHERE event.stage_key = 'application_started';

DELETE FROM campaign_stages
WHERE stage_key = 'campaign_link_created';

UPDATE campaign_pipelines
SET
  name = 'Inbound Playbook Landing',
  description = 'Tracked landing-page flow: playbook opt-in, challenge click, application completion, then booked discovery.'
WHERE template_key = 'linkedin_inbound_playbook';

UPDATE campaign_stages
SET label = CASE stage_key
  WHEN 'initial_email_sent' THEN 'Email Sent'
  WHEN 'offer_email_sent' THEN 'Offer Sent'
  WHEN 'replied_interested' THEN 'Replied / Interested'
  ELSE label
END
WHERE stage_key IN ('initial_email_sent', 'offer_email_sent', 'replied_interested');

WITH ranked_stages AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY campaign_id
      ORDER BY position, created_at, id
    ) - 1 AS next_position
  FROM campaign_stages
)
UPDATE campaign_stages stage
SET position = ranked_stages.next_position
FROM ranked_stages
WHERE stage.id = ranked_stages.id;
