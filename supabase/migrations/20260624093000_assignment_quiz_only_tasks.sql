alter table public.assignments
  drop constraint if exists assignments_tasks_check;

alter table public.assignments
  add constraint assignments_tasks_check
  check (
    tasks <@ array['listen', 'shadow', 'self', 'wordRead']::text[]
    and (
      array_length(tasks, 1) is distinct from 0
      or quiz_enabled
    )
  );
