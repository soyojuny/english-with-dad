alter table public.assignments
  drop constraint if exists assignments_quiz_score_check;

alter table public.assignments
  alter column quiz_score type text using quiz_score::text;

alter table public.assignments
  add constraint assignments_quiz_score_text_check
  check (quiz_score is null or char_length(btrim(quiz_score)) between 1 and 40);
