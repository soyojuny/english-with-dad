import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import SignedInShell from "../../app/signed-in-shell";

const boundary = vi.hoisted(() => ({
  isPending: false,
  refresh: vi.fn(),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  createBrowserClient: vi.fn(),
  startTransition: vi.fn((action: () => void) => action()),
  readingManager: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: boundary.refresh }) }));
vi.mock("@supabase/ssr", () => ({ createBrowserClient: boundary.createBrowserClient }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useTransition: () => [boundary.isPending, boundary.startTransition] as const,
}));
vi.mock("../../app/reading-manager-client", () => ({
  default: (props: { ownerUserId: string; onSignOut: () => void; isSigningOut: boolean }) => {
    boundary.readingManager(props);
    return (
      <button type="button" onClick={props.onSignOut} disabled={props.isSigningOut}>
        {props.isSigningOut ? "로그아웃 중..." : `로그아웃: ${props.ownerUserId}`}
      </button>
    );
  },
}));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth-fixture.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-publishable-key");
  boundary.isPending = false;
  boundary.refresh.mockReset();
  boundary.signOut.mockReset().mockResolvedValue({ error: null });
  boundary.createBrowserClient.mockReset();
  boundary.startTransition.mockReset().mockImplementation((action: () => void) => action());
  boundary.readingManager.mockReset();
});

test("A04-N03: 로그아웃 성공은 ReadingManagerClient의 요청 뒤 router.refresh를 호출한다", async () => {
  // Given
  boundary.createBrowserClient.mockReturnValue({ auth: { signOut: boundary.signOut } });
  const user = userEvent.setup();
  render(<SignedInShell userId="parent-1" />);

  // When
  await user.click(screen.getByRole("button", { name: "로그아웃: parent-1" }));

  // Then
  expect(boundary.signOut).toHaveBeenCalledExactlyOnceWith();
  expect(boundary.startTransition).toHaveBeenCalledExactlyOnceWith(expect.any(Function));
  expect(boundary.refresh).toHaveBeenCalledExactlyOnceWith();
});

test("A04-E07: 로그아웃 오류는 표시하고 router.refresh를 호출하지 않는다", async () => {
  // Given
  boundary.signOut.mockResolvedValue({ error: { message: "로그아웃 서비스 오류" } });
  boundary.createBrowserClient.mockReturnValue({ auth: { signOut: boundary.signOut } });
  const user = userEvent.setup();
  render(<SignedInShell userId="parent-1" />);

  // When
  await user.click(screen.getByRole("button", { name: "로그아웃: parent-1" }));

  // Then
  expect(screen.getByText("로그아웃 서비스 오류")).not.toBeNull();
  expect(boundary.refresh).not.toHaveBeenCalled();
});

test("A04-E08: transition pending 경계는 ReadingManagerClient에 로그아웃 중 상태로 전달한다", () => {
  // Given
  boundary.isPending = true;
  boundary.createBrowserClient.mockReturnValue({ auth: { signOut: boundary.signOut } });

  // When
  render(<SignedInShell userId="parent-1" />);

  // Then
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "로그아웃 중..." }).disabled).toBe(true);
  expect(boundary.readingManager).toHaveBeenLastCalledWith(expect.objectContaining({
    ownerUserId: "parent-1",
    isSigningOut: true,
  }));
});
