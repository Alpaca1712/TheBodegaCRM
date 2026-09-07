-- Bodega: API-first cold email CRM for Pigeon Labs.
-- Single tenant. All access goes through the server with the service role;
-- RLS is enabled with no policies so anon/authenticated keys see nothing.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Settings & API keys
-- ---------------------------------------------------------------------------

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Campaigns (a grouping tag) and leads
-- ---------------------------------------------------------------------------

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  is_default_landing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger campaigns_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();
create unique index campaigns_one_default_landing on public.campaigns (is_default_landing)
  where is_default_landing;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_status text not null default 'unverified'
    check (email_status in ('unverified', 'valid', 'invalid', 'accept_all', 'webmail', 'disposable', 'unknown')),
  email_score integer,
  email_verified_at timestamptz,
  first_name text,
  last_name text,
  full_name text,
  title text,
  linkedin_url text,
  twitter_url text,
  phone text,
  company_name text,
  company_domain text,
  company_website text,
  company_description text,
  company_industry text,
  company_size text,
  company_location text,
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'replied', 'interested', 'meeting_booked', 'not_interested',
                     'unsubscribed', 'bounced', 'customer', 'lost')),
  source text,
  campaign_id uuid references public.campaigns (id) on delete set null,
  tags text[] not null default '{}',
  notes text,
  research jsonb not null default '{}'::jsonb,
  custom jsonb not null default '{}'::jsonb,
  enrichment jsonb not null default '{}'::jsonb,
  lead_token text unique,
  do_not_contact boolean not null default false,
  unsubscribed_at timestamptz,
  bounced_at timestamptz,
  replied_at timestamptz,
  last_contacted_at timestamptz,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index leads_email_unique on public.leads (lower(email));
create index leads_stage_idx on public.leads (stage);
create index leads_campaign_idx on public.leads (campaign_id);
create index leads_company_domain_idx on public.leads (company_domain);
create index leads_tags_idx on public.leads using gin (tags);
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Lead magnets and email templates
-- ---------------------------------------------------------------------------

create table public.lead_magnets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  body_markdown text not null,
  filename_template text not null default '{{name}}.pdf',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger lead_magnets_updated_at before update on public.lead_magnets
  for each row execute function public.set_updated_at();

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  subject text not null,
  body text not null,
  body_format text not null default 'text' check (body_format in ('text', 'markdown', 'html')),
  category text,
  tags text[] not null default '{}',
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger email_templates_updated_at before update on public.email_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Sequences
-- ---------------------------------------------------------------------------

create table public.sequences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  campaign_id uuid references public.campaigns (id) on delete set null,
  from_name text,
  from_email text,
  reply_to text,
  send_window jsonb not null default '{"days":[1,2,3,4,5],"start_hour":8,"end_hour":17,"timezone":"America/New_York"}'::jsonb,
  stop_on_reply boolean not null default true,
  daily_send_limit integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger sequences_updated_at before update on public.sequences
  for each row execute function public.set_updated_at();

create table public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequences (id) on delete cascade,
  position integer not null,
  name text,
  delay_minutes integer not null default 0 check (delay_minutes >= 0),
  subject text,
  body text not null,
  body_format text not null default 'text' check (body_format in ('text', 'markdown', 'html')),
  thread_with_previous boolean not null default true,
  lead_magnet_id uuid references public.lead_magnets (id) on delete set null,
  condition_prompt text,
  condition_model text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sequence_id, position)
);
create trigger sequence_steps_updated_at before update on public.sequence_steps
  for each row execute function public.set_updated_at();

create table public.sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequences (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'replied', 'bounced', 'unsubscribed', 'exited')),
  steps_sent integer not null default 0,
  next_step_id uuid references public.sequence_steps (id) on delete set null,
  next_step_due_at timestamptz,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  exited_at timestamptz,
  exit_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index sequence_enrollments_one_live_per_lead on public.sequence_enrollments (lead_id)
  where status in ('active', 'paused');
create index sequence_enrollments_due_idx on public.sequence_enrollments (status, next_step_due_at);
create index sequence_enrollments_sequence_idx on public.sequence_enrollments (sequence_id, status);
create trigger sequence_enrollments_updated_at before update on public.sequence_enrollments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Emails (both directions) and delivery events
-- ---------------------------------------------------------------------------

create table public.emails (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete set null,
  sequence_id uuid references public.sequences (id) on delete set null,
  step_id uuid references public.sequence_steps (id) on delete set null,
  enrollment_id uuid references public.sequence_enrollments (id) on delete set null,
  thread_id uuid,
  direction text not null check (direction in ('outbound', 'inbound')),
  source text not null default 'api' check (source in ('sequence', 'api', 'inbound')),
  from_address text not null,
  to_addresses text[] not null default '{}',
  cc_addresses text[] not null default '{}',
  reply_to text,
  subject text not null default '',
  text_body text,
  html_body text,
  message_id text,
  in_reply_to text,
  references_ids text[] not null default '{}',
  resend_id text unique,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'delivery_delayed', 'bounced', 'complained',
                      'failed', 'suppressed', 'received')),
  bounce_reason text,
  attachments jsonb not null default '[]'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  received_at timestamptz,
  is_read boolean not null default false,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index emails_lead_idx on public.emails (lead_id, created_at desc);
create index emails_thread_idx on public.emails (thread_id, created_at);
create index emails_message_id_idx on public.emails (message_id);
create index emails_inbox_idx on public.emails (direction, handled_at, received_at desc);
create index emails_sequence_idx on public.emails (sequence_id, status);
create trigger emails_updated_at before update on public.emails
  for each row execute function public.set_updated_at();

create table public.step_executions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.sequence_enrollments (id) on delete cascade,
  step_id uuid not null references public.sequence_steps (id) on delete cascade,
  sequence_id uuid not null references public.sequences (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  status text not null check (status in ('sent', 'skipped', 'failed')),
  email_id uuid references public.emails (id) on delete set null,
  skip_reason text,
  error text,
  condition_result jsonb,
  executed_at timestamptz not null default now(),
  unique (enrollment_id, step_id)
);
create index step_executions_sequence_idx on public.step_executions (sequence_id, status);

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  svix_id text unique,
  type text not null,
  resend_email_id text,
  email_id uuid references public.emails (id) on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index email_events_resend_idx on public.email_events (resend_email_id);

-- ---------------------------------------------------------------------------
-- Landing page attribution
-- ---------------------------------------------------------------------------

create table public.attribution_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  lead_token text,
  event_type text not null,
  landing_slug text,
  source text,
  medium text,
  campaign_slug text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index attribution_events_lead_idx on public.attribution_events (lead_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Lock everything down: no policies, so only the service role can read/write.
-- ---------------------------------------------------------------------------

alter table public.settings enable row level security;
alter table public.api_keys enable row level security;
alter table public.campaigns enable row level security;
alter table public.leads enable row level security;
alter table public.lead_magnets enable row level security;
alter table public.email_templates enable row level security;
alter table public.sequences enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.sequence_enrollments enable row level security;
alter table public.emails enable row level security;
alter table public.step_executions enable row level security;
alter table public.email_events enable row level security;
alter table public.attribution_events enable row level security;

insert into public.settings (key, value) values
  ('ai', '{"default_model": "deepseek/deepseek-v3.2"}'::jsonb),
  ('sender', '{"from_name": "Daniel Chalco", "from_email": "daniel@mail.pigeonlabs.nyc", "reply_to": null, "signature": ""}'::jsonb),
  ('landing', '{"base_url": "https://www.artoo.love"}'::jsonb);
