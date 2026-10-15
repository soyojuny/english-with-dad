import { afterEach, beforeEach, expect, test, vi } from "vitest";

async function loadConfig() {
  return import("../../lib/supabase/config");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.resetModules();
});

test("A01-N01: URL과 publishable key가 있으면 설정값을 그대로 반환한다", async () => {
  // Given
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase-fixture.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-publishable-key");
  const { getSupabaseEnv } = await loadConfig();

  // When
  const actual = getSupabaseEnv();

  // Then
  expect(actual).toEqual({
    url: "https://supabase-fixture.invalid",
    publishableKey: "fixture-publishable-key",
  });
});

test("A01-E01: URL만 있으면 명시적인 설정 오류를 던진다", async () => {
  // Given
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase-fixture.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  const { getSupabaseEnv } = await loadConfig();

  // When
  const action = () => getSupabaseEnv();

  // Then
  expect(action).toThrow(
    "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
});

test("A01-E02: publishable key만 있으면 명시적인 설정 오류를 던진다", async () => {
  // Given
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-publishable-key");
  const { getSupabaseEnv } = await loadConfig();

  // When
  const action = () => getSupabaseEnv();

  // Then
  expect(action).toThrow(
    "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
});

test("A01-E03: 두 설정이 없으면 명시적인 설정 오류를 던진다", async () => {
  // Given
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  const { getSupabaseEnv } = await loadConfig();

  // When
  const action = () => getSupabaseEnv();

  // Then
  expect(action).toThrow(
    "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
});

test.each([
  ["A01-N02", "두 값이 있으면 true", "https://supabase-fixture.invalid", "fixture-publishable-key", true],
  ["A01-E04", "URL이 빈 문자열이면 false", "", "fixture-publishable-key", false],
  ["A01-E05", "key가 빈 문자열이면 false", "https://supabase-fixture.invalid", "", false],
  ["A01-E06", "두 값이 없으면 false", "", "", false],
] as const)("%s: isSupabaseConfigured는 %s", async (_id, _description, url, key, expected) => {
  // Given
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);
  const { isSupabaseConfigured } = await loadConfig();

  // When
  const actual = isSupabaseConfigured();

  // Then
  expect(actual).toBe(expected);
});

test.each([
  ["A01-N03", "development와 flag undefined이면 true", "development", undefined, true],
  ["A01-N04", "development와 flag true이면 true", "development", "true", true],
  ["A01-E07", "development와 flag false이면 false", "development", "false", false],
  ["A01-E08", "development와 false 이외 문자열이면 true", "development", "0", true],
  ["A01-E09", "production과 flag undefined이면 false", "production", undefined, false],
  ["A01-E10", "production과 flag true이면 false", "production", "true", false],
] as const)("%s: isLocalTestLoginEnabled는 %s", async (_id, _description, nodeEnv, flag, expected) => {
  // Given
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubEnv("NEXT_PUBLIC_ENABLE_LOCAL_TEST_LOGIN", flag);
  const { isLocalTestLoginEnabled } = await loadConfig();

  // When
  const actual = isLocalTestLoginEnabled();

  // Then
  expect(actual).toBe(expected);
});
