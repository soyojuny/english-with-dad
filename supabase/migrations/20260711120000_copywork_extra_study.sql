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
      where key not in ('listen', 'shadow', 'self', 'wordRead', 'copywork')
        or jsonb_typeof(item) <> 'number'
        or (item::text)::int not between 1 and 3
    );
$$;

alter table public.assignments
  drop constraint if exists assignments_tasks_check;

alter table public.assignments
  add constraint assignments_tasks_check
  check (
    tasks <@ array['listen', 'shadow', 'self', 'wordRead', 'copywork']::text[]
    and (
      array_length(tasks, 1) is distinct from 0
      or quiz_enabled
    )
  );

alter table public.assignments
  drop constraint if exists assignments_task_counts_check;

alter table public.assignments
  add constraint assignments_task_counts_check
  check (public.is_valid_assignment_task_counts(task_counts));

alter table public.completions
  drop constraint if exists completions_task_type_check;

alter table public.completions
  add constraint completions_task_type_check
  check (task_type in ('listen', 'shadow', 'self', 'wordRead', 'copywork'));

alter table public.audio_launches
  drop constraint if exists audio_launches_task_type_check;

alter table public.audio_launches
  add constraint audio_launches_task_type_check
  check (task_type in ('listen', 'shadow', 'self', 'wordRead', 'copywork'));
