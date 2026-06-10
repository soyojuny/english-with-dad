alter table public.assignments
  add column if not exists task_counts jsonb not null default '{}'::jsonb;

create or replace function public.is_valid_assignment_task_counts(value jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(value) = 'object'
    and not exists (
      select 1
      from jsonb_each(value) as entry(key, item)
      where key not in ('listen', 'shadow', 'self', 'picture')
        or jsonb_typeof(item) <> 'number'
        or (item::text)::int not between 1 and 3
    );
$$;

update public.assignments
set task_counts = coalesce(
  (
    select jsonb_object_agg(task_type, task_count)
    from (
      select task_type, count(*)::int as task_count
      from unnest(tasks) as task_type
      group by task_type
    ) counts
  ),
  '{}'::jsonb
)
where task_counts = '{}'::jsonb;

alter table public.assignments
  drop constraint if exists assignments_task_counts_check;

alter table public.assignments
  add constraint assignments_task_counts_check
  check (public.is_valid_assignment_task_counts(task_counts));

alter table public.completions
  add column if not exists count integer not null default 1;

update public.completions
set count = 1
where count is null or count < 1;
