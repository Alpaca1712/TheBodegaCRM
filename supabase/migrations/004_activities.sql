-- Create activities table
drop table if exists public.activities cascade;

create table public.activities (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    type text not null check (type in ('call', 'email', 'meeting', 'task', 'note')),
    title text not null,
    description text,
    contact_id uuid references public.contacts(id) on delete set null,
    company_id uuid references public.companies(id) on delete set null,
    deal_id uuid references public.deals(id) on delete set null,
    due_date timestamptz,
    completed boolean default false,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.activities enable row level security;

-- Create policies
create policy "Users can view their own activities"
    on public.activities for select
    using (auth.uid() = user_id);

create policy "Users can insert their own activities"
    on public.activities for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own activities"
    on public.activities for update
    using (auth.uid() = user_id);

create policy "Users can delete their own activities"
    on public.activities for delete
    using (auth.uid() = user_id);

-- Create indexes
create index activities_user_id_idx on public.activities(user_id);
create index activities_contact_id_idx on public.activities(contact_id);
create index activities_company_id_idx on public.activities(company_id);
create index activities_deal_id_idx on public.activities(deal_id);
create index activities_type_idx on public.activities(type);
create index activities_due_date_idx on public.activities(due_date);
create index activities_completed_idx on public.activities(completed);

-- Create updated_at trigger
create or replace function public.handle_activities_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger activities_updated_at
    before update on public.activities
    for each row
    execute function public.handle_activities_updated_at();
