import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import AuthPanel from "../../app/auth-panel";

const boundary = vi.hoisted(() => ({
  refresh: vi.fn(),
  signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
  signInAnonymously: vi.fn().mockResolvedValue({ error: null }),
  createBrowserClient: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: boundary.refresh }) }));
vi.mock("@supabase/ssr", () => ({ createBrowserClient: boundary.createBrowserClient }));

function stubBrowserLocation(overrides: Partial<Pick<Location, "hostname" | "origin">>) {
  const browserWindow = window;
  const browserLocation = browserWindow.location;
  const location = new Proxy(browserLocation, {
    get(target, property) {
      if (property in overrides) {
        return overrides[property as keyof typeof overrides];
      }
      return Reflect.get(target, property, target);
    },
  });

  vi.stubGlobal("window", new Proxy(browserWindow, {
    get(target, property) {
      return property === "location" ? location : Reflect.get(target, property, target);
    },
  }));
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth-fixture.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-publishable-key");
  boundary.refresh.mockReset();
  boundary.signInWithOAuth.mockReset().mockResolvedValue({ error: null });
  boundary.signInAnonymously.mockReset().mockResolvedValue({ error: null });
  boundary.createBrowserClient.mockReset();
});

test("A04-N01: Google 클릭은 브라우저 factory를 통해 OAuth redirect를 요청한다", async () => {
  // Given
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth-fixture.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-publishable-key");
  boundary.createBrowserClient.mockReturnValue({
    auth: { signInWithOAuth: boundary.signInWithOAuth, signInAnonymously: boundary.signInAnonymously },
  });
  const user = userEvent.setup();
  render(<AuthPanel />);
  stubBrowserLocation({ origin: "https://reading.example" });

  // When
  await user.click(screen.getByRole("button", { name: "Google로 계속하기" }));

  // Then
  expect(boundary.createBrowserClient).toHaveBeenCalledExactlyOnceWith(
    "https://auth-fixture.invalid", "fixture-publishable-key",
  );
  expect(boundary.signInWithOAuth).toHaveBeenCalledExactlyOnceWith({
    provider: "google",
    options: { redirectTo: "https://reading.example/auth/callback?next=/", queryParams: { prompt: "select_account" } },
  });
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Google로 이동 중..." }).disabled).toBe(true);
  expect(boundary.refresh).not.toHaveBeenCalled();
});

test("A04-B01: OAuth 요청 중에는 Google과 로컬 로그인 버튼이 모두 비활성화된다", async () => {
  // Given
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_ENABLE_LOCAL_TEST_LOGIN", "true");
  let settleOAuth: (result: { error: { message: string } }) => void;
  const pendingOAuth = new Promise<{ error: { message: string } }>((resolve) => {
    settleOAuth = resolve;
  });
  boundary.signInWithOAuth.mockReturnValue(pendingOAuth);
  boundary.createBrowserClient.mockReturnValue({
    auth: { signInWithOAuth: boundary.signInWithOAuth, signInAnonymously: boundary.signInAnonymously },
  });
  const user = userEvent.setup();
  render(<AuthPanel />);

  // When
  await user.click(screen.getByRole("button", { name: "Google로 계속하기" }));

  // Then
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Google로 이동 중..." }).disabled).toBe(true);
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "로컬 테스트로 시작" }).disabled).toBe(true);
  await act(async () => {
    settleOAuth({ error: { message: "OAuth 요청 정리" } });
    await pendingOAuth;
  });
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Google로 계속하기" }).disabled).toBe(false);
});

test("A04-E01: OAuth 오류 뒤에는 오류를 보여 주고 다시 Google 로그인을 요청할 수 있다", async () => {
  // Given
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth-fixture.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-publishable-key");
  boundary.signInWithOAuth
    .mockResolvedValueOnce({ error: { message: "OAuth 요청에 실패했습니다." } })
    .mockResolvedValueOnce({ error: null });
  boundary.createBrowserClient.mockReturnValue({
    auth: { signInWithOAuth: boundary.signInWithOAuth, signInAnonymously: boundary.signInAnonymously },
  });
  const user = userEvent.setup();
  render(<AuthPanel />);

  // When
  await user.click(screen.getByRole("button", { name: "Google로 계속하기" }));

  // Then
  expect(screen.getByRole("status").textContent).toContain("OAuth 요청에 실패했습니다.");
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Google로 계속하기" }).disabled).toBe(false);
  await user.click(screen.getByRole("button", { name: "Google로 계속하기" }));
  expect(boundary.signInWithOAuth).toHaveBeenCalledTimes(2);
});

test("A04-E02: 개발 local-test flag가 꺼지면 로컬 로그인 버튼과 설명을 표시하지 않는다", () => {
  // Given
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_ENABLE_LOCAL_TEST_LOGIN", "false");
  boundary.createBrowserClient.mockReturnValue({
    auth: { signInWithOAuth: boundary.signInWithOAuth, signInAnonymously: boundary.signInAnonymously },
  });

  // When
  render(<AuthPanel />);

  // Then
  expect(screen.queryByRole("button", { name: "로컬 테스트로 시작" })).toBeNull();
  expect(screen.queryByText(/^로컬 테스트 계정은 이 브라우저에만 유지됩니다\. 로그아웃하거나 브라우저 데이터를 지우면 다시 접근할 수 없습니다\.$/)).toBeNull();
});

test("A04-E03: production에서는 local-test flag가 true여도 로컬 로그인 버튼을 표시하지 않는다", () => {
  // Given
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_ENABLE_LOCAL_TEST_LOGIN", "true");
  boundary.createBrowserClient.mockReturnValue({
    auth: { signInWithOAuth: boundary.signInWithOAuth, signInAnonymously: boundary.signInAnonymously },
  });

  // When
  render(<AuthPanel />);

  // Then
  expect(screen.queryByRole("button", { name: "로컬 테스트로 시작" })).toBeNull();
  expect(screen.queryByText(/^로컬 테스트 계정은 이 브라우저에만 유지됩니다\. 로그아웃하거나 브라우저 데이터를 지우면 다시 접근할 수 없습니다\.$/)).toBeNull();
});

test("A04-N02: localhost 개발 flag에서 로컬 테스트 로그인 성공은 Anonymous SDK 호출 후 refresh한다", async () => {
  // Given
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_ENABLE_LOCAL_TEST_LOGIN", "true");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth-fixture.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-publishable-key");
  boundary.createBrowserClient.mockReturnValue({
    auth: { signInWithOAuth: boundary.signInWithOAuth, signInAnonymously: boundary.signInAnonymously },
  });
  const user = userEvent.setup();
  render(<AuthPanel />);

  // When
  await user.click(screen.getByRole("button", { name: "로컬 테스트로 시작" }));

  // Then
  expect(boundary.signInAnonymously).toHaveBeenCalledExactlyOnceWith();
  expect(boundary.refresh).toHaveBeenCalledExactlyOnceWith();
  expect(screen.getByText(/^로컬 테스트 계정은 이 브라우저에만 유지됩니다\. 로그아웃하거나 브라우저 데이터를 지우면 다시 접근할 수 없습니다\.$/)).not.toBeNull();
});

test("A04-E04: localhost가 아닌 hostname에서는 로컬 버튼이 Anonymous 로그인을 요청하지 않는다", async () => {
  // Given
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_ENABLE_LOCAL_TEST_LOGIN", "true");
  boundary.createBrowserClient.mockReturnValue({
    auth: { signInWithOAuth: boundary.signInWithOAuth, signInAnonymously: boundary.signInAnonymously },
  });
  const user = userEvent.setup();
  render(<AuthPanel />);
  stubBrowserLocation({ hostname: "reading.example" });

  // When
  await user.click(screen.getByRole("button", { name: "로컬 테스트로 시작" }));

  // Then
  expect(boundary.signInAnonymously).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toContain(
    "로컬 테스트 로그인은 localhost 개발 서버에서만 사용할 수 있습니다.",
  );
});

test("A04-E05: Anonymous sign-in이 비활성이면 한국어 활성화 안내를 표시하고 재시도 가능 상태가 된다", async () => {
  // Given
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_ENABLE_LOCAL_TEST_LOGIN", "true");
  boundary.signInAnonymously.mockResolvedValue({ error: { message: "Anonymous sign-ins are disabled" } });
  boundary.createBrowserClient.mockReturnValue({
    auth: { signInWithOAuth: boundary.signInWithOAuth, signInAnonymously: boundary.signInAnonymously },
  });
  const user = userEvent.setup();
  render(<AuthPanel />);

  // When
  await user.click(screen.getByRole("button", { name: "로컬 테스트로 시작" }));

  // Then
  expect(screen.getByRole("status").textContent).toContain(
    "Supabase Dashboard에서 Anonymous Sign-Ins를 활성화해 주세요.",
  );
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "로컬 테스트로 시작" }).disabled).toBe(false);
  expect(boundary.refresh).not.toHaveBeenCalled();
});

test("A04-E06: 일반 Anonymous 오류는 원문을 표시하고 refresh하지 않는다", async () => {
  // Given
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_ENABLE_LOCAL_TEST_LOGIN", "true");
  boundary.signInAnonymously.mockResolvedValue({ error: { message: "anonymous service unavailable" } });
  boundary.createBrowserClient.mockReturnValue({
    auth: { signInWithOAuth: boundary.signInWithOAuth, signInAnonymously: boundary.signInAnonymously },
  });
  const user = userEvent.setup();
  render(<AuthPanel />);

  // When
  await user.click(screen.getByRole("button", { name: "로컬 테스트로 시작" }));

  // Then
  expect(screen.getByRole("status").textContent).toContain("anonymous service unavailable");
  expect(boundary.refresh).not.toHaveBeenCalled();
});
