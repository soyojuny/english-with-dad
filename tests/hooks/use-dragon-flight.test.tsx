import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useDragonFlight } from "../../app/use-dragon-flight";

function media(reduce = false) {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
}
function frames(count: number) { for (let i = 0; i < count; i++) act(() => vi.advanceTimersByTime(84)); }

test("이륙을 한 번 재생하고 공중 대기를 유지한 뒤 역순으로 착륙한다", () => {
  // Given
  vi.useFakeTimers(); media();
  const { result, unmount } = renderHook(() => useDragonFlight(true, false, "one"));
  // When
  act(() => result.current.toggle());
  expect(result.current.phase).toBe("taking-off");
  frames(29);
  expect(result.current.frame).toBe(29);
  frames(1);
  expect(result.current.phase).toBe("flying");
  frames(120);
  expect(result.current.phase).toBe("flying");
  act(() => result.current.toggle());
  expect(result.current.frame).toBe(29);
  frames(1);
  // Then
  expect(result.current.phase).toBe("landing");
  expect(result.current.frame).toBe(28);
  frames(29);
  expect(result.current.phase).toBe("ground");
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

test("이착륙 연타는 전환을 뒤집지 않으며 다른 드래곤 선택은 지상으로 초기화한다", () => {
  // Given
  vi.useFakeTimers(); media();
  const { result, rerender } = renderHook(({ id }) => useDragonFlight(true, false, id), { initialProps: { id: "one" } });
  // When
  act(() => result.current.toggle()); frames(5);
  act(() => result.current.toggle());
  // Then
  expect(result.current.phase).toBe("taking-off");
  expect(result.current.frame).toBe(5);
  rerender({ id: "two" });
  expect(result.current.phase).toBe("ground");
  frames(40);
  expect(result.current.phase).toBe("ground");
});

test("움직임 줄이기에서는 반복 날개짓과 중간 프레임 없이 이륙·착륙한다", () => {
  // Given
  vi.useFakeTimers(); media(true);
  const { result } = renderHook(() => useDragonFlight(true, false, "one"));
  // When
  act(() => result.current.toggle()); frames(20);
  // Then
  expect(result.current.phase).toBe("flying");
  expect(result.current.frame).toBe(0);
  act(() => result.current.toggle());
  expect(result.current.phase).toBe("ground");
});

test("사용 권한을 잃으면 비행이 취소되고 다시 시작할 수 없다", () => {
  // Given
  vi.useFakeTimers(); media();
  const { result, rerender } = renderHook(({ enabled }) => useDragonFlight(enabled, false, "one"), { initialProps: { enabled: true } });
  act(() => result.current.toggle()); frames(30);
  // When
  rerender({ enabled: false }); act(() => result.current.toggle());
  // Then
  expect(result.current.phase).toBe("ground");
});
