import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { DragonScene } from "../../app/dragon-scene";
import { defaultDragonDecor } from "../../lib/dragon-data";

const decor = defaultDragonDecor();
const dragon = { id: "baby", egg: 0, selectedDate: "2026-11-04", days: 1, element: null, decor, version: 0 };
afterEach(() => vi.useRealTimers());

test("무속성 아기는 5초가 되면 앉고 터치하면 일어선다", () => {
  // Given
  vi.useFakeTimers();
  render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  const scene = screen.getByLabelText("드래곤의 공간");
  scene.setPointerCapture = vi.fn();
  // When
  act(() => vi.advanceTimersByTime(4999));
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
  act(() => vi.advanceTimersByTime(1));
  // Then
  expect(screen.getByLabelText("쉬는 아기 드래곤").className).toContain("is-sitting");
  act(() => vi.advanceTimersByTime(700));
  fireEvent.pointerDown(scene, { pointerId: 1, pointerType: "touch", clientX: 20, clientY: 20 });
  expect(screen.getByLabelText("쉬는 아기 드래곤").className).toContain("is-rising");
  act(() => vi.advanceTimersByTime(700));
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
});

test("꾸미는 동안에는 대기해도 앉지 않는다", () => {
  // Given
  vi.useFakeTimers();
  render(<DragonScene dragon={dragon} decor={decor} catalog={[]} editing />);
  // When
  act(() => vi.advanceTimersByTime(6000));
  // Then
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
});
