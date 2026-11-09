-- Allow the approved thunder baby artwork to use the existing per-dragon fly skill.
-- Ownership, reward accounting, idempotency, RLS and grants are unchanged.
create or replace function public.dragon_world(p_child uuid, p_action text default 'sync', p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 v_available text[] := array['lava-open-foreground','lava-stone-platform','lava-central-volcano','lava-waterfall','ancient-dragon-relic','lava-crystal'];
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
 select (select count(*) from public.dragon_owned_items where child_id = p_child)
   + coalesce((select sum(cardinality(skills)) from public.dragons where child_id = p_child), 0) into v_spent;
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
 elsif p_action = 'skill' then
   if p_payload->>'skill' is distinct from 'fly' then raise exception '지원하지 않는 기능입니다.'; end if;
   select * into v_dragon from public.dragons where id = (p_payload->>'id')::uuid and child_id = p_child;
   if not found then raise exception '드래곤을 찾지 못했어요.'; end if;
   -- A retry of a successful acquisition never spends another reward choice.
   if not ('fly' = any(v_dragon.skills)) then
     if v_dragon.days not between 1 and 17 or (v_dragon.element is not null and v_dragon.element not in ('fire','thunder')) then raise exception '무속성·불·번개 아기 드래곤만 날기를 배울 수 있어요.'; end if;
     if v_total / 3 <= v_spent then raise exception '기능 선택 기회가 아직 없어요.'; end if;
     update public.dragons set skills = array_append(skills, 'fly') where id = v_dragon.id;
   end if;
 elsif p_action = 'claim' then
   select * into v_item from public.dragon_items where id = p_payload->>'itemId';
   if not found or not (v_item.id = any(v_available)) then raise exception '현재 제공하는 배경과 장식만 사용할 수 있어요.'; end if;
   if not v_item.free and not exists (select 1 from public.dragon_owned_items where child_id = p_child and item_id = v_item.id) then
     if v_total / 3 <= v_spent then raise exception '소품 선택 기회가 아직 없어요.'; end if;
     insert into public.dragon_owned_items(child_id, owner_user_id, item_id) values (p_child, v_owner, v_item.id);
   end if;
 elsif p_action = 'decorate' then
   select * into v_dragon from public.dragons where id = (p_payload->>'id')::uuid and child_id = p_child;
   if not found then raise exception '드래곤을 찾지 못했어요.'; end if;
   v_decor := p_payload->'decor';
   if jsonb_typeof(v_decor) is distinct from 'object' then raise exception '배치를 확인해 주세요.'; end if;
   if (select count(*) from jsonb_object_keys(v_decor)) <> 3 then raise exception '배치 자리를 확인해 주세요.'; end if;
   foreach v_slot in array array['background','left','right'] loop
     v_placement := v_decor->v_slot;
     if jsonb_typeof(v_placement) is distinct from 'object'
       or jsonb_typeof(v_placement->'x') is distinct from 'number'
       or jsonb_typeof(v_placement->'y') is distinct from 'number'
       or not (v_placement ? 'itemId') then raise exception '배치 좌표를 확인해 주세요.'; end if;
     if (v_placement->>'x')::numeric not between 15 and 85 or (v_placement->>'y')::numeric not between 15 and 85 then raise exception '장면 안에 놓아 주세요.'; end if;
     if v_placement->>'itemId' is not null then
       select * into v_item from public.dragon_items where id = v_placement->>'itemId';
       if not found or not (v_item.id = any(v_available)) then raise exception '현재 제공하는 배경과 장식만 사용할 수 있어요.'; end if;
       if v_item.kind <> (case when v_slot in ('left','right') then 'prop' else v_slot end) then raise exception '이 자리에 놓을 수 없는 소품이에요.'; end if;
       if not v_item.free and not exists (select 1 from public.dragon_owned_items where child_id = p_child and item_id = v_item.id) then raise exception '먼저 소품을 받아 주세요.'; end if;
     elsif v_slot = 'background' then raise exception '배경을 골라 주세요.';
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
   'credits', v_total / 3 - (select count(*) from public.dragon_owned_items where child_id = p_child)
     - coalesce((select sum(cardinality(skills)) from public.dragons where child_id = p_child), 0),
   'owned', (select coalesce(jsonb_agg(id), '[]') from (
     select id from public.dragon_items where free union select item_id from public.dragon_owned_items where child_id = p_child
   ) owned),
   'catalog', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'kind',kind,'art',art,'free',free) order by sort_order, id), '[]') from public.dragon_items where id = any(v_available)),
   'dragons', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'egg',egg,'selectedDate',selected_date,'days',days,'element',element,'skills',to_jsonb(skills),'decor',jsonb_build_object(
     'background', case when decor->'background'->>'itemId' in ('lava-open-foreground','lava-stone-platform','lava-central-volcano','lava-waterfall')
       then decor->'background' else '{"itemId":"lava-open-foreground","x":50,"y":50}'::jsonb end,
     'left', case when decor->'left'->>'itemId' in ('ancient-dragon-relic','lava-crystal') or decor->'left'->'itemId' = 'null'::jsonb
       then decor->'left' else '{"itemId":"ancient-dragon-relic","x":82,"y":60}'::jsonb end,
     'right', case when decor->'right'->>'itemId' in ('ancient-dragon-relic','lava-crystal') or decor->'right'->'itemId' = 'null'::jsonb
       then decor->'right' else '{"itemId":"lava-crystal","x":15,"y":82}'::jsonb end
   ),'version',version) order by created_at, id), '[]') from public.dragons where child_id = p_child)
 );
end;
$$;
revoke all on function public.dragon_world(uuid,text,jsonb) from public, anon;
grant execute on function public.dragon_world(uuid,text,jsonb) to authenticated;
