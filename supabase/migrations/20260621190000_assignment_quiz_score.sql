alter table public.assignments
  add column if not exists quiz_score integer;

alter table public.assignments
  drop constraint if exists assignments_quiz_score_check;

alter table public.assignments
  add constraint assignments_quiz_score_check
  check (quiz_score is null or quiz_score between 0 and 100);
