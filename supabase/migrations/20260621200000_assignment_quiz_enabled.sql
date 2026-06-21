alter table public.assignments
  add column if not exists quiz_enabled boolean not null default false;

update public.assignments
set quiz_enabled = true
where quiz_score is not null;
