import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useDragonTailAttack } from "../../app/use-dragon-tail-attack";
import { fireTailAttackAnimation } from "../../lib/dragon-art";

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

test("불 공격은 79번째 자세를 대기로 유지하며 대기 해제 후에는 다시 시작할 수 있다", () => {
  // Given
  media();
  const { result } = renderHook(() => useDragonTailAttack(true, "fire", fireTailAttackAnimation));
  // When
  act(() => result.current.start());
  act(() => vi.advanceTimersByTime(2200));
  // Then
  expect(result.current).toMatchObject({ active: false, resting: true, frame: 78 });
  act(() => vi.advanceTimersByTime(6000));
  expect(result.current).toMatchObject({ active: false, resting: true, frame: 78 });
  act(() => result.current.clearRest());
  expect(result.current.resting).toBe(false);
  act(() => result.current.start());
  expect(result.current).toMatchObject({ active: true, resting: false, frame: 0 });
});

test("불의 움직임 줄이기는 타격 자세를 300ms 표시한 뒤 마지막 자세로 대기한다", () => {
  // Given
  media(true);
  const { result } = renderHook(() => useDragonTailAttack(true, "fire", fireTailAttackAnimation));
  // When
  act(() => result.current.start());
  // Then
  expect(result.current).toMatchObject({ active: true, resting: false, frame: 45 });
  act(() => vi.advanceTimersByTime(300));
  expect(result.current).toMatchObject({ active: false, resting: true, frame: 78 });
});

test("불 공격 도중 화면 숨김은 완료로 처리하지 않으며 선택 변경은 대기도 취소한다", () => {
  // Given
  media();
  const { result, rerender } = renderHook(({ id }) => useDragonTailAttack(true, id, fireTailAttackAnimation), { initialProps: { id: "fire" } });
  act(() => result.current.start());
  // When
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  // Then
  expect(result.current).toMatchObject({ active: false, resting: false });
  hidden.mockReturnValue(false);
  act(() => result.current.start());
  act(() => vi.advanceTimersByTime(2200));
  expect(result.current.resting).toBe(true);
  rerender({ id: "other" });
  expect(result.current).toMatchObject({ active: false, resting: false });
});
