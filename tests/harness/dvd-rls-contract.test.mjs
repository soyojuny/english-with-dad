import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

async function migrations() {
  const directory = new URL('../../supabase/migrations/', import.meta.url);
  const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  return (await Promise.all(files.map((name) => readFile(new URL(name, directory), 'utf8'))))
    .join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');
}

test('정적 계약: DVD 전용 테이블은 필수 소유자를 가진다', async () => {
  // Given
  const sql = await migrations();

  // When
  const table = sql.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.dvds\s*\(([\s\S]*?)\n\);/i);

  // Then
  assert.ok(table, 'public.dvds 테이블 생성이 필요하다');
  assert.match(table[1], /owner_user_id\s+uuid\s+not\s+null\s+references\s+auth\.users\s*\(\s*id\s*\)/i);
});

test('정적 계약: DVD 테이블에서 RLS를 활성화한다', async () => {
  // Given
  const sql = await migrations();

  // When
  const enabled = /alter\s+table\s+public\.dvds\s+enable\s+row\s+level\s+security\s*;/i.test(sql);

  // Then
  assert.equal(enabled, true, 'public.dvds의 RLS 활성화가 필요하다');
});

test('정적 계약: DVD 정책은 기존 소유자 행과 새 owner 모두 인증 사용자로 제한한다', async () => {
  // Given
  const sql = await migrations();

  // When
  const policies = [...sql.matchAll(/create\s+policy\s+(?:"[^"]+"|\w+)\s+on\s+public\.dvds\b([^;]*);/gi)];

  // Then
  assert.equal(policies.length, 1, 'DVD에는 검토된 단일 소유자 정책이 필요하다');
  assert.match(policies[0][1], /\bfor\s+all\b/i);
  assert.match(policies[0][1], /\busing\s*\(\s*auth\.uid\s*\(\s*\)\s*=\s*owner_user_id\s*\)/i);
  assert.match(policies[0][1], /\bwith\s+check\s*\(\s*auth\.uid\s*\(\s*\)\s*=\s*owner_user_id\s*\)/i);
});
