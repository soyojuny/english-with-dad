import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { useChildDvdCatalog } from "../../app/use-child-dvd-catalog";
import type { Dvd } from "../../lib/reading-types";
import type { fetchDvdCatalogData } from "../../lib/supabase/reading-store";

const boundary = vi.hoisted(() => ({ fetchCatalog: vi.fn() }));
vi.mock("../../lib/supabase/reading-store", async (original) => ({
  ...(await original<typeof import("../../lib/supabase/reading-store")>()),
  fetchDvdCatalogData: boundary.fetchCatalog,
}));

type Client = Parameters<typeof fetchDvdCatalogData>[0];
type Options = { supabase: Client; ownerUserId: string; childId: string };
const client = {} as Client;
const options = (childId: string): Options => ({ supabase: client, ownerUserId: "owner-1", childId });

beforeEach(() => { boundary.fetchCatalog.mockReset(); });

test("정상: 같은 가족 두 아동은 같은 활성 DVD를 받고 비활성 DVD는 제외한다", async () => {
  // Given
  boundary.fetchCatalog.mockResolvedValue({ dvds: [
    { id: "dvd-1", title: "보는 DVD", active: true },
    { id: "dvd-2", title: "쉬는 DVD", active: false },
  ] });

  // When
  const first = renderHook(() => useChildDvdCatalog(options("child-1")));
  const second = renderHook(() => useChildDvdCatalog(options("child-2")));

  // Then
  await waitFor(() => expect(first.result.current.status).toBe("ready"));
  await waitFor(() => expect(second.result.current.status).toBe("ready"));
  expect(first.result.current.dvds).toEqual([{ id: "dvd-1", title: "보는 DVD", active: true }]);
  expect(second.result.current.dvds).toEqual(first.result.current.dvds);
  expect(boundary.fetchCatalog).toHaveBeenCalledWith(client, "owner-1");
});

test("경계: 조회 중 상태는 완료된 빈 목록과 구분된다", async () => {
  // Given
  let resolve!: (value: { dvds: Dvd[] }) => void;
  boundary.fetchCatalog.mockReturnValue(new Promise((done) => { resolve = done; }));

  // When
  const view = renderHook(() => useChildDvdCatalog(options("child-1")));

  // Then
  expect(view.result.current.status).toBe("loading");
  await act(async () => resolve({ dvds: [] }));
  expect(view.result.current).toMatchObject({ status: "ready", dvds: [] });
});

test("실패: 조회 오류는 완료된 빈 목록으로 처리하지 않는다", async () => {
  // Given
  boundary.fetchCatalog.mockRejectedValue(new Error("조회 실패"));

  // When
  const view = renderHook(() => useChildDvdCatalog(options("child-1")));

  // Then
  await waitFor(() => expect(view.result.current.status).toBe("error"));
  expect(view.result.current.dvds).toEqual([]);
});

test("경계: 소유자 전환은 이전 목록과 늦게 도착한 이전 가족 응답을 표시하지 않는다", async () => {
  // Given
  const oldDvd = { id: "old-dvd", title: "이전 가족 DVD", active: true };
  const newDvd = { id: "new-dvd", title: "새 가족 DVD", active: true };
  let resolveOld!: (value: { dvds: Dvd[] }) => void;
  let resolveNew!: (value: { dvds: Dvd[] }) => void;
  boundary.fetchCatalog
    .mockResolvedValueOnce({ dvds: [oldDvd] })
    .mockReturnValueOnce(new Promise((done) => { resolveOld = done; }))
    .mockReturnValueOnce(new Promise((done) => { resolveNew = done; }));
  const view = renderHook((props: Options) => useChildDvdCatalog(props), { initialProps: options("child-1") });
  await waitFor(() => expect(view.result.current).toMatchObject({ status: "ready", dvds: [oldDvd] }));
  view.rerender({ ...options("child-2") });
  expect(view.result.current).toMatchObject({ status: "loading", dvds: [] });

  // When
  view.rerender({ supabase: client, ownerUserId: "owner-2", childId: "child-3" });
  expect(view.result.current).toMatchObject({ status: "loading", dvds: [] });
  await act(async () => resolveNew({ dvds: [newDvd] }));
  expect(view.result.current).toMatchObject({ status: "ready", dvds: [newDvd] });
  await act(async () => resolveOld({ dvds: [oldDvd] }));

  // Then
  expect(view.result.current).toMatchObject({ status: "ready", dvds: [newDvd] });
  expect(boundary.fetchCatalog).toHaveBeenLastCalledWith(client, "owner-2");
});
