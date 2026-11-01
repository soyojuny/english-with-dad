create table if not exists public.dvds (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists dvds_owner_created_at_idx on public.dvds (owner_user_id, created_at);

alter table public.dvds enable row level security;

drop policy if exists "dvds own rows" on public.dvds;
create policy "dvds own rows"
  on public.dvds
  for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);
