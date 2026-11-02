-- Rewards are append-only through checked RPCs/triggers. Direct client writes are forbidden.
create table public.dragon_items (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('background', 'nest', 'prop')),
  art text not null,
  free boolean not null default false,
  sort_order integer not null default 0
);
insert into public.dragon_items (id, name, kind, art, free, sort_order) values
 ('meadow', '초록 숲', 'background', 'meadow', true, 0),
 ('moss', '이끼 둥지', 'nest', 'moss', true, 1),
 ('flowers', '들꽃', 'prop', 'flowers', true, 2),
 ('sunset', '노을 언덕', 'background', 'sunset', false, 3),
 ('moon', '달빛 숲', 'background', 'moon', false, 4),
 ('crystal', '수정 둥지', 'nest', 'crystal', false, 5),
 ('ancient', '고대의 둥지', 'nest', 'ancient', false, 6),
 ('gem', '소원 수정', 'prop', 'gem', false, 7),
 ('lantern', '별빛 등불', 'prop', 'lantern', false, 8),
 ('flag', '용기의 깃발', 'prop', 'flag', false, 9),
 ('mushroom', '동화 버섯', 'prop', 'mushroom', false, 10);

create table public.dragon_progress (
 child_id uuid primary key,
 owner_user_id uuid not null,
 first_egg_date date,
 total_days integer not null default 0 check (total_days >= 0),
 foreign key (child_id, owner_user_id) references public.children(id, owner_user_id) on delete cascade
);
create table public.dragon_days (
 child_id uuid not null,
 owner_user_id uuid not null,
 date date not null,
 primary key (child_id, date),
 foreign key (child_id, owner_user_id) references public.children(id, owner_user_id) on delete cascade
);
create table public.dragons (
 id uuid primary key,
 child_id uuid not null,
 owner_user_id uuid not null,
 egg integer not null check (egg between 0 and 2),
 selected_date date not null,
 days integer not null default 0 check (days between 0 and 30),
 element text check (element in ('fire', 'thunder', 'ice')),
 decor jsonb not null default '{"background":{"itemId":"meadow","x":50,"y":50},"nest":{"itemId":"moss","x":50,"y":78},"left":{"itemId":"flowers","x":22,"y":76},"right":{"itemId":null,"x":78,"y":76}}',
 version integer not null default 0,
 created_at timestamptz not null default now(),
 foreign key (child_id, owner_user_id) references public.children(id, owner_user_id) on delete cascade
);
create unique index one_growing_dragon_per_child on public.dragons(child_id) where days < 30;
create table public.dragon_owned_items (
 child_id uuid not null,
 owner_user_id uuid not null,
 item_id text not null references public.dragon_items(id),
 primary key (child_id, item_id),
 foreign key (child_id, owner_user_id) references public.children(id, owner_user_id) on delete cascade
);

alter table public.dragon_items enable row level security;
create policy dragon_catalog_read on public.dragon_items for select to authenticated using (true);
alter table public.dragon_progress enable row level security;
create policy dragon_progress_read on public.dragon_progress for select to authenticated using (auth.uid() = owner_user_id);
alter table public.dragon_days enable row level security;
create policy dragon_days_read on public.dragon_days for select to authenticated using (auth.uid() = owner_user_id);
alter table public.dragons enable row level security;
create policy dragons_read on public.dragons for select to authenticated using (auth.uid() = owner_user_id);
alter table public.dragon_owned_items enable row level security;
create policy dragon_owned_read on public.dragon_owned_items for select to authenticated using (auth.uid() = owner_user_id);
revoke all on public.dragon_items, public.dragon_progress, public.dragon_days, public.dragons, public.dragon_owned_items from anon, authenticated;
grant select on public.dragon_items, public.dragon_progress, public.dragon_days, public.dragons, public.dragon_owned_items to authenticated;

-- Definer is required to protect the reward ledger from arbitrary authenticated writes.
-- Internal helpers cannot be invoked over PostgREST; every path locks/checks the child owner.
create function public.dragon_award_today(p_child uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
 v_owner uuid;
 v_today date := (statement_timestamp() at time zone 'Asia/Seoul')::date;
 v_first date;
 v_inserted integer;
begin
 select owner_user_id into v_owner from public.children where id = p_child for update;
 if v_owner is null then return; end if;
 insert into public.dragon_progress(child_id, owner_user_id) values (p_child, v_owner) on conflict do nothing;
 if exists (select 1 from public.dragon_days where child_id = p_child and date = v_today) then return; end if;
 -- Only today's visible assignments count. Empty work is never an achievement.
 if not exists (
   select 1 from public.assignments a join public.books b on b.id = a.book_id
   where a.owner_user_id = v_owner and a.child_id = p_child and a.date = v_today and b.active
     and (a.quiz_enabled or cardinality(a.tasks) > 0)
 ) then return; end if;
 if exists (
   select 1 from public.assignments a join public.books b on b.id = a.book_id
   where a.owner_user_id = v_owner and a.child_id = p_child and a.date = v_today and b.active and (
     (a.quiz_enabled and (a.quiz_score is null or a.quiz_score not in ('PASS', 'FAIL')))
     or exists (
       select 1 from jsonb_each_text(case when a.task_counts <> '{}'::jsonb then a.task_counts
         else (select coalesce(jsonb_object_agg(t, 1), '{}'::jsonb) from unnest(a.tasks) t) end) task
       where coalesce((select c.count from public.completions c where c.assignment_id = a.id and c.task_type = task.key), 0) < greatest(1, task.value::integer)
     )
   )
 ) then return; end if;
 insert into public.dragon_days(child_id, owner_user_id, date) values (p_child, v_owner, v_today) on conflict do nothing;
 get diagnostics v_inserted = row_count;
 if v_inserted = 0 then return; end if;
 select first_egg_date into v_first from public.dragon_progress where child_id = p_child;
 if v_first < v_today then
   update public.dragon_progress set total_days = total_days + 1 where child_id = p_child;
   update public.dragons set days = days + 1 where child_id = p_child and days < 30 and selected_date < v_today;
 end if;
end;
$$;
revoke all on function public.dragon_award_today(uuid) from public, anon, authenticated;

create function public.dragon_learning_saved() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_child uuid;
begin
 if tg_table_name = 'completions' then
   select child_id into v_child from public.assignments where id = new.assignment_id;
 else
   v_child := new.child_id;
 end if;
 perform public.dragon_award_today(v_child);
 return new;
end;
$$;
revoke all on function public.dragon_learning_saved() from public, anon, authenticated;
create trigger dragon_completion_saved after insert or update on public.completions for each row execute function public.dragon_learning_saved();
create trigger dragon_assignment_saved after insert or update on public.assignments for each row execute function public.dragon_learning_saved();

create function public.dragon_world(p_child uuid, p_action text default 'sync', p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 v_owner uuid;
 v_today date := (statement_timestamp() at time zone 'Asia/Seoul')::date;
 v_total integer;
 v_spent integer;
 v_dragon public.dragons;
 v_slot text;
 v_placement jsonb;
 v_item public.dragon_items;
 v_id uuid;
 v_decor jsonb;
begin
 select owner_user_id into v_owner from public.children where id = p_child and owner_user_id = auth.uid() for update;
 if v_owner is null then raise exception '아동 정보를 확인할 권한이 없습니다.'; end if;
 perform public.dragon_award_today(p_child);
 select total_days into v_total from public.dragon_progress where child_id = p_child;
 select count(*) into v_spent from public.dragon_owned_items where child_id = p_child;
 if p_action = 'egg' then
   v_id := (p_payload->>'id')::uuid;
   select * into v_dragon from public.dragons where id = v_id;
   if found then
     if v_dragon.child_id <> p_child or v_dragon.egg <> (p_payload->>'egg')::integer then raise exception '알 선택 요청이 다릅니다.'; end if;
   else
     if not exists (select 1 from public.dragon_days where child_id = p_child) then raise exception '오늘의 학습을 먼저 완료해 주세요.'; end if;
     if exists (select 1 from public.dragons where child_id = p_child and days < 30) then raise exception '키우는 드래곤이 이미 있어요.'; end if;
     insert into public.dragons(id, child_id, owner_user_id, egg, selected_date)
       values (v_id, p_child, v_owner, (p_payload->>'egg')::integer, v_today);
     update public.dragon_progress set first_egg_date = coalesce(first_egg_date, v_today) where child_id = p_child;
   end if;
 elsif p_action = 'element' then
   select * into v_dragon from public.dragons where id = (p_payload->>'id')::uuid and child_id = p_child;
   if not found or v_dragon.days < 6 then raise exception '6일 달성 후 속성을 고를 수 있어요.'; end if;
   if p_payload->>'element' is null or p_payload->>'element' not in ('fire','thunder','ice') then raise exception '속성을 확인해 주세요.'; end if;
   if v_dragon.element is not null and v_dragon.element <> p_payload->>'element' then raise exception '이미 선택한 속성은 바꿀 수 없어요.'; end if;
   update public.dragons set element = p_payload->>'element' where id = v_dragon.id;
 elsif p_action = 'claim' then
   select * into v_item from public.dragon_items where id = p_payload->>'itemId';
   if not found then raise exception '소품을 찾지 못했어요.'; end if;
   if not v_item.free and not exists (select 1 from public.dragon_owned_items where child_id = p_child and item_id = v_item.id) then
     if v_total / 3 <= v_spent then raise exception '소품 선택 기회가 아직 없어요.'; end if;
     insert into public.dragon_owned_items(child_id, owner_user_id, item_id) values (p_child, v_owner, v_item.id);
   end if;
 elsif p_action = 'decorate' then
   select * into v_dragon from public.dragons where id = (p_payload->>'id')::uuid and child_id = p_child;
   if not found then raise exception '드래곤을 찾지 못했어요.'; end if;
   v_decor := p_payload->'decor';
   if jsonb_typeof(v_decor) is distinct from 'object' then raise exception '배치를 확인해 주세요.'; end if;
   if (select count(*) from jsonb_object_keys(v_decor)) <> 4 then raise exception '배치 자리를 확인해 주세요.'; end if;
   foreach v_slot in array array['background','nest','left','right'] loop
     v_placement := v_decor->v_slot;
     if jsonb_typeof(v_placement) is distinct from 'object'
       or jsonb_typeof(v_placement->'x') is distinct from 'number'
       or jsonb_typeof(v_placement->'y') is distinct from 'number'
       or not (v_placement ? 'itemId') then raise exception '배치 좌표를 확인해 주세요.'; end if;
     if (v_placement->>'x')::numeric not between 15 and 85 or (v_placement->>'y')::numeric not between 15 and 85 then raise exception '장면 안에 놓아 주세요.'; end if;
     if v_placement->>'itemId' is not null then
       select * into v_item from public.dragon_items where id = v_placement->>'itemId';
       if not found or v_item.kind <> (case when v_slot in ('left','right') then 'prop' else v_slot end) then raise exception '이 자리에 놓을 수 없는 소품이에요.'; end if;
       if not v_item.free and not exists (select 1 from public.dragon_owned_items where child_id = p_child and item_id = v_item.id) then raise exception '먼저 소품을 받아 주세요.'; end if;
     elsif v_slot in ('background','nest') then raise exception '배경과 둥지를 골라 주세요.';
     end if;
   end loop;
   -- A lost successful response can be retried, but concurrent edits cannot overwrite each other.
   if v_dragon.decor <> v_decor then
     if (p_payload->>'version')::integer is distinct from v_dragon.version then raise exception '다른 화면에서 꾸미기가 바뀌었어요. 다시 불러와 주세요.'; end if;
     update public.dragons set decor = v_decor, version = version + 1 where id = v_dragon.id;
   end if;
 elsif p_action <> 'sync' or p_action is null then raise exception '지원하지 않는 동작입니다.';
 end if;
 return jsonb_build_object(
   'today', v_today,
   'credited', exists(select 1 from public.dragon_days where child_id = p_child and date = v_today),
   'eligible', exists(select 1 from public.dragon_days where child_id = p_child),
   'totalDays', v_total,
   'credits', v_total / 3 - (select count(*) from public.dragon_owned_items where child_id = p_child),
   'owned', (select coalesce(jsonb_agg(id), '[]') from (
     select id from public.dragon_items where free union select item_id from public.dragon_owned_items where child_id = p_child
   ) owned),
   'catalog', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'kind',kind,'art',art,'free',free) order by sort_order, id), '[]') from public.dragon_items),
   'dragons', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'egg',egg,'selectedDate',selected_date,'days',days,'element',element,'decor',decor,'version',version) order by created_at, id), '[]') from public.dragons where child_id = p_child)
 );
end;
$$;
revoke all on function public.dragon_world(uuid,text,jsonb) from public, anon;
grant execute on function public.dragon_world(uuid,text,jsonb) to authenticated;
