-- Migration 008: Create reminders table for smart reminder system
-- Generated on: 2026-02-20

-- Create reminders table
drop table if exists public.reminders;

create table public.reminders (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    org_id uuid references public.organizations(id) on delete set null,
    type text not null check (type in ('stale_deal', 'stale_contact', 'overdue_activity', 'upcoming_followup')),
    title text not null,
    description text,
    entity_type text not null check (entity_type in ('contact', 'company', 'deal', 'activity', 'investor')),
    entity_id uuid not null,
    due_date timestamptz,
    is_read boolean default false,
    is_resolved boolean default false,
    resolved_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Create indexes
create index reminders_user_id_idx on public.reminders(user_id);
create index reminders_org_id_idx on public.reminders(org_id);
create index reminders_type_idx on public.reminders(type);
create index reminders_entity_type_entity_id_idx on public.reminders(entity_type, entity_id);
create index reminders_is_resolved_idx on public.reminders(is_resolved);
create index reminders_is_read_idx on public.reminders(is_read);
create index reminders_due_date_idx on public.reminders(due_date);
create index reminders_created_at_idx on public.reminders(created_at);

-- Enable Row Level Security (RLS)
alter table public.reminders enable row level security;

-- Org-based RLS policies (multi-tenancy)
create policy "Org members can view reminders"
    on public.reminders for select
    using (org_id in (select public.get_user_org_ids()));

create policy "Org members can insert reminders"
    on public.reminders for insert
    with check (org_id in (select public.get_user_org_ids()));

create policy "Org members can update reminders"
    on public.reminders for update
    using (org_id in (select public.get_user_org_ids()));

create policy "Org members can delete reminders"
    on public.reminders for delete
    using (org_id in (select public.get_user_org_ids()));

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger reminders_updated_at
    before update on public.reminders
    for each row
    execute function public.handle_updated_at();
