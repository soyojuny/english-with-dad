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

test("소품 중복 획득은 한 번만 차감하고 자유 좌표와 아이 공용 소품을 저장한다", async () => {
  // Given
  await seedGrowing(29);
  await world("claim", { itemId: "gem" });
  const owned = await world("claim", { itemId: "gem" });
  const decor = defaultDragonDecor(); decor.left = { itemId: 'gem', x: 15, y: 85 };
  // When
  const saved = await world("decorate", { id: dragon, version: 0, decor });
  const retried = await world("decorate", { id: dragon, version: 0, decor });
  const next = await world("egg", { id: nextDragon, egg: 0 });
  const both = await world("decorate", { id: nextDragon, version: 0, decor });
  // Then
  expect(owned.credits).toBe(9);
  expect(saved.dragons[0].decor.left).toEqual({ itemId: 'gem', x: 15, y: 85 });
  expect(retried.dragons[0].version).toBe(1);
  expect(next.dragons[1].decor.left.itemId).toBe('flowers');
  expect(both.dragons.every((entry) => entry.decor.left.itemId === 'gem')).toBe(true);
});

test("미보유·잘못된 자리·범위 밖 좌표와 다른 화면의 배치 덮어쓰기를 거절한다", async () => {
  // Given
  await seedGrowing(0);
  const decor = defaultDragonDecor();
  // When / Then: external JSON inputs must be rejected by the server.
  await expect(world("decorate", { id: dragon, version: 0, decor: { ...decor, left: { itemId: 'gem', x: 50, y: 50 } } })).rejects.toThrow('먼저 소품');
  await expect(world("decorate", { id: dragon, version: 0, decor: { ...decor, left: { itemId: 'moss', x: 50, y: 50 } } })).rejects.toThrow('없는 소품');
  await expect(world("decorate", { id: dragon, version: 0, decor: { ...decor, left: { itemId: 'flowers', x: 101, y: 50 } } })).rejects.toThrow('장면 안');
  await expect(world("decorate", { id: dragon, version: 0, decor: {} })).rejects.toThrow('배치 자리');
  await world("decorate", { id: dragon, version: 0, decor: { ...decor, left: { itemId: 'flowers', x: 50, y: 50 } } });
  await expect(world("decorate", { id: dragon, version: 0, decor })).rejects.toThrow('다른 화면');
  await expect(world('claim', { itemId: 'gem' })).rejects.toThrow('기회');
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

test("모든 소품 획득 후 기회가 남으며 새 카탈로그 소품에 사용할 수 있다", async () => {
  // Given
  await seedGrowing(29);
  let snapshot = await world();
  for (const item of snapshot.catalog.filter((item) => !item.free)) snapshot = await world('claim', { itemId: item.id });
  expect(snapshot.credits).toBe(2);
  // When
  await db.exec("insert into public.dragon_items values ('new-star','새 별','prop','star',false,20)");
  const updated = await world('claim', { itemId: 'new-star' });
  // Then
  expect(updated.credits).toBe(1);
  expect(updated.owned).toContain('new-star');
  expect(updated.catalog.find((item) => item.id === 'new-star')?.name).toBe('새 별');
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
