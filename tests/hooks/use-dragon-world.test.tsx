import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useDragonWorld } from "../../app/use-dragon-world";
import type { DragonWorld } from "../../lib/dragon-types";
const boundary = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("../../lib/supabase/dragon-store", () => ({ updateDragonWorld: boundary.update }));
const client = {} as SupabaseClient;
const world: DragonWorld = { today: "2026-11-03", credited: true, eligible: true, totalDays: 0, credits: 0, owned: [], dragons: [], catalog: [] };
beforeEach(() => { boundary.update.mockReset(); });
test("저장된 학습 변경은 자동 재조회하며 성장 결과를 표시한다", async () => {
  // Given
  boundary.update.mockResolvedValueOnce({ ...world, credited: false }).mockResolvedValue(world);
  const view = renderHook(({ revision }) => useDragonWorld(client, "owner:c", "c", revision, true), { initialProps: { revision: "0" } });
  await waitFor(() => expect(view.result.current.world?.credited).toBe(false));
  // When
  view.rerender({ revision: "1" });
  // Then
  await waitFor(() => expect(view.result.current.world?.credited).toBe(true));
  expect(boundary.update).toHaveBeenCalledTimes(2);
});
test("응답 유실 후 같은 선택 요청을 재시도할 수 있다", async () => {
  // Given
  boundary.update.mockResolvedValueOnce(world).mockRejectedValueOnce(new Error("통신 오류")).mockResolvedValue(world);
  const view = renderHook(() => useDragonWorld(client, "owner:c", "c", "0", true));
  await waitFor(() => expect(view.result.current.world).toEqual(world));
  const command = { action: "egg", id: "fixed-id", egg: 1 } as const;
  // When
  await act(async () => { await view.result.current.run(command); });
  // Then
  expect(view.result.current.error).toContain("통신 오류");
  expect(view.result.current.retry).toEqual(command);
  await act(async () => { await view.result.current.run(view.result.current.retry!); });
  expect(boundary.update).toHaveBeenLastCalledWith(client, "c", command);
  expect(view.result.current.error).toBe("");
});
test("프로필 전환은 이전 아이의 늦은 응답을 버린다", async () => {
  // Given
  let resolveOld!: (value: DragonWorld) => void;
  boundary.update.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValue({ ...world, totalDays: 12 });
  const view = renderHook(({ child }) => useDragonWorld(client, `owner:${child}`, child, "0", true), { initialProps: { child: "a" } });
  await waitFor(() => expect(boundary.update).toHaveBeenCalledTimes(1));
  // When
  view.rerender({ child: "b" });
  await waitFor(() => expect(view.result.current.world?.totalDays).toBe(12));
  await act(async () => resolveOld(world));
  // Then
  expect(view.result.current.world?.totalDays).toBe(12);
});
test("읽기 오류·로딩 중에는 달성 조회를 시작하지 않는다", async () => {
  // Given
  const view = renderHook(() => useDragonWorld(client, "owner:c", "c", "0", false));
  // When
  await act(async () => { await view.result.current.run({ action: "sync" }); });
  // Then
  expect(boundary.update).not.toHaveBeenCalled();
  expect(view.result.current.world).toBeNull();
});
