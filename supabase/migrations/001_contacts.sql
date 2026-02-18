-- Create contacts table
drop table if exists public.contacts cascade;

create table public.contacts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    first_name text not null,
    last_name text not null,
    email text,
    phone text,
    company_id uuid references public.companies(id) on delete set null,
    title text,
    status text not null default 'active' check (status in ('active', 'inactive', 'lead')),
    source text,
    notes text,
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.contacts enable row level security;

-- Create policies
create policy "Users can view their own contacts"
    on public.contacts for select
    using (auth.uid() = user_id);

create policy "Users can insert their own contacts"
    on public.contacts for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own contacts"
    on public.contacts for update
    using (auth.uid() = user_id);

create policy "Users can delete their own contacts"
    on public.contacts for delete
    using (auth.uid() = user_id);

-- Create indexes
create index contacts_user_id_idx on public.contacts(user_id);
create index contacts_email_idx on public.contacts(email);
create index contacts_status_idx on public.contacts(status);
create index contacts_company_id_idx on public.contacts(company_id);

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

create trigger contacts_updated_at
    before update on public.contacts
    for each row
    execute function public.handle_updated_at();
