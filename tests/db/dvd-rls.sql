-- Only run against an isolated local Supabase database as an administrative role.
-- psql "$LOCAL_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/db/dvd-rls.sql
-- All fixtures and mutations are rolled back, including on connection failure.
begin;

insert into auth.users (id, email) values
  ('c7b9e311-87f0-4665-9345-e8d8b9ce5101', 'dvd-rls-owner@example.invalid'),
  ('c7b9e311-87f0-4665-9345-e8d8b9ce5102', 'dvd-rls-other@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c7b9e311-87f0-4665-9345-e8d8b9ce5101', true);

do $$
declare
  affected integer;
  denied boolean;
begin
  -- Given: RLS is evaluated as a non-owner role that cannot bypass it.
  if exists (select 1 from pg_roles where rolname = current_user and (rolsuper or rolbypassrls))
     or (select tableowner = current_user from pg_tables where schemaname = 'public' and tablename = 'dvds') then
    raise exception 'test role bypasses RLS';
  end if;

  -- When/Then: the owner can insert, select, and update their row.
  insert into public.dvds (id, owner_user_id, title, active)
  values ('c7b9e311-87f0-4665-9345-e8d8b9ce5201', 'c7b9e311-87f0-4665-9345-e8d8b9ce5101', 'Owner DVD', true);
  if (select count(*) from public.dvds where id = 'c7b9e311-87f0-4665-9345-e8d8b9ce5201') <> 1 then
    raise exception 'owner cannot select own DVD';
  end if;
  update public.dvds set active = false where id = 'c7b9e311-87f0-4665-9345-e8d8b9ce5201';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'owner cannot update own DVD'; end if;

  -- When/Then: forging another owner on insert or update is rejected.
  denied := false;
  begin
    insert into public.dvds (owner_user_id, title, active)
    values ('c7b9e311-87f0-4665-9345-e8d8b9ce5102', 'Forged DVD', true);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'forged owner insert was accepted'; end if;
  denied := false;
  begin
    update public.dvds set owner_user_id = 'c7b9e311-87f0-4665-9345-e8d8b9ce5102'
    where id = 'c7b9e311-87f0-4665-9345-e8d8b9ce5201';
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'forged owner update was accepted'; end if;
end $$;

select set_config('request.jwt.claim.sub', 'c7b9e311-87f0-4665-9345-e8d8b9ce5102', true);
do $$
declare affected integer;
begin
  -- When/Then: another user cannot see or update the owner's row.
  if (select count(*) from public.dvds where id = 'c7b9e311-87f0-4665-9345-e8d8b9ce5201') <> 0 then
    raise exception 'another user can see the DVD';
  end if;
  update public.dvds set active = true where id = 'c7b9e311-87f0-4665-9345-e8d8b9ce5201';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'another user can update the DVD'; end if;
end $$;

reset role;
rollback;
