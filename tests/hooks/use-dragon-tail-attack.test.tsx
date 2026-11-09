import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useDragonTailAttack } from "../../app/use-dragon-tail-attack";

function media(reduced = false) {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
}

test("43프레임을 순서대로 한 번 표시하고 종료하며 연타로 재시작하지 않는다", () => {
  // Given
  media();
  const { result, unmount } = renderHook(() => useDragonTailAttack(true, "one"));
  // When
  act(() => result.current.start());
  // Then
  expect(result.current).toMatchObject({ active: true, frame: 0 });
  for (let frame = 1; frame <= 42; frame++) {
    act(() => vi.advanceTimersToNextTimer());
    expect(result.current).toMatchObject({ active: true, frame });
    act(() => result.current.start());
    expect(result.current.frame).toBe(frame);
  }
  act(() => vi.advanceTimersToNextTimer());
  expect(result.current.active).toBe(false);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

test("권한·선택이 바뀌면 진행 중인 공격을 취소하고 권한 없이는 시작하지 않는다", () => {
  // Given
  media();
  const { result, rerender } = renderHook(({ enabled, id }) => useDragonTailAttack(enabled, id), { initialProps: { enabled: true, id: "one" } });
  act(() => result.current.start());
  // When
  rerender({ enabled: true, id: "two" });
  // Then
  expect(result.current.active).toBe(false);
  act(() => result.current.start());
  expect(result.current.active).toBe(true);
  rerender({ enabled: false, id: "two" });
  act(() => result.current.start());
  expect(result.current.active).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});

test("움직임 줄이기는 공격 자세 한 장만 300ms 표시하고 종료한다", () => {
  // Given
  media(true);
  const { result } = renderHook(() => useDragonTailAttack(true, "one"));
  // When
  act(() => result.current.start());
  // Then
  expect(result.current).toMatchObject({ active: true, frame: 24 });
  act(() => vi.advanceTimersByTime(299));
  expect(result.current).toMatchObject({ active: true, frame: 24 });
  act(() => vi.advanceTimersByTime(1));
  expect(result.current.active).toBe(false);
});

test("화면이 숨겨지면 공격을 취소하고 다시 표시해도 자동 재시작하지 않는다", () => {
  // Given
  media();
  const { result } = renderHook(() => useDragonTailAttack(true, "one"));
  act(() => result.current.start());
  // When
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  // Then
  expect(result.current.active).toBe(false);
  act(() => result.current.start());
  expect(result.current.active).toBe(false);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(result.current.active).toBe(false);
});
