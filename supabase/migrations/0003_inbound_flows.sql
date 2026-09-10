-- Inbound flows: data-driven automation for landing page submissions.
-- A form sends a `flow` key; Bodega matches a row here and applies its actions.

create table public.inbound_flows (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  active boolean not null default true,
  is_default boolean not null default false,
  actions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index inbound_flows_one_default on public.inbound_flows (is_default) where is_default;
create trigger inbound_flows_updated_at before update on public.inbound_flows
  for each row execute function public.set_updated_at();

-- Every submission that hits /api/landing/leads, with what happened to it.
create table public.inbound_events (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid references public.inbound_flows (id) on delete set null,
  flow_key text,
  lead_id uuid references public.leads (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  created_new_lead boolean not null default false,
  email text,
  landing_slug text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  user_agent text,
  payload jsonb not null default '{}'::jsonb,
  actions_taken jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now()
);
create index inbound_events_lead_idx on public.inbound_events (lead_id, created_at desc);
create index inbound_events_created_idx on public.inbound_events (created_at desc);

drop table if exists public.attribution_events;

alter table public.inbound_flows enable row level security;
alter table public.inbound_events enable row level security;

-- Emails sent automatically by a flow are distinguishable from agent sends.
alter table public.emails drop constraint if exists emails_source_check;
alter table public.emails add constraint emails_source_check
  check (source in ('sequence', 'api', 'inbound', 'inbound_flow', 'notification'));

-- Placeholder playbook: replace body_markdown with the real content via the API.
insert into public.lead_magnets (name, slug, description, body_markdown, filename_template)
values (
  'Vertical SaaS AI Security Playbook',
  'vertical-saas-ai-playbook',
  'Delivered automatically by the playbook landing flow. Replace this Markdown with the real playbook.',
  '# Vertical SaaS AI Security Playbook

Hi {{first_name|there}},

This is a placeholder. Update this lead magnet''s `body_markdown` through the Bodega API or MCP (`update_lead_magnet`) with the real playbook content.

— Pigeon Labs',
  '{{name}}.pdf'
)
on conflict (slug) do nothing;

insert into public.inbound_flows (key, name, description, is_default, actions) values
  (
    'contact',
    'Generic capture',
    'Catch-all for any form that just collects contact details.',
    true,
    '{"stage": "interested", "tags": ["website"], "notify": true}'::jsonb
  ),
  (
    'dollar_pentest',
    '$1 pentest',
    'Core offer. Capture details, get them booked.',
    false,
    '{"stage": "interested", "tags": ["website", "dollar-pentest"], "notify": true}'::jsonb
  ),
  (
    'playbook',
    'Vertical SaaS AI playbook',
    'Lead magnet request. Sends the playbook PDF immediately.',
    false,
    jsonb_build_object(
      'stage', 'interested',
      'tags', jsonb_build_array('website', 'playbook'),
      'notify', true,
      'auto_reply', jsonb_build_object(
        'subject', 'Your Vertical SaaS AI Security Playbook',
        'body', E'Hi {{first_name|there}},\n\nHere''s the playbook you asked for, attached.\n\nIf anything in there hits close to home, reply to this email. We handle the hardest problems in cybersecurity and we read every reply.',
        'lead_magnet_id', (select id from public.lead_magnets where slug = 'vertical-saas-ai-playbook')
      )
    )
  ),
  (
    'blog_subscribe',
    'Blog subscribe',
    'Newsletter signups from the blog.',
    false,
    '{"stage": "new", "tags": ["website", "newsletter"], "notify": true}'::jsonb
  )
on conflict (key) do nothing;

insert into public.settings (key, value) values
  ('notifications', '{"email_to": "danielchalco17@gmail.com", "on_inbound_lead": true, "on_reply": true, "on_bounce": false}'::jsonb)
on conflict (key) do nothing;
