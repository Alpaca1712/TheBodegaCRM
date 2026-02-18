-- Create deals table
drop table if exists public.deals cascade;

create table public.deals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    value numeric(12,2),
    currency text default 'USD',
    stage text not null check (stage in ('lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
    contact_id uuid references public.contacts(id) on delete set null,
    company_id uuid references public.companies(id) on delete set null,
    expected_close_date date,
    probability integer check (probability >= 0 and probability <= 100),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.deals enable row level security;

-- Create policies
create policy "Users can view their own deals"
    on public.deals for select
    using (auth.uid() = user_id);

create policy "Users can insert their own deals"
    on public.deals for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own deals"
    on public.deals for update
    using (auth.uid() = user_id);

create policy "Users can delete their own deals"
    on public.deals for delete
    using (auth.uid() = user_id);

-- Create indexes
create index deals_user_id_idx on public.deals(user_id);
create index deals_stage_idx on public.deals(stage);
create index deals_contact_id_idx on public.deals(contact_id);
create index deals_company_id_idx on public.deals(company_id);
create index deals_expected_close_date_idx on public.deals(expected_close_date);

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

create trigger deals_updated_at
    before update on public.deals
    for each row
    execute function public.handle_updated_at();
