-- Referral codes for affiliates, influencers, event-goers, and corporate partners.
-- Optional first-class columns. App also stores codes in custom.referral_program.code
-- until this migration is applied. Safe to re-run.

alter table public.leads
  add column if not exists referral_code text,
  add column if not exists referred_by_lead_id uuid references public.leads (id) on delete set null;

create unique index if not exists leads_referral_code_unique
  on public.leads (lower(referral_code))
  where referral_code is not null;

create index if not exists leads_referred_by_idx
  on public.leads (referred_by_lead_id)
  where referred_by_lead_id is not null;
