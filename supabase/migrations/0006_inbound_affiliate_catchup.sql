-- 0006: catch-up for DBs that already have 0001 + 0002.
-- Covers missing 0003/0004/0005: inbound tables, flows, kill $1 offer, affiliate pipeline.
-- Idempotent. Does NOT drop attribution_events.

-- ─── inbound tables ──────────────────────────────────────────────────────────

create table if not exists public.inbound_flows (
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

create unique index if not exists inbound_flows_one_default
  on public.inbound_flows (is_default) where is_default;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at')
     and not exists (select 1 from pg_trigger where tgname = 'inbound_flows_updated_at') then
    create trigger inbound_flows_updated_at
      before update on public.inbound_flows
      for each row execute function public.set_updated_at();
  end if;
end $$;

create table if not exists public.inbound_events (
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

create index if not exists inbound_events_lead_idx
  on public.inbound_events (lead_id, created_at desc);
create index if not exists inbound_events_created_idx
  on public.inbound_events (created_at desc);

alter table public.inbound_flows enable row level security;
alter table public.inbound_events enable row level security;

alter table public.emails drop constraint if exists emails_source_check;
alter table public.emails add constraint emails_source_check
  check (source in ('sequence', 'api', 'inbound', 'inbound_flow', 'notification'));

-- ─── playbook magnet ─────────────────────────────────────────────────────────

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

-- ─── inbound flows (no dollar_pentest) ────────────────────────────────────────

insert into public.inbound_flows (key, name, description, is_default, actions) values
  (
    'contact',
    'Generic capture',
    'Catch-all for any form that just collects contact details.',
    true,
    '{"stage": "interested", "tags": ["website"], "notify": true}'::jsonb
  ),
  (
    'pentest',
    'Pentest',
    'Core offer. Capture details, get them booked.',
    false,
    '{"stage": "interested", "tags": ["website", "pentest"], "notify": true}'::jsonb
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
  ),
  (
    'affiliate_influencer',
    'Affiliate — influencer',
    'Creators and influencers applying via /affiliates.',
    false,
    '{"stage": "new", "tags": ["website", "affiliate", "affiliate_influencer"], "notify": true}'::jsonb
  ),
  (
    'affiliate_event',
    'Affiliate — event',
    'People met at conferences / meetups via /events.',
    false,
    '{"stage": "new", "tags": ["website", "affiliate", "affiliate_event"], "notify": true}'::jsonb
  )
on conflict (key) do nothing;

-- ─── kill dead $1 offer leftovers ────────────────────────────────────────────

delete from public.inbound_flows where key = 'dollar_pentest';

update public.leads
set tags = array(
  select t from unnest(coalesce(tags, '{}'::text[])) as t
  where t not in ('dollar-pentest', 'dollar_pentest')
)
where coalesce(tags, '{}'::text[]) && array['dollar-pentest', 'dollar_pentest'];

-- ─── affiliate tag backfill ──────────────────────────────────────────────────

update public.leads
set tags = (
  select array_agg(distinct t)
  from unnest(
    coalesce(tags, '{}'::text[]) || array['affiliate', 'affiliate_influencer']
  ) as t
)
where
  (
    source = 'landing:affiliates'
    or source ilike 'pigeonlabs_affiliates%'
  )
  and not (coalesce(tags, '{}'::text[]) @> array['affiliate_influencer']);

update public.leads
set tags = (
  select array_agg(distinct t)
  from unnest(
    coalesce(tags, '{}'::text[]) || array['affiliate', 'affiliate_event']
  ) as t
)
where
  (
    source = 'landing:events'
    or source ilike 'pigeonlabs_events%'
    or source ilike 'event:%'
  )
  and not (coalesce(tags, '{}'::text[]) @> array['affiliate_event']);
