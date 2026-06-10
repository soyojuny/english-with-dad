alter table public.assignments
  add column if not exists activity_category text not null default 'focusListen';

update public.assignments
set activity_category = case
  when coalesce(task_counts, '{}'::jsonb) ? 'picture' or tasks @> array['picture']::text[] then 'englishPicture'
  when coalesce(task_counts, '{}'::jsonb) ? 'self'
    and not (coalesce(task_counts, '{}'::jsonb) ? 'listen' or coalesce(task_counts, '{}'::jsonb) ? 'shadow') then 'readAloud'
  else 'focusListen'
end;

update public.assignments
set task_counts = jsonb_strip_nulls(
  (task_counts - 'picture')
  || case
    when activity_category = 'englishPicture' and coalesce(task_counts, '{}'::jsonb) ? 'picture'
      then jsonb_build_object('listen', coalesce((task_counts ->> 'picture')::int, 1))
    else '{}'::jsonb
  end
)
where coalesce(task_counts, '{}'::jsonb) ? 'picture';

update public.assignments
set tasks = array(
  select distinct case when task = 'picture' then 'listen' else task end
  from unnest(tasks) as task
  where case when task = 'picture' then 'listen' else task end in ('listen', 'shadow', 'self')
)
where tasks @> array['picture']::text[];

update public.completions
set task_type = 'listen'
where task_type = 'picture';

drop index if exists assignments_owner_date_idx;

alter table public.assignments
  drop constraint if exists assignments_tasks_check;

alter table public.assignments
  add constraint assignments_tasks_check
  check (
    tasks <@ array['listen', 'shadow', 'self']::text[]
    and array_length(tasks, 1) is distinct from 0
  );

alter table public.assignments
  drop constraint if exists assignments_activity_category_check;

alter table public.assignments
  add constraint assignments_activity_category_check
  check (activity_category in ('focusListen', 'readAloud', 'englishPicture'));

alter table public.assignments
  drop constraint if exists assignments_owner_user_id_child_id_date_book_id_key;

alter table public.assignments
  add constraint assignments_owner_user_id_child_id_date_book_id_activity_category_key
  unique (owner_user_id, child_id, date, book_id, activity_category);

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
      where key not in ('listen', 'shadow', 'self')
        or jsonb_typeof(item) <> 'number'
        or (item::text)::int not between 1 and 3
    );
$$;

alter table public.assignments
  drop constraint if exists assignments_task_counts_check;

alter table public.assignments
  add constraint assignments_task_counts_check
  check (public.is_valid_assignment_task_counts(task_counts));

alter table public.completions
  drop constraint if exists completions_task_type_check;

alter table public.completions
  add constraint completions_task_type_check
  check (task_type in ('listen', 'shadow', 'self'));

create index if not exists assignments_owner_date_idx on public.assignments (owner_user_id, date);
