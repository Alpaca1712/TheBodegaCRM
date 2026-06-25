-- Simplify campaign boards so columns represent buyer movement, not prep tasks.

WITH mapped AS (
  SELECT
    enrollment.id,
    CASE
      WHEN pipeline.template_key IN ('email_outbound_lead_magnet', 'email_outbound_direct_offer')
        AND enrollment.stage_key IN ('research_needed', 'researched', 'initial_email_drafted', 'offer_email_drafted') THEN 'to_send'
      WHEN pipeline.template_key IN ('email_outbound_lead_magnet', 'email_outbound_direct_offer')
        AND enrollment.stage_key IN ('initial_email_sent', 'offer_email_sent') THEN 'sent_waiting'
      WHEN pipeline.template_key IN ('email_outbound_lead_magnet', 'email_outbound_direct_offer')
        AND enrollment.stage_key = 'replied_interested' THEN 'replied'
      WHEN pipeline.template_key = 'linkedin_inbound_playbook'
        AND enrollment.stage_key IN ('campaign_link_created', 'playbook_opt_in') THEN 'opted_in'
      WHEN pipeline.template_key = 'conference_in_person_hormozi'
        AND enrollment.stage_key IN ('target_account_list', 'pre_event_research') THEN 'target_list'
      WHEN pipeline.template_key = 'conference_in_person_hormozi'
        AND enrollment.stage_key = 'pre_event_outreach_sent' THEN 'outreach_sent'
      WHEN pipeline.template_key = 'conference_in_person_hormozi'
        AND enrollment.stage_key = 'post_event_follow_up_sent' THEN 'diagnostic_offered'
      WHEN enrollment.stage_key = 'application_started' THEN 'challenge_link_clicked'
      WHEN enrollment.stage_key IN ('no_response', 'not_interested', 'not_a_fit', 'nurture') THEN 'nurture_lost'
      ELSE enrollment.stage_key
    END AS next_stage_key
  FROM campaign_enrollments enrollment
  JOIN campaign_pipelines pipeline ON pipeline.campaign_id = enrollment.campaign_id
)
UPDATE campaign_enrollments enrollment
SET
  stage_key = mapped.next_stage_key,
  updated_at = NOW()
FROM mapped
WHERE enrollment.id = mapped.id
  AND enrollment.stage_key IS DISTINCT FROM mapped.next_stage_key;

WITH mapped AS (
  SELECT
    event.id,
    CASE
      WHEN pipeline.template_key IN ('email_outbound_lead_magnet', 'email_outbound_direct_offer')
        AND event.stage_key IN ('research_needed', 'researched', 'initial_email_drafted', 'offer_email_drafted') THEN 'to_send'
      WHEN pipeline.template_key IN ('email_outbound_lead_magnet', 'email_outbound_direct_offer')
        AND event.stage_key IN ('initial_email_sent', 'offer_email_sent') THEN 'sent_waiting'
      WHEN pipeline.template_key IN ('email_outbound_lead_magnet', 'email_outbound_direct_offer')
        AND event.stage_key = 'replied_interested' THEN 'replied'
      WHEN pipeline.template_key = 'linkedin_inbound_playbook'
        AND event.stage_key IN ('campaign_link_created', 'playbook_opt_in') THEN 'opted_in'
      WHEN pipeline.template_key = 'conference_in_person_hormozi'
        AND event.stage_key IN ('target_account_list', 'pre_event_research') THEN 'target_list'
      WHEN pipeline.template_key = 'conference_in_person_hormozi'
        AND event.stage_key = 'pre_event_outreach_sent' THEN 'outreach_sent'
      WHEN pipeline.template_key = 'conference_in_person_hormozi'
        AND event.stage_key = 'post_event_follow_up_sent' THEN 'diagnostic_offered'
      WHEN event.stage_key IN ('application_started') THEN 'challenge_link_clicked'
      WHEN event.stage_key IN ('no_response', 'not_interested', 'not_a_fit', 'nurture') THEN 'nurture_lost'
      ELSE event.stage_key
    END AS next_stage_key
  FROM campaign_events event
  JOIN campaign_pipelines pipeline ON pipeline.campaign_id = event.campaign_id
  WHERE event.stage_key IS NOT NULL
)
UPDATE campaign_events event
SET stage_key = mapped.next_stage_key
FROM mapped
WHERE event.id = mapped.id
  AND event.stage_key IS DISTINCT FROM mapped.next_stage_key;

DELETE FROM campaign_stages
USING campaign_pipelines pipeline
WHERE campaign_stages.campaign_id = pipeline.campaign_id
  AND pipeline.template_key IN (
    'email_outbound_lead_magnet',
    'email_outbound_direct_offer',
    'linkedin_inbound_playbook',
    'conference_in_person_hormozi'
  );

INSERT INTO campaign_stages (campaign_id, pipeline_id, org_id, stage_key, label, position, is_terminal, is_goal)
SELECT pipeline.campaign_id, pipeline.id, pipeline.org_id, stage.stage_key, stage.label, stage.position, stage.is_terminal, stage.is_goal
FROM campaign_pipelines pipeline
CROSS JOIN (
  VALUES
    ('to_send', 'To Send', 0, false, false),
    ('sent_waiting', 'Sent / Waiting', 1, false, false),
    ('replied', 'Replied', 2, false, false),
    ('lead_magnet_sent', 'Lead Magnet Sent', 3, false, false),
    ('challenge_link_clicked', 'Challenge Link Clicked', 4, false, false),
    ('application_completed', 'Application Completed', 5, false, false),
    ('meeting_booked', 'Meeting Booked', 6, true, true),
    ('nurture_lost', 'Nurture / Lost', 7, false, false)
) AS stage(stage_key, label, position, is_terminal, is_goal)
WHERE pipeline.template_key = 'email_outbound_lead_magnet';

INSERT INTO campaign_stages (campaign_id, pipeline_id, org_id, stage_key, label, position, is_terminal, is_goal)
SELECT pipeline.campaign_id, pipeline.id, pipeline.org_id, stage.stage_key, stage.label, stage.position, stage.is_terminal, stage.is_goal
FROM campaign_pipelines pipeline
CROSS JOIN (
  VALUES
    ('to_send', 'To Send', 0, false, false),
    ('sent_waiting', 'Sent / Waiting', 1, false, false),
    ('replied', 'Replied', 2, false, false),
    ('challenge_link_clicked', 'Challenge Link Clicked', 3, false, false),
    ('application_completed', 'Application Completed', 4, false, false),
    ('meeting_booked', 'Meeting Booked', 5, true, true),
    ('nurture_lost', 'Nurture / Lost', 6, false, false)
) AS stage(stage_key, label, position, is_terminal, is_goal)
WHERE pipeline.template_key = 'email_outbound_direct_offer';

INSERT INTO campaign_stages (campaign_id, pipeline_id, org_id, stage_key, label, position, is_terminal, is_goal)
SELECT pipeline.campaign_id, pipeline.id, pipeline.org_id, stage.stage_key, stage.label, stage.position, stage.is_terminal, stage.is_goal
FROM campaign_pipelines pipeline
CROSS JOIN (
  VALUES
    ('opted_in', 'Opted In', 0, false, false),
    ('lead_magnet_sent', 'Lead Magnet Sent', 1, false, false),
    ('challenge_link_clicked', 'Challenge Link Clicked', 2, false, false),
    ('application_completed', 'Application Completed', 3, false, false),
    ('meeting_booked', 'Meeting Booked', 4, true, true),
    ('nurture_lost', 'Nurture / Lost', 5, false, false)
) AS stage(stage_key, label, position, is_terminal, is_goal)
WHERE pipeline.template_key = 'linkedin_inbound_playbook';

INSERT INTO campaign_stages (campaign_id, pipeline_id, org_id, stage_key, label, position, is_terminal, is_goal)
SELECT pipeline.campaign_id, pipeline.id, pipeline.org_id, stage.stage_key, stage.label, stage.position, stage.is_terminal, stage.is_goal
FROM campaign_pipelines pipeline
CROSS JOIN (
  VALUES
    ('target_list', 'Target List', 0, false, false),
    ('outreach_sent', 'Outreach Sent', 1, false, false),
    ('meeting_scheduled', 'Scheduled', 2, false, false),
    ('in_person_conversation', 'Met In Person', 3, false, false),
    ('diagnostic_offered', 'Diagnostic Offered', 4, false, false),
    ('discovery_booked', 'Discovery Booked', 5, true, true),
    ('nurture_lost', 'Nurture / Lost', 6, false, false)
) AS stage(stage_key, label, position, is_terminal, is_goal)
WHERE pipeline.template_key = 'conference_in_person_hormozi';
