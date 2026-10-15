import type { CookieMethodsServer } from "@supabase/ssr";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const boundary = vi.hoisted(() => ({
  browserFactory: vi.fn<(url: string, key: string) => unknown>(),
  serverFactory: vi.fn<(url: string, key: string, options: { cookies: CookieMethodsServer }) => unknown>(),
  cookies: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: boundary.browserFactory,
  createServerClient: boundary.serverFactory,
}));
vi.mock("next/headers", () => ({ cookies: boundary.cookies }));

const fixtureUrl = "https://supabase-fixture.invalid";
const fixtureKey = "fixture-publishable-key";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", fixtureUrl);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", fixtureKey);
});

afterEach(() => {
  vi.resetModules();
});

test("A01-N05: browser createClient는 설정을 한 번 전달하고 factory 반환값을 그대로 반환한다", async () => {
  // Given
  const client = { kind: "browser-client" };
  boundary.browserFactory.mockReturnValueOnce(client);
  const { createClient } = await import("../../lib/supabase/client");

  // When
  const actual = createClient();

  // Then
  expect(boundary.browserFactory).toHaveBeenCalledExactlyOnceWith(fixtureUrl, fixtureKey);
  expect(actual).toBe(client);
});

test("A01-F01: browser factory가 던진 오류를 숨기지 않는다", async () => {
  // Given
  const failure = new Error("browser factory failed");
  boundary.browserFactory.mockImplementationOnce(() => {
    throw failure;
  });
  const { createClient } = await import("../../lib/supabase/client");

  // When
  const action = () => createClient();

  // Then
  expect(action).toThrow(failure);
});

test("A01-N06: server createClient는 await cookies와 설정 및 cookie adapter를 factory에 전달한다", async () => {
  // Given
  const storedCookies = [{ name: "existing", value: "session" }];
  const cookieStore = { getAll: vi.fn(() => storedCookies), set: vi.fn() };
  const client = { kind: "server-client" };
  boundary.cookies.mockResolvedValueOnce(cookieStore);
  boundary.serverFactory.mockReturnValueOnce(client);
  const { createClient } = await import("../../lib/supabase/server");

  // When
  const actual = await createClient();

  // Then
  expect(boundary.cookies).toHaveBeenCalledExactlyOnceWith();
  expect(boundary.serverFactory).toHaveBeenCalledTimes(1);
  const [url, key, options] = boundary.serverFactory.mock.calls[0];
  expect([url, key]).toEqual([fixtureUrl, fixtureKey]);
  expect(await options.cookies.getAll()).toBe(storedCookies);
  expect(actual).toBe(client);
});

test("A01-N07: server cookie adapter setAll은 각 cookie를 name, value, options로 전달한다", async () => {
  // Given
  const cookieStore = { getAll: vi.fn(() => []), set: vi.fn() };
  boundary.cookies.mockResolvedValueOnce(cookieStore);
  boundary.serverFactory.mockReturnValueOnce({ kind: "server-client" });
  const { createClient } = await import("../../lib/supabase/server");
  const client = await createClient();
  const cookiesToSet = [
    { name: "access", value: "access-value", options: { httpOnly: true } },
    { name: "refresh", value: "refresh-value", options: { sameSite: "lax" as const } },
  ];
  const [, , options] = boundary.serverFactory.mock.calls[0];

  // When
  options.cookies.setAll?.(cookiesToSet, {});

  // Then
  expect(client).toEqual({ kind: "server-client" });
  expect(cookieStore.set).toHaveBeenNthCalledWith(1, "access", "access-value", { httpOnly: true });
  expect(cookieStore.set).toHaveBeenNthCalledWith(2, "refresh", "refresh-value", { sameSite: "lax" });
});

test("A01-E11: Server Component처럼 cookieStore.set이 던져도 setAll은 예외를 삼킨다", async () => {
  // Given
  const cookieStore = {
    getAll: vi.fn(() => []),
    set: vi.fn(() => {
      throw new Error("cookie writes are unavailable");
    }),
  };
  boundary.cookies.mockResolvedValueOnce(cookieStore);
  boundary.serverFactory.mockReturnValueOnce({ kind: "server-client" });
  const { createClient } = await import("../../lib/supabase/server");
  await createClient();
  const [, , options] = boundary.serverFactory.mock.calls[0];

  // When
  const action = () =>
    options.cookies.setAll?.([{ name: "access", value: "access-value", options: {} }], {});

  // Then
  expect(action).not.toThrow();
  expect(cookieStore.set).toHaveBeenCalledExactlyOnceWith("access", "access-value", {});
});

test("A01-F02: cookies()의 거부를 숨기지 않는다", async () => {
  // Given
  const failure = new Error("cookies failed");
  boundary.cookies.mockRejectedValueOnce(failure);
  const { createClient } = await import("../../lib/supabase/server");

  // When
  const result = createClient();

  // Then
  await expect(result).rejects.toBe(failure);
  expect(boundary.serverFactory).not.toHaveBeenCalled();
});

test("A01-F03: server factory의 동기 오류를 숨기지 않는다", async () => {
  // Given
  const cookieStore = { getAll: vi.fn(() => []), set: vi.fn() };
  const failure = new Error("server factory failed");
  boundary.cookies.mockResolvedValueOnce(cookieStore);
  boundary.serverFactory.mockImplementationOnce(() => {
    throw failure;
  });
  const { createClient } = await import("../../lib/supabase/server");

  // When
  const result = createClient();

  // Then
  await expect(result).rejects.toBe(failure);
});
