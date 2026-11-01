import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import ReadingManagerClient from "../../app/reading-manager-client";
import type { Dvd } from "../../lib/reading-types";

const boundary = vi.hoisted(() => ({
  fetchProfile: vi.fn(), fetchParent: vi.fn(), fetchCatalog: vi.fn(), addDvd: vi.fn(), setDvdActive: vi.fn(),
}));

vi.mock("../../lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("../../lib/supabase/reading-store", async (original) => ({
  ...(await original<typeof import("../../lib/supabase/reading-store")>()),
  fetchReadingProfileData: boundary.fetchProfile,
  fetchParentActivityData: boundary.fetchParent,
  fetchDvdCatalogData: boundary.fetchCatalog,
  addDvd: boundary.addDvd,
  setDvdActive: boundary.setDvdActive,
}));

const children = [{ id: "child-1", name: "민준", level: "1", goal: "" }];
const parentData = { children, books: [], assignments: [], completions: {}, audioLaunches: {}, manualLogs: [] };

beforeEach(() => {
  boundary.fetchProfile.mockReset().mockResolvedValue({ children });
  boundary.fetchParent.mockReset().mockResolvedValue(parentData);
  boundary.fetchCatalog.mockReset().mockResolvedValue({ dvds: [] });
  boundary.addDvd.mockReset().mockResolvedValue({ id: "dvd-new", title: "새 DVD", active: true });
  boundary.setDvdActive.mockReset().mockImplementation(async (_client, _owner, id, active) => ({ id, title: "첫 DVD", active }));
});

async function enterParent() {
  const user = userEvent.setup();
  const view = render(<ReadingManagerClient ownerUserId="owner-1" onSignOut={() => {}} isSigningOut={false} />);
  await screen.findByRole("heading", { name: "사용할 프로필을 고르세요" });
  const grid = view.container.querySelector(".profile-grid");
  expect(grid).not.toBeNull();
  await user.click(within(grid as HTMLElement).getByRole("button", { name: /부모 관리/ }));
  await waitFor(() => expect(view.container.querySelector("#parentTitle")?.textContent).toBe("활동 기록"));
  return user;
}

async function enterDvdManagement() {
  const user = await enterParent();
  const entry = screen.queryByRole("button", { name: "DVD 관리" });
  expect(entry, "부모 화면에 DVD 관리 진입 버튼이 필요하다").not.toBeNull();
  await user.click(entry as HTMLElement);
}

test("정상: 부모 화면에서 DVD 관리로 진입한다", async () => {
  // Given
  const user = await enterParent();

  // When
  const entry = screen.queryByRole("button", { name: "DVD 관리" });
  expect(entry, "부모 화면에 DVD 관리 진입 버튼이 필요하다").not.toBeNull();
  await user.click(entry as HTMLElement);

  // Then
  expect(await screen.findByRole("region", { name: "DVD 목록" })).toBeTruthy();
});

test("경계: 목록 조회가 진행 중이면 로딩 상태를 표시한다", async () => {
  // Given
  boundary.fetchCatalog.mockReturnValue(new Promise(() => {}));

  // When
  await enterDvdManagement();

  // Then
  const list = screen.getByRole("region", { name: "DVD 목록" });
  expect(within(list).getByRole("status").textContent).toMatch(/불러오는 중/);
  expect(within(list).queryByText(/DVD 목록이 비어/)).toBeNull();
});

test("실패: 목록 조회 오류는 빈 목록과 구분해 표시한다", async () => {
  // Given
  boundary.fetchCatalog.mockRejectedValue(new Error("목록 조회 실패"));

  // When
  await enterDvdManagement();

  // Then
  const list = await screen.findByRole("region", { name: "DVD 목록" });
  expect((await within(list).findByRole("alert")).textContent).toMatch(/실패/);
  expect(within(list).queryByText(/DVD 목록이 비어/)).toBeNull();
});

test("경계: 조회가 완료된 빈 목록은 빈 상태를 표시한다", async () => {
  // Given
  let resolve!: (value: { dvds: Dvd[] }) => void;
  boundary.fetchCatalog.mockReturnValue(new Promise((done) => { resolve = done; }));

  // When
  await enterDvdManagement();
  await act(async () => resolve({ dvds: [] }));

  // Then
  const list = screen.getByRole("region", { name: "DVD 목록" });
  expect(await within(list).findByText(/DVD 목록이 비어/)).toBeTruthy();
  expect(within(list).queryByRole("alert")).toBeNull();
});

test("정상: 목록은 활성과 비활성 DVD의 제목과 상태를 표시한다", async () => {
  // Given
  boundary.fetchCatalog.mockResolvedValue({ dvds: [
    { id: "dvd-1", title: "첫 DVD", active: true },
    { id: "dvd-2", title: "둘째 DVD", active: false },
  ] });

  // When
  await enterDvdManagement();

  // Then
  const list = await screen.findByRole("region", { name: "DVD 목록" });
  const first = await within(list).findByRole("group", { name: "첫 DVD" });
  const second = within(list).getByRole("group", { name: "둘째 DVD" });
  expect(within(first).getByText("보는 중")).toBeTruthy();
  expect(within(second).getByText("안 보는 중")).toBeTruthy();
});

test("정상: 제목을 추가하면 새 DVD가 보는 중으로 표시된다", async () => {
  // Given
  const user = userEvent.setup();
  await enterDvdManagement();
  await screen.findByText(/DVD 목록이 비어/);

  // When
  await user.type(screen.getByRole("textbox", { name: "DVD 제목" }), "새 DVD");
  await user.click(screen.getByRole("button", { name: "DVD 추가" }));

  // Then
  const item = await screen.findByRole("group", { name: "새 DVD" });
  expect(within(item).getByText("보는 중")).toBeTruthy();
  expect(boundary.addDvd).toHaveBeenCalledExactlyOnceWith(expect.anything(), "owner-1", "새 DVD");
});

test("잘못된 입력: 공백 제목은 오류를 표시하고 저장하지 않는다", async () => {
  // Given
  const user = userEvent.setup();
  await enterDvdManagement();
  await screen.findByText(/DVD 목록이 비어/);
  await user.type(screen.getByRole("textbox", { name: "DVD 제목" }), "   ");

  // When
  await user.click(screen.getByRole("button", { name: "DVD 추가" }));

  // Then
  expect(screen.getByRole("alert").textContent).toMatch(/제목/);
  expect(boundary.addDvd).not.toHaveBeenCalled();
});

test("경계: 저장 중에는 추가 버튼을 다시 눌러도 중복 저장하지 않는다", async () => {
  // Given
  const user = userEvent.setup();
  let resolve!: (dvd: Dvd) => void;
  boundary.addDvd.mockReturnValue(new Promise((done) => { resolve = done; }));
  await enterDvdManagement();
  await screen.findByText(/DVD 목록이 비어/);
  await user.type(screen.getByRole("textbox", { name: "DVD 제목" }), "새 DVD");
  const submit = screen.getByRole<HTMLButtonElement>("button", { name: "DVD 추가" });

  // When
  await user.click(submit);
  await user.click(submit);

  // Then
  expect(submit.disabled).toBe(true);
  expect(boundary.addDvd).toHaveBeenCalledOnce();
  await act(async () => resolve({ id: "dvd-new", title: "새 DVD", active: true }));
});

test("실패: 저장 오류는 입력을 보존하고 오류를 표시한다", async () => {
  // Given
  const user = userEvent.setup();
  boundary.addDvd.mockRejectedValue(new Error("저장 실패"));
  await enterDvdManagement();
  await screen.findByText(/DVD 목록이 비어/);
  const title = screen.getByRole<HTMLInputElement>("textbox", { name: "DVD 제목" });
  await user.type(title, "새 DVD");

  // When
  await user.click(screen.getByRole("button", { name: "DVD 추가" }));

  // Then
  expect((await screen.findByRole("alert")).textContent).toMatch(/실패/);
  expect(title.value).toBe("새 DVD");
  expect(screen.queryByRole("group", { name: "새 DVD" })).toBeNull();
});

test("정상: 보는 중 DVD를 안 보는 중으로 바꾼 뒤 다시 보는 중으로 전환한다", async () => {
  // Given
  const user = userEvent.setup();
  boundary.fetchCatalog.mockResolvedValue({ dvds: [{ id: "dvd-1", title: "첫 DVD", active: true }] });
  await enterDvdManagement();
  const item = await screen.findByRole("group", { name: "첫 DVD" });

  // When
  await user.click(within(item).getByRole("button", { name: "안 보는 중으로 변경" }));
  expect(await within(item).findByText("안 보는 중")).toBeTruthy();
  await user.click(within(item).getByRole("button", { name: "보는 중으로 변경" }));

  // Then
  expect(await within(item).findByText("보는 중")).toBeTruthy();
  expect(boundary.setDvdActive.mock.calls.map((call) => call.slice(1))).toEqual([
    ["owner-1", "dvd-1", false], ["owner-1", "dvd-1", true],
  ]);
});

test("실패: 상태 변경 저장이 실패하면 기존 보는 중 상태를 보존하고 오류를 표시한다", async () => {
  // Given
  const user = userEvent.setup();
  boundary.fetchCatalog.mockResolvedValue({ dvds: [{ id: "dvd-1", title: "첫 DVD", active: true }] });
  boundary.setDvdActive.mockRejectedValue(new Error("변경 실패"));
  await enterDvdManagement();
  const item = await screen.findByRole("group", { name: "첫 DVD" });

  // When
  await user.click(within(item).getByRole("button", { name: "안 보는 중으로 변경" }));

  // Then
  expect((await screen.findByRole("alert")).textContent).toMatch(/실패/);
  expect(within(item).getByText("보는 중")).toBeTruthy();
  expect(within(item).queryByText("안 보는 중")).toBeNull();
});
