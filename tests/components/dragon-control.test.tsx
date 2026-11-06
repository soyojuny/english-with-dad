import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { DragonScene } from "../../app/dragon-scene";
import { defaultDragonDecor } from "../../lib/dragon-data";

const decor = defaultDragonDecor();
const dragon = { id: "baby", egg: 0, selectedDate: "2026-11-04", days: 1, element: null, decor, version: 0 };
afterEach(() => vi.useRealTimers());

test("무속성 아기는 5초 후 승인된 다섯 자세로 앉고 터치하면 역순으로 일어선다", () => {
  // Given
  vi.useFakeTimers();
  render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  const scene = screen.getByLabelText("드래곤의 공간");
  scene.setPointerCapture = vi.fn();
  // When
  act(() => vi.advanceTimersByTime(4999));
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
  act(() => vi.advanceTimersByTime(1));
  // Then: stand → 2rus-2 → A → B → final, each exactly 300ms.
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe("0%");
  act(() => vi.advanceTimersByTime(299));
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe("0%");
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe("25%");
  for (const position of ["50%", "75%", "100%"]) {
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe(position);
  }
  expect(screen.getByLabelText("쉬는 아기 드래곤").className).toContain("is-seated");
  act(() => vi.advanceTimersByTime(3000));
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe("100%");
  fireEvent.pointerDown(scene, { pointerId: 1, pointerType: "touch", clientX: 20, clientY: 20 });
  expect(screen.getByLabelText("쉬는 아기 드래곤").className).toContain("is-rising");
  for (const position of ["75%", "50%", "25%"]) {
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe(position);
  }
  act(() => vi.advanceTimersByTime(300));
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
});

test("앉는 도중 터치하면 현재 자세에서 되돌아가며 마지막 자세로 뛰지 않는다", () => {
  // Given
  vi.useFakeTimers();
  render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  const scene = screen.getByLabelText("드래곤의 공간");
  scene.setPointerCapture = vi.fn();
  act(() => vi.advanceTimersByTime(5000));
  act(() => vi.advanceTimersByTime(300));
  act(() => vi.advanceTimersByTime(300));
  // When
  fireEvent.pointerDown(scene, { pointerId: 1, pointerType: "touch", clientX: 20, clientY: 20 });
  // Then
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe("50%");
  act(() => vi.advanceTimersByTime(300));
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe("25%");
  act(() => vi.advanceTimersByTime(300));
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
});

test("첫 서기 프레임에서 터치하면 중간 자세 없이 서기로 돌아간다", () => {
  // Given
  vi.useFakeTimers();
  render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  const scene = screen.getByLabelText("드래곤의 공간");
  scene.setPointerCapture = vi.fn();
  act(() => vi.advanceTimersByTime(5000));
  // When
  fireEvent.pointerDown(scene, { pointerId: 1, pointerType: "touch", clientX: 20, clientY: 20 });
  // Then
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
  act(() => vi.advanceTimersByTime(1200));
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

test("다른 드래곤으로 바꾸면 진행 중인 앉기와 프레임을 초기화한다", () => {
  // Given
  vi.useFakeTimers();
  const view = render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  act(() => vi.advanceTimersByTime(5000));
  act(() => vi.advanceTimersByTime(300));
  // When
  view.rerender(<DragonScene dragon={{ ...dragon, id: "other-baby" }} decor={decor} catalog={[]} />);
  // Then
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe("0%");
});
