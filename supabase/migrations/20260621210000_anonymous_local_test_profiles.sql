update public.profiles
set email = 'anonymous+' || id || '@local.invalid'
where email = '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (
    new.id,
    coalesce(nullif(new.email, ''), 'anonymous+' || new.id || '@local.invalid')
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
