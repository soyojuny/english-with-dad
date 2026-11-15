import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DragonScene } from "../../app/dragon-scene";
import { defaultDragonDecor } from "../../lib/dragon-data";
import { fireBreathAnimation, thunderBreathAnimation } from "../../lib/dragon-art";
import type { Dragon } from "../../lib/dragon-types";

const decor = defaultDragonDecor();
const baseDragon: Dragon = { id: "fire", egg: 0, selectedDate: "", days: 6, element: "fire", skills: ["breath", "fly", "tail-attack", "clone"], decor, version: 0 };
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});

describe.each(["fire", "thunder"] as const)("%s 브레스", element => {
const dragon: Dragon = { ...baseDragon, element };
const animation = element === "thunder" ? thunderBreathAnimation : fireBreathAnimation;

test("승인한 속성별 프레임을 원래 타이밍으로 재생하고 대기로 돌아오며 다른 행동을 잠근다", () => {
  // Given
  const view = render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  const scene = screen.getByLabelText("드래곤의 공간"); scene.setPointerCapture = vi.fn();
  // When
  fireEvent.click(screen.getByRole("button", { name: "브레스" }));
  // Then
  const sprite = view.container.querySelector<HTMLElement>(".dragon-fire-breath-frame")!;
  expect(sprite.style.backgroundImage).toContain(`${element}-breath.webp`);
  for (const name of ["브레스 중", "꼬리 공격", "날기", "분신 놀이"]) expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.pointerDown(scene, { pointerId: 1, clientX: 20, clientY: 20 });
  expect(view.container.querySelector(".dragon-stick")).toBeNull();
  for (let frame = 0; frame < (element === "thunder" ? 12 : 11); frame++) {
    expect(sprite.style.backgroundPosition).toBe(`${frame % 4 * 100 / 3}% ${Math.floor(frame / 4) * 50}%`);
    act(() => vi.advanceTimersByTime(animation.durations[frame] - 1));
    expect(screen.queryByLabelText("브레스를 뿜는 아기 드래곤")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1));
  }
  expect(screen.queryByLabelText("브레스를 뿜는 아기 드래곤")).toBeNull();
  expect(view.container.querySelector(".dragon-idle")).toBeTruthy();
  expect((screen.getByRole("button", { name: "브레스" }) as HTMLButtonElement).disabled).toBe(false);
});

test("앉아 있으면 일어서고 브레스를 시작하며 비행 중에는 요청하지 않는다", () => {
  // Given
  render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  act(() => vi.advanceTimersByTime(5000));
  for (let i = 0; i < 4; i++) act(() => vi.advanceTimersByTime(300));
  // When
  fireEvent.click(screen.getByRole("button", { name: "브레스" }));
  // Then
  expect(screen.getByLabelText("쉬는 아기 드래곤").className).toContain("is-rising");
  expect(screen.queryByLabelText("브레스를 뿜는 아기 드래곤")).toBeNull();
  for (let i = 0; i < 4; i++) act(() => vi.advanceTimersByTime(300));
  expect(screen.getByLabelText("브레스를 뿜는 아기 드래곤")).toBeTruthy();
  for (const duration of animation.durations) act(() => vi.advanceTimersByTime(duration));
  fireEvent.click(screen.getByRole("button", { name: "날기" }));
  expect((screen.getByRole("button", { name: "브레스" }) as HTMLButtonElement).disabled).toBe(true);
});

test.each(["selection", "editing", "paused", "growth", "element"])("%s 전환은 진행 중인 브레스를 취소한다", change => {
  // Given
  const view = render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "브레스" }));
  // When
  view.rerender(<DragonScene dragon={{ ...dragon, id: change === "selection" ? "other" : dragon.id, days: change === "growth" ? 18 : 6, element: change === "element" ? element === "fire" ? "thunder" : "fire" : element }} decor={decor} catalog={[]} editing={change === "editing"} paused={change === "paused"} />);
  // Then
  expect(screen.queryByLabelText("브레스를 뿜는 아기 드래곤")).toBeNull();
});

test("일어서기 중 백그라운드 전환은 대기 요청을 취소하고 자동 재시작하지 않는다", () => {
  // Given
  render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  act(() => vi.advanceTimersByTime(5000)); act(() => vi.advanceTimersByTime(300));
  fireEvent.click(screen.getByRole("button", { name: "브레스" }));
  // When
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  hidden.mockReturnValue(false);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  act(() => vi.advanceTimersByTime(2000));
  // Then
  expect(screen.queryByLabelText("브레스를 뿜는 아기 드래곤")).toBeNull();
  expect((screen.getByRole("button", { name: "브레스" }) as HTMLButtonElement).disabled).toBe(false);
});

test.each(["tail-attack", "clone"])("%s 실행 중에는 브레스를 막는다", skill => {
  // Given
  render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  // When
  fireEvent.click(screen.getByRole("button", { name: skill === "clone" ? "분신 놀이" : "꼬리 공격" }));
  // Then
  if (skill === "clone") expect(screen.queryByRole("button", { name: "브레스" })).toBeNull();
  else expect((screen.getByRole("button", { name: "브레스" }) as HTMLButtonElement).disabled).toBe(true);
});

test.each([
  { days: 0, element: "fire", skills: ["breath"] },
  { days: 18, element: "fire", skills: ["breath"] },
  { days: 6, element: "ice", skills: ["breath"] },
  { days: 6, element: "fire", skills: [] },
] as const)("미지원 상태 $days/$element 에는 브레스 버튼과 미리 불러오기를 제공하지 않는다", entry => {
  // Given
  const candidate = { ...dragon, ...entry, skills: [...entry.skills] };
  // When
  const view = render(<DragonScene dragon={candidate} decor={decor} catalog={[]} />);
  // Then
  expect(screen.queryByRole("button", { name: "브레스" })).toBeNull();
  expect(view.container.querySelector('link[href$="-breath.webp"]')).toBeNull();
});

});
