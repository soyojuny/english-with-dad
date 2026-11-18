import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useDragonFeeding } from "../../app/use-dragon-feeding";
import { dragonFoods } from "../../lib/dragon-food";

test("움직임 줄이기는 만족 자세를 300ms만 표시하고 연타로 연장하지 않는다", () => {
  // Given
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const { result, unmount } = renderHook(() => useDragonFeeding(true, "fire", "fire"));
  // When
  act(() => result.current.start(dragonFoods[0]));
  act(() => vi.advanceTimersByTime(299));
  act(() => result.current.start(dragonFoods[1]));
  // Then
  expect(result.current.active).toBe(true);
  expect(result.current.frame).toBe(7);
  expect(result.current.food?.id).toBe("lava-apple");
  act(() => vi.advanceTimersByTime(1));expect(result.current.active).toBe(false);
  unmount();expect(vi.getTimerCount()).toBe(0);
});

test("백그라운드 전환은 먹기와 남은 음식을 취소하고 자동 재시작하지 않는다", () => {
  // Given
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const { result, unmount } = renderHook(() => useDragonFeeding(true, "fire", "fire"));
  act(() => result.current.start(dragonFoods[0]));
  // When
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  act(() => result.current.start(dragonFoods[0]));
  // Then
  expect(result.current.active).toBe(false);expect(result.current.food).toBeNull();
  hidden.mockReturnValue(false);act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(result.current.active).toBe(false);unmount();expect(vi.getTimerCount()).toBe(0);
});
