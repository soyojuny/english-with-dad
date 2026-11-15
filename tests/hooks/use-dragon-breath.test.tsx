import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { fireBreathAnimation, thunderBreathAnimation } from "../../lib/dragon-art";
import { useDragonBreath } from "../../app/use-dragon-breath";

test.each([{ animation: fireBreathAnimation, expectedFrame: 5 }, { animation: thunderBreathAnimation, expectedFrame: 6 }])("$animation.artwork 움직임 줄이기는 최대 발사 자세만 300ms 표시하며 연타로 시간을 연장하지 않는다", ({ animation, expectedFrame }) => {
  // Given
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const { result, unmount } = renderHook(() => useDragonBreath(true, "dragon", animation));
  // When
  act(() => result.current.start()); act(() => vi.advanceTimersByTime(299));
  act(() => result.current.start());
  // Then
  expect(result.current).toMatchObject({ active: true, frame: expectedFrame });
  act(() => vi.advanceTimersByTime(1));
  expect(result.current.active).toBe(false);
  unmount(); expect(vi.getTimerCount()).toBe(0);
});

test("백그라운드는 재생을 취소하며 비활성 상태와 숨겨진 화면에서는 시작하지 않는다", () => {
  // Given
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const { result, rerender } = renderHook(({ enabled }) => useDragonBreath(enabled, "fire"), { initialProps: { enabled: true } });
  act(() => result.current.start());
  // When
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  act(() => result.current.start());
  // Then
  expect(result.current.active).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
  hidden.mockReturnValue(false); rerender({ enabled: false });
  act(() => result.current.start()); expect(result.current.active).toBe(false);
});
