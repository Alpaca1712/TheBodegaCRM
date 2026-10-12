-- AppSec blueprint content funnel (landing /appsec-blueprint).
-- Email delivery of the guide is handled by the landing app via Resend.

insert into public.inbound_flows (key, name, description, is_default, actions) values
  (
    'appsec_blueprint',
    'AppSec team blueprint',
    'Zero-employee AppSec blueprint lead magnet. Landing emails the guide link; this flow tags and notifies.',
    false,
    '{"stage": "interested", "tags": ["website", "web", "appsec_blueprint"], "notify": true}'::jsonb
  )
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  actions = excluded.actions,
  active = true;
