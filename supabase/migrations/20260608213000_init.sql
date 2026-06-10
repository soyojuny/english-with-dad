create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  level text not null default '',
  goal text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, owner_user_id),
  unique (owner_user_id, name)
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  active boolean not null default true,
  series text not null,
  title text not null,
  volume text not null default '',
  level text not null default '',
  cover text not null default '/assets/app-icon.svg',
  audio_listen text not null default '',
  audio_shadow text not null default '',
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, owner_user_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid not null,
  date date not null,
  book_id uuid not null,
  activity_category text not null default 'focusListen',
  tasks text[] not null default array[]::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, owner_user_id),
  unique (owner_user_id, child_id, date, book_id, activity_category),
  constraint assignments_child_owner_fkey
    foreign key (child_id, owner_user_id)
    references public.children (id, owner_user_id)
    on delete cascade,
  constraint assignments_book_owner_fkey
    foreign key (book_id, owner_user_id)
    references public.books (id, owner_user_id)
    on delete restrict,
  constraint assignments_tasks_check
    check (
      tasks <@ array['listen', 'shadow', 'self']::text[]
      and array_length(tasks, 1) is distinct from 0
    ),
  constraint assignments_activity_category_check
    check (activity_category in ('focusListen', 'readAloud', 'englishPicture'))
);

create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  assignment_id uuid not null,
  task_type text not null,
  completed_at timestamptz not null default timezone('utc', now()),
  minutes integer not null default 0 check (minutes >= 0),
  audio_opened_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (owner_user_id, assignment_id, task_type),
  constraint completions_assignment_owner_fkey
    foreign key (assignment_id, owner_user_id)
    references public.assignments (id, owner_user_id)
    on delete cascade,
  constraint completions_task_type_check
    check (task_type in ('listen', 'shadow', 'self'))
);

create table if not exists public.audio_launches (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  assignment_id uuid not null,
  task_type text not null,
  opened_at timestamptz not null default timezone('utc', now()),
  returned_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_user_id, assignment_id, task_type),
  constraint audio_launches_assignment_owner_fkey
    foreign key (assignment_id, owner_user_id)
    references public.assignments (id, owner_user_id)
    on delete cascade,
  constraint audio_launches_task_type_check
    check (task_type in ('listen', 'shadow', 'self'))
);

create table if not exists public.manual_logs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid not null,
  date date not null,
  type text not null,
  title text not null,
  minutes integer not null default 0 check (minutes >= 0),
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint manual_logs_child_owner_fkey
    foreign key (child_id, owner_user_id)
    references public.children (id, owner_user_id)
    on delete cascade,
  constraint manual_logs_type_check
    check (type in ('dvd', 'passiveListen', 'korean', 'englishPicture', 'extraStudy'))
);

create index if not exists children_owner_idx on public.children (owner_user_id);
create index if not exists books_owner_idx on public.books (owner_user_id, active);
create index if not exists assignments_owner_date_idx on public.assignments (owner_user_id, date);
create index if not exists completions_owner_assignment_idx on public.completions (owner_user_id, assignment_id);
create index if not exists audio_launches_owner_assignment_idx on public.audio_launches (owner_user_id, assignment_id);
create index if not exists manual_logs_owner_date_idx on public.manual_logs (owner_user_id, date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
    set email = excluded.email,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists children_set_updated_at on public.children;
create trigger children_set_updated_at
  before update on public.children
  for each row execute procedure public.set_updated_at();

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
  before update on public.books
  for each row execute procedure public.set_updated_at();

drop trigger if exists assignments_set_updated_at on public.assignments;
create trigger assignments_set_updated_at
  before update on public.assignments
  for each row execute procedure public.set_updated_at();

drop trigger if exists audio_launches_set_updated_at on public.audio_launches;
create trigger audio_launches_set_updated_at
  before update on public.audio_launches
  for each row execute procedure public.set_updated_at();

drop trigger if exists manual_logs_set_updated_at on public.manual_logs;
create trigger manual_logs_set_updated_at
  before update on public.manual_logs
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.books enable row level security;
alter table public.assignments enable row level security;
alter table public.completions enable row level security;
alter table public.audio_launches enable row level security;
alter table public.manual_logs enable row level security;

drop policy if exists "profiles own rows" on public.profiles;
create policy "profiles own rows"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "children own rows" on public.children;
create policy "children own rows"
  on public.children
  for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists "books own rows" on public.books;
create policy "books own rows"
  on public.books
  for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists "assignments own rows" on public.assignments;
create policy "assignments own rows"
  on public.assignments
  for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists "completions own rows" on public.completions;
create policy "completions own rows"
  on public.completions
  for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists "audio launches own rows" on public.audio_launches;
create policy "audio launches own rows"
  on public.audio_launches
  for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists "manual logs own rows" on public.manual_logs;
create policy "manual logs own rows"
  on public.manual_logs
  for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);
