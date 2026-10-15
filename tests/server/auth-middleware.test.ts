import type { CookieMethodsServer } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const boundary = vi.hoisted(() => ({
  factory: vi.fn<(url: string, key: string, options: { cookies: CookieMethodsServer }) => unknown>(),
  getUser: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: boundary.factory }));

const fixtureUrl = "https://auth-fixture.invalid";
const fixtureKey = "fixture-publishable-key";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", fixtureUrl);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", fixtureKey);
  boundary.getUser.mockResolvedValue({ data: { user: null }, error: null });
  boundary.factory.mockReturnValue({ auth: { getUser: boundary.getUser } });
});

afterEach(() => {
  vi.resetModules();
});

test("A03-N01: 설정된 middleware는 cookie 갱신과 추가 header를 response에 보존하고 getUser를 호출한다", async () => {
  // Given
  const request = new NextRequest("https://reading.invalid/today", {
    headers: { cookie: "existing=before" },
  });
  let suppliedCookies: unknown;
  boundary.getUser.mockImplementationOnce(async () => {
    const [, , options] = boundary.factory.mock.calls[0];
    suppliedCookies = options.cookies.getAll();
    options.cookies.setAll?.(
      [{ name: "renewed", value: "after", options: { httpOnly: true, path: "/" } }],
      { "x-supabase-refresh": "fixture" },
    );
    return { data: { user: null }, error: null };
  });
  const { updateSession } = await import("../../lib/supabase/middleware");

  // When
  const response = await updateSession(request);

  // Then
  expect(boundary.factory).toHaveBeenCalledTimes(1);
  const [url, key, options] = boundary.factory.mock.calls[0];
  expect([url, key]).toEqual([fixtureUrl, fixtureKey]);
  expect(suppliedCookies).toEqual([{ name: "existing", value: "before" }]);
  expect(request.cookies.get("renewed")?.value).toBe("after");
  expect(boundary.getUser).toHaveBeenCalledExactlyOnceWith();
  expect(response.cookies.get("renewed")?.value).toBe("after");
  expect(response.headers.get("x-supabase-refresh")).toBe("fixture");
});

test("A03-E01: Supabase 설정이 없으면 SDK를 만들지 않고 next response를 반환한다", async () => {
  // Given
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  const request = new NextRequest("https://reading.invalid/");
  const { updateSession } = await import("../../lib/supabase/middleware");

  // When
  const response = await updateSession(request);

  // Then
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(boundary.factory).not.toHaveBeenCalled();
  expect(boundary.getUser).not.toHaveBeenCalled();
});

test("A03-E02: getUser 오류는 숨기지 않는다", async () => {
  // Given
  const failure = new Error("getUser failed");
  boundary.getUser.mockRejectedValueOnce(failure);
  const request = new NextRequest("https://reading.invalid/");
  const { updateSession } = await import("../../lib/supabase/middleware");

  // When
  const result = updateSession(request);

  // Then
  await expect(result).rejects.toBe(failure);
  expect(boundary.getUser).toHaveBeenCalledExactlyOnceWith();
});

test("A03-E03: cookie 갱신 중 request cookie 기록이 실패하면 adapter 실행 뒤 오류를 전파한다", async () => {
  // Given
  const failure = new Error("request cookie write failed");
  const request = new NextRequest("https://reading.invalid/");
  const setRequestCookie = vi.spyOn(request.cookies, "set").mockImplementation(() => {
    throw failure;
  });
  boundary.getUser.mockImplementationOnce(async () => {
    const [, , options] = boundary.factory.mock.calls[0];
    options.cookies.setAll?.([{ name: "renewed", value: "after", options: { httpOnly: true } }], {});
    return { data: { user: null }, error: null };
  });
  const { updateSession } = await import("../../lib/supabase/middleware");

  // When
  const result = updateSession(request);

  // Then
  await expect(result).rejects.toBe(failure);
  expect(boundary.getUser).toHaveBeenCalledExactlyOnceWith();
  expect(setRequestCookie).toHaveBeenCalledExactlyOnceWith("renewed", "after");
});

test("A03-N02: root middleware는 updateSession 결과를 그대로 위임한다", async () => {
  // Given
  const delegated = NextResponse.redirect("https://reading.invalid/delegated");
  const updateSession = vi.fn().mockResolvedValue(delegated);
  vi.doMock("../../lib/supabase/middleware", () => ({ updateSession }));
  const { middleware } = await import("../../middleware");
  const request = new NextRequest("https://reading.invalid/today");

  // When
  const response = await middleware(request);

  // Then
  expect(updateSession).toHaveBeenCalledExactlyOnceWith(request);
  expect(response).toBe(delegated);
});

test("A03-N03: root matcher는 정적 자산을 제외하고 앱 경로만 포함한다", async () => {
  // Given
  vi.doMock("../../lib/supabase/middleware", () => ({ updateSession: vi.fn() }));
  const { config } = await import("../../middleware");
  const matcher = new RegExp(`^${config.matcher[0]}$`);

  // When
  const appPathMatches = matcher.test("/today");
  const staticPathsMatch = ["/_next/static/chunk.js", "/_next/image", "/favicon.ico", "/sw.js", "/manifest.webmanifest", "/assets/app.png", "/cover.jpg"]
    .map((path) => matcher.test(path));

  // Then
  expect(appPathMatches).toBe(true);
  expect(staticPathsMatch).toEqual([false, false, false, false, false, false, false]);
});
