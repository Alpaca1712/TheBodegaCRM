-- Campaign stage sequence rules.
-- These are campaign-native automations: when a lead sits in a campaign stage
-- for a configured delay, send a templated touch and optionally move stages.

CREATE TABLE IF NOT EXISTS campaign_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  trigger_stage_key TEXT NOT NULL,
  wait_minutes INTEGER NOT NULL DEFAULT 0 CHECK (wait_minutes >= 0),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'linkedin', 'task')),
  email_type TEXT NOT NULL DEFAULT 'follow_up_1' CHECK (email_type IN (
    'initial',
    'follow_up_1',
    'follow_up_2',
    'follow_up_3',
    'reply_response',
    'meeting_request',
    'lead_magnet',
    'break_up'
  )),
  subject_template TEXT NOT NULL DEFAULT '',
  body_template TEXT NOT NULL DEFAULT '',
  move_to_stage_key TEXT,
  stop_on_reply BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_sequence_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  campaign_sequence_step_id UUID NOT NULL REFERENCES campaign_sequence_steps(id) ON DELETE CASCADE,
  campaign_enrollment_id UUID NOT NULL REFERENCES campaign_enrollments(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'skipped', 'failed')),
  due_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  lead_email_id UUID REFERENCES lead_emails(id) ON DELETE SET NULL,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_sequence_step_id, campaign_enrollment_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_sequence_steps_campaign ON campaign_sequence_steps(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sequence_steps_stage ON campaign_sequence_steps(campaign_id, trigger_stage_key);
CREATE INDEX IF NOT EXISTS idx_campaign_sequence_steps_active ON campaign_sequence_steps(campaign_id, active);
CREATE INDEX IF NOT EXISTS idx_campaign_sequence_executions_campaign ON campaign_sequence_executions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sequence_executions_due ON campaign_sequence_executions(due_at) WHERE status = 'scheduled';

ALTER TABLE campaign_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sequence_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view campaign sequence steps" ON campaign_sequence_steps FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert campaign sequence steps" ON campaign_sequence_steps FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update campaign sequence steps" ON campaign_sequence_steps FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete campaign sequence steps" ON campaign_sequence_steps FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Org members can view campaign sequence executions" ON campaign_sequence_executions FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert campaign sequence executions" ON campaign_sequence_executions FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update campaign sequence executions" ON campaign_sequence_executions FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));

DROP TRIGGER IF EXISTS update_campaign_sequence_steps_updated_at ON campaign_sequence_steps;
CREATE TRIGGER update_campaign_sequence_steps_updated_at
  BEFORE UPDATE ON campaign_sequence_steps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO campaign_sequence_steps (
  campaign_id,
  org_id,
  user_id,
  name,
  position,
  trigger_stage_key,
  wait_minutes,
  channel,
  email_type,
  subject_template,
  body_template,
  move_to_stage_key,
  stop_on_reply,
  active,
  metadata
)
SELECT
  campaigns.id,
  campaigns.org_id,
  campaigns.user_id,
  defaults.name,
  defaults.position,
  defaults.trigger_stage_key,
  defaults.wait_minutes,
  defaults.channel,
  defaults.email_type,
  defaults.subject_template,
  defaults.body_template,
  defaults.move_to_stage_key,
  defaults.stop_on_reply,
  false,
  jsonb_build_object('seeded_from_template', pipelines.template_key)
FROM campaigns
JOIN campaign_pipelines pipelines ON pipelines.campaign_id = campaigns.id
CROSS JOIN LATERAL (
  VALUES
    (
      'Send lead magnet reply',
      10,
      'opted_in',
      0,
      'email',
      'lead_magnet',
      'Free Pentest Challenge',
      E'Hey {{first_name}},\n\nHere is the Free Pentest Challenge: {{challenge_link}}\n\nIf you complete it, I can point you to the highest-risk gaps and whether it is worth a discovery call.',
      'lead_magnet_sent',
      true
    ),
    (
      'Challenge completion nudge',
      20,
      'challenge_link_clicked',
      120,
      'email',
      'follow_up_1',
      'Want me to review your challenge?',
      E'Hey {{first_name}},\n\nSaw you opened the challenge link. If you want the useful version, finish the quick application here: {{challenge_link}}\n\nI can then tell you where I would look first.',
      NULL,
      true
    )
) AS defaults(
  name,
  position,
  trigger_stage_key,
  wait_minutes,
  channel,
  email_type,
  subject_template,
  body_template,
  move_to_stage_key,
  stop_on_reply
)
WHERE pipelines.template_key = 'linkedin_inbound_playbook'
  AND NOT EXISTS (
    SELECT 1
    FROM campaign_sequence_steps existing
    WHERE existing.campaign_id = campaigns.id
      AND existing.name = defaults.name
  );

INSERT INTO campaign_sequence_steps (
  campaign_id,
  org_id,
  user_id,
  name,
  position,
  trigger_stage_key,
  wait_minutes,
  channel,
  email_type,
  subject_template,
  body_template,
  move_to_stage_key,
  stop_on_reply,
  active,
  metadata
)
SELECT
  campaigns.id,
  campaigns.org_id,
  campaigns.user_id,
  defaults.name,
  defaults.position,
  defaults.trigger_stage_key,
  defaults.wait_minutes,
  defaults.channel,
  defaults.email_type,
  defaults.subject_template,
  defaults.body_template,
  defaults.move_to_stage_key,
  defaults.stop_on_reply,
  false,
  jsonb_build_object('seeded_from_template', pipelines.template_key)
FROM campaigns
JOIN campaign_pipelines pipelines ON pipelines.campaign_id = campaigns.id
CROSS JOIN LATERAL (
  VALUES
    (
      'Follow-up bump',
      10,
      'sent_waiting',
      5760,
      'email',
      'follow_up_1',
      'Quick bump',
      E'Hey {{first_name}},\n\nWorth sending over the Free Pentest Challenge for {{company_name}}?\n\nIt is a quick way to see where an AI agent may leak or overreach.',
      NULL,
      true
    ),
    (
      'Value drop',
      20,
      'sent_waiting',
      12960,
      'email',
      'lead_magnet',
      'Free Pentest Challenge',
      E'Hey {{first_name}},\n\nSending this in case it is useful: {{challenge_link}}\n\nIf anything jumps out, I can help you triage it.',
      'lead_magnet_sent',
      true
    ),
    (
      'Break-up',
      30,
      'sent_waiting',
      30240,
      'email',
      'break_up',
      'Should I close the loop?',
      E'Hey {{first_name}},\n\nI have not heard back, so I will close the loop unless AI agent security is active for {{company_name}} right now.\n\nEither way, here is the challenge link in case it helps later: {{challenge_link}}',
      'nurture_lost',
      true
    )
) AS defaults(
  name,
  position,
  trigger_stage_key,
  wait_minutes,
  channel,
  email_type,
  subject_template,
  body_template,
  move_to_stage_key,
  stop_on_reply
)
WHERE pipelines.template_key IN ('email_outbound_lead_magnet', 'email_outbound_direct_offer')
  AND NOT EXISTS (
    SELECT 1
    FROM campaign_sequence_steps existing
    WHERE existing.campaign_id = campaigns.id
      AND existing.name = defaults.name
  );

INSERT INTO campaign_sequence_steps (
  campaign_id,
  org_id,
  user_id,
  name,
  position,
  trigger_stage_key,
  wait_minutes,
  channel,
  email_type,
  subject_template,
  body_template,
  move_to_stage_key,
  stop_on_reply,
  active,
  metadata
)
SELECT
  campaigns.id,
  campaigns.org_id,
  campaigns.user_id,
  defaults.name,
  defaults.position,
  defaults.trigger_stage_key,
  defaults.wait_minutes,
  defaults.channel,
  defaults.email_type,
  defaults.subject_template,
  defaults.body_template,
  defaults.move_to_stage_key,
  defaults.stop_on_reply,
  false,
  jsonb_build_object('seeded_from_template', pipelines.template_key)
FROM campaigns
JOIN campaign_pipelines pipelines ON pipelines.campaign_id = campaigns.id
CROSS JOIN LATERAL (
  VALUES
    (
      'Pre-event outreach',
      10,
      'target_list',
      0,
      'email',
      'initial',
      'Worth connecting at the event?',
      E'Hey {{first_name}},\n\nI saw {{company_name}} will be at the event. I am putting together a short AI agent security diagnostic for a few teams there.\n\nWorth comparing notes while we are both onsite?',
      'outreach_sent',
      true
    ),
    (
      'Diagnostic follow-up',
      20,
      'diagnostic_offered',
      1440,
      'email',
      'follow_up_1',
      'The diagnostic I mentioned',
      E'Hey {{first_name}},\n\nGood meeting you. Here is the challenge link I mentioned: {{challenge_link}}\n\nIf you complete it, I can send back the highest-leverage gaps I would look at first.',
      NULL,
      true
    ),
    (
      'Discovery ask',
      30,
      'diagnostic_offered',
      4320,
      'email',
      'meeting_request',
      'Should we turn this into a call?',
      E'Hey {{first_name}},\n\nIf AI agent security is still live for {{company_name}}, happy to do a tight discovery call and walk through what I would test first.\n\nOpen to it?',
      NULL,
      true
    )
) AS defaults(
  name,
  position,
  trigger_stage_key,
  wait_minutes,
  channel,
  email_type,
  subject_template,
  body_template,
  move_to_stage_key,
  stop_on_reply
)
WHERE pipelines.template_key = 'conference_in_person_hormozi'
  AND NOT EXISTS (
    SELECT 1
    FROM campaign_sequence_steps existing
    WHERE existing.campaign_id = campaigns.id
      AND existing.name = defaults.name
  );
