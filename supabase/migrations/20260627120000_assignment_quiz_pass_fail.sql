update public.assignments
set quiz_score = upper(btrim(quiz_score))
where quiz_score is not null
  and upper(btrim(quiz_score)) in ('PASS', 'FAIL');

update public.assignments
set quiz_score = null
where quiz_score is not null
  and upper(btrim(quiz_score)) not in ('PASS', 'FAIL');

alter table public.assignments
  drop constraint if exists assignments_quiz_score_text_check;

alter table public.assignments
  add constraint assignments_quiz_score_pass_fail_check
  check (quiz_score is null or quiz_score in ('PASS', 'FAIL'));
