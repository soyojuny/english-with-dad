import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { DragonWorld } from "../../lib/dragon-types";
import { defaultDragonDecor } from "../../lib/dragon-data";

const db = new PGlite();
const owner = "10000000-0000-0000-0000-000000000001";
const other = "10000000-0000-0000-0000-000000000002";
const child = "20000000-0000-0000-0000-000000000001";
const book = "30000000-0000-0000-0000-000000000001";
const assignment = "40000000-0000-0000-0000-000000000001";
const dragon = "50000000-0000-0000-0000-000000000001";
const nextDragon = "50000000-0000-0000-0000-000000000002";
const today = "(statement_timestamp() at time zone 'Asia/Seoul')::date";
async function world(action = "sync", payload = {}, target = child) {
  return (await db.query<{ world: DragonWorld }>("select public.dragon_world($1,$2,$3::jsonb) as world", [target, action, JSON.stringify(payload)])).rows[0].world;
}
async function complete() {
  await db.exec(`insert into public.assignments(id,owner_user_id,child_id,book_id,date,tasks,task_counts,quiz_enabled) values ('${assignment}','${owner}','${child}','${book}',${today},array['self'],'{"self":2}',true);
    insert into public.completions(owner_user_id,assignment_id,task_type,count) values ('${owner}','${assignment}','self',2);
    update public.assignments set quiz_score='FAIL' where id='${assignment}';`);
}
async function seedGrowing(days: number, total = days) {
  await complete(); await world("egg", { id: dragon, egg: 0 });
  await db.exec(`update public.dragons set days=${days}, selected_date=${today}-40;
    update public.dragon_progress set total_days=${total}, first_egg_date=${today}-40;
    delete from public.dragon_days;`);
}

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;`);
  const directory = resolve("supabase/migrations");
  for (const file of (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort()) {
    // PGlite has core gen_random_uuid; the Supabase pgcrypto extension is not needed here.
    const sql = (await readFile(resolve(directory, file), "utf8")).replace('create extension if not exists pgcrypto;', '');
    try { await db.exec(sql); } catch (error) {
      const detail = error as { position?: string; internalQuery?: string; where?: string };
      throw new Error(`${file}: ${String(error)} near ${sql.slice(Number(detail.position) - 120, Number(detail.position) + 60)} ${detail.where ?? ''} ${detail.internalQuery ?? ''}`);
    }
  }
}, 30_000);
afterAll(async () => db.close());
beforeEach(async () => {
  await db.exec(`reset role; truncate public.children, public.books, auth.users cascade;
    insert into auth.users values ('${owner}','one@test.invalid'),('${other}','two@test.invalid');
    insert into public.children(id,owner_user_id,name) values ('${child}','${owner}','아이');
    insert into public.books(id,owner_user_id,title,series) values ('${book}','${owner}','책','시리즈');
    select set_config('request.jwt.claim.sub','${owner}',false);`);
});

test("첫 완료 자동 인정, FAIL 허용, 알 선택 당일 0일, 중복 확인과 기록 수정 후 유지", async () => {
  // Given
  await complete();
  // When: trigger has already written the achievement, before any check button.
  const ledger = await db.query("select * from public.dragon_days");
  const first = await world("egg", { id: dragon, egg: 2 });
  await db.exec(`update public.completions set count=1; update public.assignments set quiz_score=null;`);
  const checked = await world();
  const retry = await world("egg", { id: dragon, egg: 2 });
  // Then
  expect(ledger.rows).toHaveLength(1);
  expect(first.dragons[0]).toMatchObject({ days: 0, egg: 2 });
  expect(checked).toMatchObject({ credited: true, totalDays: 0, credits: 0 });
  expect(retry.dragons).toHaveLength(1);
});

test("배정 없음·미완료·과거 학습은 알 자격을 주지 않는다", async () => {
  // Given
  expect((await world()).eligible).toBe(false);
  // When
  await db.exec(`insert into public.assignments(id,owner_user_id,child_id,book_id,date,tasks,quiz_enabled) values ('${assignment}','${owner}','${child}','${book}',${today}-1,array[]::text[],true);
    update public.assignments set quiz_score='PASS';`);
  const result = await world();
  // Then
  expect(result).toMatchObject({ credited: false, eligible: false, credits: 0 });
  await expect(world("egg", { id: dragon, egg: 0 })).rejects.toThrow('먼저 완료');
});

for (const [before, after, credits] of [[0,1,0],[2,3,1],[5,6,2],[16,17,5],[17,18,6],[28,29,9],[29,30,10]]) {
  test(`성장 경계: ${before} → ${after}일, 선택하지 않아도 성장하고 선택 기회 ${credits}개`, async () => {
    // Given
    await seedGrowing(before);
    // When
    const result = await world(); const repeat = await world();
    // Then
    expect(result).toMatchObject({ totalDays: after, credits, credited: true });
    expect(result.dragons[0]).toMatchObject({ days: after, element: null });
    expect(repeat.totalDays).toBe(after);
  });
}

test("늦은 속성 선택은 성장과 소품 기회를 유지하고 변경은 거절한다", async () => {
  // Given
  await seedGrowing(29);
  // When
  const result = await world("element", { id: dragon, element: "ice" });
  // Then
  expect(result.dragons[0]).toMatchObject({ days: 30, element: "ice" });
  expect(result.credits).toBe(10);
  expect((await world("element", { id: dragon, element: "ice" })).credits).toBe(10);
  await expect(world("element", { id: dragon, element: "fire" })).rejects.toThrow('바꿀 수');
});

test("성체 후 선택을 미뤄도 보상은 누적하고 다음 알은 0일이다", async () => {
  // Given
  await seedGrowing(30);
  // When
  const waiting = await world();
  const next = await world("egg", { id: nextDragon, egg: 1 });
  // Then
  expect(waiting.totalDays).toBe(31);
  expect(waiting.dragons[0].days).toBe(30);
  expect(next.dragons.map((entry) => entry.days)).toEqual([30, 0]);
  expect(next.totalDays).toBe(31);
});

test("기본 소품은 중복 요청해도 무료이며 자유 좌표와 아이 공용 소품을 저장한다", async () => {
  // Given
  await seedGrowing(29);
  const owned = await world("claim", { itemId: "lava-crystal" });
  const decor = defaultDragonDecor(); decor.left = { itemId: 'lava-crystal', x: 15, y: 85 };
  // When
  const saved = await world("decorate", { id: dragon, version: 0, decor });
  const retried = await world("decorate", { id: dragon, version: 0, decor });
  const next = await world("egg", { id: nextDragon, egg: 0 });
  const both = await world("decorate", { id: nextDragon, version: 0, decor });
  // Then
  expect(owned.credits).toBe(10);
  expect(saved.dragons[0].decor.left).toEqual({ itemId: 'lava-crystal', x: 15, y: 85 });
  expect(retried.dragons[0].version).toBe(1);
  expect(next.dragons[1].decor.left.itemId).toBe('ancient-dragon-relic');
  expect(both.dragons.every((entry) => entry.decor.left.itemId === 'lava-crystal')).toBe(true);
});

test("제공하지 않는 소품·잘못된 자리·범위 밖 좌표와 다른 화면의 배치 덮어쓰기를 거절한다", async () => {
  // Given
  await seedGrowing(0);
  const decor = defaultDragonDecor();
  // When / Then: external JSON inputs must be rejected by the server.
  await expect(world("decorate", { id: dragon, version: 0, decor: { ...decor, left: { itemId: 'gem', x: 50, y: 50 } } })).rejects.toThrow('현재 제공');
  await expect(world("decorate", { id: dragon, version: 0, decor: { ...decor, left: { itemId: 'lava-open-foreground', x: 50, y: 50 } } })).rejects.toThrow('없는 소품');
  await expect(world("decorate", { id: dragon, version: 0, decor: { ...decor, left: { itemId: 'lava-crystal', x: 101, y: 50 } } })).rejects.toThrow('장면 안');
  await expect(world("decorate", { id: dragon, version: 0, decor: {} })).rejects.toThrow('배치 자리');
  await expect(world("decorate", { id: dragon, version: 0, decor: { ...decor, nest: { itemId: null, x: 50, y: 78 } } })).rejects.toThrow('배치 자리');
  await world("decorate", { id: dragon, version: 0, decor: { ...decor, left: { itemId: 'lava-crystal', x: 50, y: 50 } } });
  await expect(world("decorate", { id: dragon, version: 0, decor })).rejects.toThrow('다른 화면');
  await expect(world('claim', { itemId: 'gem' })).rejects.toThrow('현재 제공');
});

test("인증된 소유자만 조회·RPC를 쓰고 원장 직접 변경과 내부 함수 호출은 금지한다", async () => {
  // Given
  await complete(); await world("egg", { id: dragon, egg: 0 });
  // When
  await db.exec('set role authenticated');
  const own = await world();
  // Then
  expect(own.dragons).toHaveLength(1);
  await expect(db.exec('update public.dragons set days=30')).rejects.toThrow('permission denied');
  await expect(db.exec(`select public.dragon_award_today('${child}')`)).rejects.toThrow('permission denied');
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
  expect((await db.query('select * from public.dragons')).rows).toHaveLength(0);
  await expect(world()).rejects.toThrow('권한');
  await db.exec('set role anon');
  await expect(world()).rejects.toThrow('permission denied');
});

test("알 선택을 미룬 이전 달성은 소급하지 않고 선택 이후 다음 달성에 부화한다", async () => {
  // Given: a historical achievement unlocks an egg, without granting retroactive days.
  await db.exec(`insert into public.dragon_days(child_id, owner_user_id, date) values ('${child}','${owner}',${today}-5);`);
  const chosen = await world("egg", { id: dragon, egg: 1 });
  await complete();
  const sameDay = await world();
  // When: represent the next achievement day without changing the test system clock.
  await db.exec(`update public.dragons set selected_date=${today}-1; update public.dragon_progress set first_egg_date=${today}-1; delete from public.dragon_days where date=${today};`);
  const nextDay = await world();
  // Then
  expect(chosen).toMatchObject({ totalDays: 0, credits: 0 });
  expect(sameDay.dragons[0].days).toBe(0);
  expect(nextDay).toMatchObject({ totalDays: 1, credits: 0 });
  expect(nextDay.dragons[0].days).toBe(1);
});

test("비활성 책의 미완료와 FAIL은 달성을 막지 않으며 추가 학습은 인정 취소하지 않는다", async () => {
  // Given
  await complete();
  // When
  await db.exec(`insert into public.books(id,owner_user_id,title,series,active) values ('30000000-0000-0000-0000-000000000002','${owner}','쉬는 책','시리즈',false);
    insert into public.assignments(owner_user_id,child_id,book_id,date,tasks) values ('${owner}','${child}','30000000-0000-0000-0000-000000000002',${today},array['self']);
    delete from public.dragon_days;`);
  const inactive = await world();
  await db.exec(`update public.books set active=true;`);
  const added = await world();
  // Then
  expect(inactive.credited).toBe(true);
  expect(added.credited).toBe(true);
  expect((await db.query('select * from public.dragon_days')).rows).toHaveLength(1);
});

test("현재 원화만 제공하며 새 미지원 소품도 숨기고 기회는 보존한다", async () => {
  // Given
  await seedGrowing(29);
  // When
  await db.exec("insert into public.dragon_items values ('new-star','새 별','prop','star',false,20)");
  const updated = await world();
  // Then
  expect(updated.credits).toBe(10);
  expect(updated.catalog).toHaveLength(6);
  expect(updated.catalog.every((item) => item.free)).toBe(true);
  expect(updated.catalog.some((item) => ['new-star','moss','flowers','gem'].includes(item.id))).toBe(false);
  await expect(world('claim', { itemId: 'new-star' })).rejects.toThrow('현재 제공');
});

test("학습 트랜잭션이 롤백되면 달성과 보상도 함께 롤백된다", async () => {
  // Given
  await db.exec('begin');
  await complete();
  // When
  await db.exec('rollback');
  const result = await world();
  // Then
  expect(result).toMatchObject({ credited: false, eligible: false, totalDays: 0 });
  expect((await db.query('select * from public.dragon_days')).rows).toHaveLength(0);
});

test("첫 알은 제공 원화로 시작하며 무료 배경과 장식을 기회 차감 없이 저장한다", async () => {
  // Given: a first-release egg with the supplied default artwork and no reward credits.
  await complete();
  const before = await world("egg", { id: dragon, egg: 0 });
  const freeIds = ["lava-open-foreground", "lava-stone-platform", "lava-central-volcano", "lava-waterfall", "ancient-dragon-relic", "lava-crystal"];
  expect(before.dragons[0].decor).toEqual(defaultDragonDecor());
  expect(before.owned).toEqual(expect.arrayContaining(freeIds));
  expect(before.catalog.filter((item) => freeIds.includes(item.id)).every((item) => item.free)).toBe(true);
  const decor = { ...defaultDragonDecor(), background: { itemId: "lava-open-foreground", x: 50, y: 50 },
    left: { itemId: "ancient-dragon-relic", x: 78, y: 60 }, right: { itemId: "lava-crystal", x: 22, y: 76 } };
  // When
  await db.exec('set role authenticated');
  const saved = await world("decorate", { id: dragon, version: 0, decor });
  const claimed = await world("claim", { itemId: "lava-crystal" });
  // Then: free items never spend a reward opportunity or add an ownership charge.
  expect(saved.dragons[0].decor).toEqual(decor);
  expect(claimed.credits).toBe(0);
  expect((await db.query('select * from public.dragon_owned_items')).rows).toHaveLength(0);
  await expect(world("decorate", { id: dragon, version: 1, decor: { ...decor, background: { itemId: "lava-crystal", x: 50, y: 70 } } })).rejects.toThrow('없는 소품');
});

test("화면 규칙 적용은 저장 행을 일괄 변경하지 않고 명시적인 저장만 새 배치를 기록한다", async () => {
  // Given: a pre-release fixture verifies the migration never resets stored rows.
  await complete(); await world("egg", { id: dragon, egg: 0 });
  const draft = { background: { itemId: "meadow", x: 50, y: 50 }, nest: { itemId: "moss", x: 50, y: 78 },
    left: { itemId: "flowers", x: 22, y: 76 }, right: { itemId: null, x: 78, y: 76 } };
  await db.query("update public.dragons set decor=$1::jsonb, version=4 where id=$2", [JSON.stringify(draft), dragon]);
  const sql = await readFile(resolve("supabase/migrations/20261104130000_dragon_decor_without_nest.sql"), "utf8");
  // When
  await db.exec(sql);
  // Restore the current RPC after replaying this historical migration.
  const current = await readFile(resolve("supabase/migrations/20261111120000_fire_tail_attack.sql"), "utf8");
  await db.exec(current.slice(current.indexOf("create or replace function")));
  const visible = (await world()).dragons[0];
  const untouched = (await db.query<{ decor: unknown; version: number }>("select decor,version from public.dragons where id=$1", [dragon])).rows[0];
  // Then: rendering rules do not rewrite any existing data or optimistic version.
  expect(untouched).toEqual({ decor: draft, version: 4 });
  expect(Object.keys(visible.decor)).toEqual(expect.arrayContaining(["background", "left", "right"]));
  expect(visible.decor).not.toHaveProperty("nest");
  expect(visible.decor.background.itemId).toBe("lava-open-foreground");
  expect(visible.decor.left.itemId).toBe("ancient-dragon-relic");
  const saved = await world("decorate", { id: dragon, version: 4, decor: visible.decor });
  expect(saved.dragons[0].version).toBe(5);
});

for (const [before, allowed] of [[1, false], [2, true]] as const) {
  test(`날기: ${before + 1}일 달성의 기회 경계를 서버에서 확인한다`, async () => {
    // Given
    await seedGrowing(before);
    // When
    const action = world('skill', { id: dragon, skill: 'fly' });
    // Then
    if (!allowed) {
      await expect(action).rejects.toThrow('선택 기회');
      expect((await world()).dragons[0].skills).toEqual([]);
    } else {
      const acquired = await action;
      expect(acquired.credits).toBe(0);
      expect(acquired.dragons[0].skills).toEqual(['fly']);
      expect((await world('skill', { id: dragon, skill: 'fly' })).credits).toBe(0);
    }
  });
}

test('날기는 드래곤별로 저장하고 성장·속성 변경 후 재시도에도 추가 차감하지 않는다', async () => {
  // Given
  await seedGrowing(2);
  await world('skill', { id: dragon, skill: 'fly' });
  await db.exec(`update public.dragons set days=30, element='fire'; update public.dragon_progress set total_days=6;`);
  // When
  const retry = await world('skill', { id: dragon, skill: 'fly' });
  const next = await world('egg', { id: nextDragon, egg: 1 });
  // Then
  expect(retry.credits).toBe(1);
  expect(retry.dragons[0].skills).toEqual(['fly']);
  expect(next.dragons[1].skills).toEqual([]);
});

for (const [days, element] of [[0, null], [18, null], [30, null], [0, 'fire'], [18, 'fire'], [30, 'fire'], [0, 'thunder'], [18, 'thunder'], [30, 'thunder'], [6, 'ice']] as const) {
  test(`날기 최초 획득은 ${days}일/${element ?? '무속성'}에서 허용 범위를 지킨다`, async () => {
    // Given
    await seedGrowing(2); await world();
    await db.query('update public.dragons set days=$1,element=$2 where id=$3', [days, element, dragon]);
    // When
    const result = world('skill', { id: dragon, skill: 'fly' });
    // Then
    await expect(result).rejects.toThrow('무속성·불·번개 아기');
    expect((await world()).credits).toBe(1);
  });
}

for (const element of ["fire", "thunder"]) {
for (const days of [6, 17]) {
  test(`${element} 아기 ${days}일에도 날기를 배우고 재시도에는 기회를 추가 차감하지 않는다`, async () => {
    // Given
    await seedGrowing(2); await world();
    await db.query("update public.dragons set days=$1,element=$2 where id=$3", [days, element, dragon]);
    // When
    const learned = await world('skill', { id: dragon, skill: 'fly' });
    const retry = await world('skill', { id: dragon, skill: 'fly' });
    // Then
    expect(learned.dragons[0].skills).toEqual(['fly']);
    expect(learned.credits).toBe(0);
    expect(retry.credits).toBe(0);
  });
}

}

test('지원하지 않는 기능·다른 아동의 드래곤·직접 기능 변경은 거절한다', async () => {
  // Given
  await seedGrowing(2); await world();
  // When / Then
  await expect(world('skill', { id: dragon, skill: 'roar' })).rejects.toThrow('지원하지 않는');
  await expect(world('skill', { id: dragon })).rejects.toThrow('지원하지 않는');
  await db.exec(`insert into public.children(id,owner_user_id,name) values ('20000000-0000-0000-0000-000000000002','${owner}','다른 아이');
    insert into public.dragons(id,child_id,owner_user_id,egg,selected_date,days) values ('${nextDragon}','20000000-0000-0000-0000-000000000002','${owner}',0,${today},3);`);
  await expect(world('skill', { id: nextDragon, skill: 'fly' })).rejects.toThrow('찾지 못');
  await db.exec(`set role authenticated;`);
  await expect(db.exec(`update public.dragons set skills=array['fly']`)).rejects.toThrow('permission denied');
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
  await expect(world('skill', { id: dragon, skill: 'fly' })).rejects.toThrow('권한');
});

test.each(['fire', 'thunder'])('%s 아기는 날기와 꼬리 공격을 함께 배우며 각각 기회 1개만 차감한다', async (element) => {
  // Given
  await seedGrowing(5);
  await world('element', { id: dragon, element });
  await world('skill', { id: dragon, skill: 'fly' });
  // When
  const learned = await world('skill', { id: dragon, skill: 'tail-attack' });
  const retry = await world('skill', { id: dragon, skill: 'tail-attack' });
  // Then
  expect(learned.credits).toBe(0);
  expect(learned.dragons[0].skills).toEqual(['fly', 'tail-attack']);
  expect(retry.credits).toBe(0);
  await db.exec(`update public.dragons set days=30; update public.dragon_progress set total_days=9;`);
  expect((await world('skill', { id: dragon, skill: 'tail-attack' })).credits).toBe(1);
  const next = await world('egg', { id: nextDragon, egg: 1 });
  expect(next.dragons[1].skills).toEqual([]);
});

test('꼬리 공격으로 마지막 기회를 사용하면 날기는 다음 보상까지 배울 수 없다', async () => {
  // Given
  await seedGrowing(5, 2);
  await world('element', { id: dragon, element: 'thunder' });
  // When
  const learned = await world('skill', { id: dragon, skill: 'tail-attack' });
  // Then
  expect(learned.credits).toBe(0);
  await expect(world('skill', { id: dragon, skill: 'fly' })).rejects.toThrow('선택 기회');
  expect((await world()).dragons[0].skills).toEqual(['tail-attack']);
  await db.exec('update public.dragon_progress set total_days=6');
  expect((await world('skill', { id: dragon, skill: 'fly' })).dragons[0].skills).toEqual(['tail-attack', 'fly']);
});

for (const [days, element] of [[0, 'thunder'], [18, 'thunder'], [30, 'thunder'], [6, null], [0, 'fire'], [18, 'fire'], [30, 'fire'], [6, 'ice']] as const) {
  test(`꼬리 공격 최초 획득은 ${days}일/${element ?? '무속성'}에서 거절한다`, async () => {
    // Given
    await seedGrowing(5); await world();
    await db.query('update public.dragons set days=$1,element=$2 where id=$3', [days, element, dragon]);
    // When
    const request = world('skill', { id: dragon, skill: 'tail-attack' });
    // Then
    await expect(request).rejects.toThrow('불·번개 아기');
    expect((await world()).credits).toBe(2);
    expect((await world()).dragons[0].skills).toEqual([]);
  });
}

for (const element of ["fire", "thunder"]) for (const days of [1, 17]) {
  test(`${element} 아기 ${days}일 경계에서도 꼬리 공격을 배울 수 있다`, async () => {
    // Given
    await seedGrowing(5); await world();
    await db.query("update public.dragons set days=$1,element=$2 where id=$3", [days, element, dragon]);
    // When
    const result = await world('skill', { id: dragon, skill: 'tail-attack' });
    // Then
    expect(result.dragons[0].skills).toEqual(['tail-attack']);
    expect(result.credits).toBe(1);
  });
}

test.each(['fire', 'thunder'])('%s 꼬리 공격은 다른 아동·소유자와 직접 수정이 금지된다', async (element) => {
  // Given
  await seedGrowing(5); await world('element', { id: dragon, element });
  await db.exec(`insert into public.children(id,owner_user_id,name) values ('20000000-0000-0000-0000-000000000002','${owner}','다른 아이');
    insert into public.dragons(id,child_id,owner_user_id,egg,selected_date,days,element) values ('${nextDragon}','20000000-0000-0000-0000-000000000002','${owner}',0,${today},6,'thunder');`);
  // When / Then
  await expect(world('skill', { id: nextDragon, skill: 'tail-attack' })).rejects.toThrow('찾지 못했어요');
  await db.exec('set role authenticated');
  await expect(db.exec("update public.dragons set skills=array['tail-attack']")).rejects.toThrow('permission denied');
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
  await expect(world('skill', { id: dragon, skill: 'tail-attack' })).rejects.toThrow('권한');
});

test('기능 제약은 알 수 없는 기능·중복·null을 거절하고 마이그레이션 재적용은 기존 획득을 보존한다', async () => {
  // Given
  await seedGrowing(5); await world('element', { id: dragon, element: 'thunder' });
  await world('skill', { id: dragon, skill: 'fly' });
  const sql = await readFile(resolve('supabase/migrations/20261110120000_thunder_tail_attack.sql'), 'utf8');
  // When
  await db.exec(sql);
  await db.exec(await readFile(resolve('supabase/migrations/20261111120000_fire_tail_attack.sql'), 'utf8'));
  await db.exec(await readFile(resolve('supabase/migrations/20261114120000_fire_clone.sql'), 'utf8'));
  await db.exec(await readFile(resolve('supabase/migrations/20261114130000_thunder_clone.sql'), 'utf8'));
  // Then
  expect((await world()).dragons[0].skills).toEqual(['fly']);
  for (const skills of ["array['roar']", "array['fly','fly']", "array['tail-attack','tail-attack']", "array['clone','clone']", "array[null]::text[]"]) {
    await expect(db.exec(`update public.dragons set skills=${skills}`)).rejects.toThrow('dragons_skills_check');
  }
});

test.each(['fire', 'thunder'])('%s 아기의 분신은 기존 기능과 공존하고 재시도와 성장 후 재요청에 중복 차감하지 않는다', async element => {
  // Given
  await seedGrowing(5, 11); await world('element', { id: dragon, element });
  await world('skill', { id: dragon, skill: 'fly' });
  await world('skill', { id: dragon, skill: 'tail-attack' });
  // When
  const acquired = await world('skill', { id: dragon, skill: 'clone' });
  const retry = await world('skill', { id: dragon, skill: 'clone' });
  await db.exec(`update public.dragons set days=30`);
  const grownRetry = await world('skill', { id: dragon, skill: 'clone' });
  // Then
  expect(acquired.dragons[0].skills).toEqual(['fly', 'tail-attack', 'clone']);
  expect(acquired.credits).toBe(1);
  expect(retry.credits).toBe(1);
  expect(grownRetry.credits).toBe(1);
});

test.each([{ days: 0, element: 'fire' }, { days: 18, element: 'fire' }, { days: 6, element: null }, { days: 6, element: 'ice' }, { days: 0, element: 'thunder' }, { days: 18, element: 'thunder' }])('분신 신규 획득은 $days/$element 에서 거절한다', async ({ days, element }) => {
  // Given: seedGrowing's next sync has already been credited before setting the boundary.
  await seedGrowing(5, 8); await world();
  await db.query('update public.dragons set days=$1, element=$2', [days, element]);
  // When
  const request = world('skill', { id: dragon, skill: 'clone' });
  // Then
  await expect(request).rejects.toThrow('불·번개 아기');
  expect((await world()).dragons[0].skills).toEqual([]);
});

test.each(['fire', 'thunder'])('%s 분신 획득은 기회 부족·다른 아동·다른 소유자·직접 갱신을 거절한다', async element => {
  // Given
  await seedGrowing(5, 0); await world('element', { id: dragon, element });
  // When / Then
  await expect(world('skill', { id: dragon, skill: 'clone' })).rejects.toThrow('선택 기회');
  await db.exec(`update public.dragon_progress set total_days=9;
    insert into public.children(id,owner_user_id,name) values ('${nextDragon}','${owner}','둘째');
    insert into public.dragons(id,child_id,owner_user_id,egg,selected_date,days,element) values ('${nextDragon}','${nextDragon}','${owner}',0,${today},6,'fire');`);
  await expect(world('skill', { id: nextDragon, skill: 'clone' })).rejects.toThrow('찾지 못');
  await db.exec('set role authenticated');
  await expect(db.exec("update public.dragons set skills=array['clone']")).rejects.toThrow('permission denied');
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
  await expect(world('skill', { id: dragon, skill: 'clone' })).rejects.toThrow('권한');
});
