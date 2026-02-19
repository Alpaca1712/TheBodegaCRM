-- Create profiles table (extends auth.users)

-- First, create the handle_updated_at function if it doesn't exist
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop table if exists public.profiles cascade;

create table public.profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    full_name text,
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fk_user foreign key (user_id) references auth.users(id) on delete cascade
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = user_id);

create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = user_id);

-- Create indexes
create index profiles_user_id_idx on public.profiles(user_id);

-- Create updated_at trigger
create trigger profiles_updated_at
    before update on public.profiles
    for each row
    execute function public.handle_updated_at();

-- Enable realtime for profiles
alter publication supabase_realtime add table profiles;
