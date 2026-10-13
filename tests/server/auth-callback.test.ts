import type { CookieMethodsServer } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";
import { GET } from "../../app/auth/callback/route";

const boundary = vi.hoisted(() => ({
  getAll: vi.fn(() => [{ name: "session", value: "existing" }]),
  set: vi.fn(),
  exchange: vi.fn(),
  factory: vi.fn<(url: string, key: string, options: { cookies: CookieMethodsServer }) => unknown>(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: boundary.getAll, set: boundary.set }) }));
vi.mock("@supabase/ssr", () => ({ createServerClient: boundary.factory }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth-fixture.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-publishable-key");
  boundary.exchange.mockResolvedValue({ error: null });
  boundary.factory.mockReturnValue({ auth: { exchangeCodeForSession: boundary.exchange } });
});

test("A02-N01: code 교환 성공은 Node에서 307 redirect와 private no-store를 반환한다", async () => {
  // Given
  const request = new NextRequest("https://reading.invalid/auth/callback?code=fixture-code&next=/today");

  // When
  const response = await GET(request);

  // Then
  expect(typeof document).toBe("undefined");
  expect(boundary.exchange).toHaveBeenCalledExactlyOnceWith("fixture-code");
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("https://reading.invalid/today");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(boundary.factory).toHaveBeenCalledTimes(1);
  const [url, key, options] = boundary.factory.mock.calls[0];
  expect([url, key]).toEqual(["https://auth-fixture.invalid", "fixture-publishable-key"]);
  expect(await options.cookies.getAll()).toEqual([{ name: "session", value: "existing" }]);
  await options.cookies.setAll?.([{ name: "session", value: "renewed", options: { httpOnly: true } }], {});
  expect(boundary.set).toHaveBeenCalledExactlyOnceWith("session", "renewed", { httpOnly: true });
});

test("A02-E01: code가 없으면 SDK 호출 없이 auth error로 redirect한다", async () => {
  // Given
  const request = new NextRequest("https://reading.invalid/auth/callback");

  // When
  const response = await GET(request);

  // Then
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("https://reading.invalid/auth/error");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(boundary.factory).not.toHaveBeenCalled();
  expect(boundary.exchange).not.toHaveBeenCalled();
});
