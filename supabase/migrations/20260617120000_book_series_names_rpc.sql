create or replace function public.book_series_names(target_owner_user_id uuid)
returns table(series text)
language sql
stable
set search_path = public
as $$
  select distinct btrim(books.series) as series
  from public.books
  where books.owner_user_id = target_owner_user_id
    and books.owner_user_id = auth.uid()
    and nullif(btrim(books.series), '') is not null
  order by series;
$$;

grant execute on function public.book_series_names(uuid) to authenticated;
