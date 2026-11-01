alter table public.assignments
  add column quiz_points integer;

alter table public.assignments
  add constraint assignments_quiz_points_check
  check (quiz_points is null or quiz_points between 0 and 100);
