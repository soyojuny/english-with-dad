import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { DragonScene } from "../../app/dragon-scene";
import { defaultDragonDecor } from "../../lib/dragon-data";
import type { Dragon } from "../../lib/dragon-types";

const decor = defaultDragonDecor();
const dragon: Dragon = { id: "thunder", egg: 0, selectedDate: "2026-11-10", days: 6, element: "thunder", skills: ["fly", "tail-attack"], decor, version: 0 };
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});

test("공격은 43번째 자세까지 표시하고 서기로 돌아가며 공격 중 이동·날기·연타를 막는다", () => {
  // Given
  const view = render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  const scene = screen.getByLabelText("드래곤의 공간"); scene.setPointerCapture = vi.fn();
  // When
  fireEvent.click(screen.getByRole("button", { name: "꼬리 공격" }));
  // Then
  const sprite = view.container.querySelector<HTMLElement>(".dragon-tail-attack-frame")!;
  expect(sprite.style.backgroundImage).toContain("thunder-tail-attack.webp");
  expect(sprite.style.backgroundSize).toBe("600% 800%");
  expect(screen.getByRole("button", { name: "날기" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("button", { name: "꼬리 공격 중" }).hasAttribute("disabled")).toBe(true);
  fireEvent.pointerDown(scene, { pointerId: 1, clientX: 20, clientY: 20 });
  fireEvent.pointerMove(scene, { pointerId: 1, clientX: 80, clientY: 20 });
  expect(screen.queryByLabelText("걷는 아기 드래곤")).toBeNull();
  expect(view.container.querySelector(".dragon-stick")).toBeNull();
  for (let i = 0; i < 42; i++) act(() => vi.advanceTimersToNextTimer());
  expect(sprite.style.backgroundPosition).toBe("0% 100%");
  act(() => vi.advanceTimersToNextTimer());
  expect(screen.queryByLabelText("꼬리 공격하는 아기 드래곤")).toBeNull();
  expect(screen.getByRole("button", { name: "날기" }).hasAttribute("disabled")).toBe(false);
  expect(view.container.querySelector(".dragon-idle")).toBeTruthy();
  act(() => vi.advanceTimersByTime(4999));
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
});

test("앉은 상태에서 요청하면 역순으로 일어선 다음 공격하고 비행 중에는 공격을 막는다", () => {
  // Given
  render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  act(() => vi.advanceTimersByTime(5000));
  for (let i = 0; i < 4; i++) act(() => vi.advanceTimersByTime(300));
  // When
  fireEvent.click(screen.getByRole("button", { name: "꼬리 공격" }));
  // Then
  expect(screen.getByLabelText("쉬는 아기 드래곤").className).toContain("is-rising");
  expect(screen.queryByLabelText("꼬리 공격하는 아기 드래곤")).toBeNull();
  expect(screen.getByRole("button", { name: "날기" }).hasAttribute("disabled")).toBe(true);
  for (let i = 0; i < 4; i++) act(() => vi.advanceTimersByTime(300));
  expect(screen.getByLabelText("꼬리 공격하는 아기 드래곤")).toBeTruthy();
  act(() => vi.advanceTimersByTime(2500));
  fireEvent.click(screen.getByRole("button", { name: "날기" }));
  expect(screen.getByRole("button", { name: "꼬리 공격" }).hasAttribute("disabled")).toBe(true);
  expect(screen.queryByLabelText("꼬리 공격하는 아기 드래곤")).toBeNull();
});

test.each([
  { days: 0, element: "thunder" as const, skills: dragon.skills, editing: false },
  { days: 18, element: "thunder" as const, skills: dragon.skills, editing: false },
  { days: 6, element: "fire" as const, skills: dragon.skills, editing: false },
  { days: 6, element: "thunder" as const, skills: ["fly"] as Dragon["skills"], editing: false },
  { days: 6, element: "thunder" as const, skills: dragon.skills, editing: true },
])("허용되지 않는 상태 $days/$element/$editing 에서는 꼬리 공격 버튼과 시트를 제공하지 않는다", ({ days, element, skills, editing }) => {
  // Given
  const entry = { ...dragon, days, element, skills };
  // When
  const view = render(<DragonScene dragon={entry} decor={decor} catalog={[]} editing={editing} />);
  // Then
  expect(screen.queryByRole("button", { name: "꼬리 공격" })).toBeNull();
  expect(view.container.querySelector('link[href$="thunder-tail-attack.webp"]')).toBeNull();
});

test("다른 드래곤 선택과 꾸미기 전환은 진행 중인 공격을 취소한다", () => {
  // Given
  const view = render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "꼬리 공격" }));
  // When
  view.rerender(<DragonScene dragon={{ ...dragon, id: "second" }} decor={decor} catalog={[]} />);
  // Then
  expect(screen.queryByLabelText("꼬리 공격하는 아기 드래곤")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "꼬리 공격" }));
  view.rerender(<DragonScene dragon={{ ...dragon, id: "second" }} decor={decor} catalog={[]} editing />);
  expect(screen.queryByLabelText("꼬리 공격하는 아기 드래곤")).toBeNull();
});

test("일어서는 중 화면이 숨겨지면 대기 중인 공격도 취소한다", () => {
  // Given
  render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  act(() => vi.advanceTimersByTime(5000));
  act(() => vi.advanceTimersByTime(300));
  fireEvent.click(screen.getByRole("button", { name: "꼬리 공격" }));
  // When
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  act(() => vi.advanceTimersByTime(300));
  hidden.mockReturnValue(false);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  // Then
  expect(screen.queryByLabelText("꼬리 공격하는 아기 드래곤")).toBeNull();
  expect(screen.getByRole("button", { name: "꼬리 공격" }).hasAttribute("disabled")).toBe(false);
});
