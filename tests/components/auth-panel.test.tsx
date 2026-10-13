import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import AuthPanel from "../../app/auth-panel";

const boundary = vi.hoisted(() => ({
  refresh: vi.fn(),
  signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
  createBrowserClient: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: boundary.refresh }) }));
vi.mock("@supabase/ssr", () => ({ createBrowserClient: boundary.createBrowserClient }));

test("A04-N01: Google 클릭은 브라우저 factory를 통해 OAuth redirect를 요청한다", async () => {
  // Given
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth-fixture.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-publishable-key");
  boundary.createBrowserClient.mockReturnValue({ auth: { signInWithOAuth: boundary.signInWithOAuth } });
  const user = userEvent.setup();
  render(<AuthPanel />);

  // When
  await user.click(screen.getByRole("button", { name: "Google로 계속하기" }));

  // Then
  expect(boundary.createBrowserClient).toHaveBeenCalledExactlyOnceWith(
    "https://auth-fixture.invalid", "fixture-publishable-key",
  );
  expect(boundary.signInWithOAuth).toHaveBeenCalledExactlyOnceWith({
    provider: "google",
    options: { redirectTo: "http://localhost:3000/auth/callback?next=/", queryParams: { prompt: "select_account" } },
  });
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Google로 이동 중..." }).disabled).toBe(true);
  expect(boundary.refresh).not.toHaveBeenCalled();
});
