import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { DragonScene } from "../../app/dragon-scene";
import { defaultDragonDecor } from "../../lib/dragon-data";
import { dragonFoods } from "../../lib/dragon-food";
import type { Dragon } from "../../lib/dragon-types";

const decor = defaultDragonDecor();
const base: Dragon = { id: "fire", egg: 0, days: 6, element: "fire", skills: ["fly", "tail-attack", "breath", "clone"], selectedDate: "", decor, version: 0 };
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});

for (const element of ["fire", "thunder"] as const) {
  test(`${element} 먹이는 세 번 씹고 원래 대기로 복귀하며 다시 줄 수 있다`, () => {
    // Given
    const view = render(<DragonScene dragon={{ ...base, element }} decor={decor} catalog={[]} ownedFoods={["lava-apple"]} />);
    // When
    fireEvent.click(screen.getByRole("button", { name: "먹이 주기" }));
    // Then
    expect(screen.getByLabelText("용암 열매 먹는 아기 드래곤")).toBeTruthy();
    for (const name of ["날기", "꼬리 공격", "브레스", "분신 놀이", "먹는 중"]) expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    act(() => vi.advanceTimersByTime(1300));
    expect(view.container.querySelector('[data-role="food"]')?.getAttribute("data-state")).toBe("appleBite");
    act(() => vi.advanceTimersByTime(4500));
    expect(view.container.querySelector(".dragon-feeding.is-eating")).toBeNull();
    expect(view.container.querySelector(".dragon-idle")).toBeTruthy();
    expect(view.container.querySelector('[data-role="food"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "먹이 주기" }));
    expect(view.container.querySelector(".dragon-feeding.is-eating")).toBeTruthy();
  });
}

test.each(["bone-meat", "thunder-grapes"])("%s 먹기 후 뼈와 한 알 먹은 송이를 보존한다", id => {
  // Given
  const view = render(<DragonScene dragon={base} decor={decor} catalog={[]} ownedFoods={[id]} />);
  // When
  fireEvent.click(screen.getByRole("button", { name: "먹이 주기" }));
  act(() => vi.advanceTimersByTime(6000));
  // Then
  const role = id === "bone-meat" ? "food" : "bunch", expected = id === "bone-meat" ? "bone" : "grapesAfterOne";
  expect(view.container.querySelector(`[data-role="${role}"]`)?.getAttribute("data-state")).toBe(expected);
});

test.each(["selection", "editing", "paused", "growth", "ownership"])("%s 전환은 먹기를 취소한다", change => {
  // Given
  const view = render(<DragonScene dragon={base} decor={decor} catalog={[]} ownedFoods={["lava-apple"]} />);
  fireEvent.click(screen.getByRole("button", { name: "먹이 주기" }));
  // When
  view.rerender(<DragonScene dragon={{ ...base, id: change === "selection" ? "other" : base.id, days: change === "growth" ? 18 : 6 }} decor={decor} catalog={[]} ownedFoods={change === "ownership" ? [] : ["lava-apple"]} editing={change === "editing"} paused={change === "paused"} />);
  // Then
  expect(view.container.querySelector(".dragon-feeding")).toBeNull();
});

test("앉아 있으면 먼저 일어서고 비행·공격 중에는 먹이 주기를 막는다", () => {
  // Given
  render(<DragonScene dragon={base} decor={decor} catalog={[]} ownedFoods={["lava-apple"]} />);
  act(() => vi.advanceTimersByTime(5000));
  for (let i = 0; i < 4; i++) act(() => vi.advanceTimersByTime(300));
  // When
  fireEvent.click(screen.getByRole("button", { name: "먹이 주기" }));
  // Then
  expect(screen.getByLabelText("쉬는 아기 드래곤").className).toContain("rising");
  for (let i = 0; i < 4; i++) act(() => vi.advanceTimersByTime(300));
  expect(screen.getByRole("button", { name: "먹는 중" })).toBeTruthy();
  act(() => vi.advanceTimersByTime(6000));
  fireEvent.click(screen.getByRole("button", { name: "날기" }));
  expect((screen.getByRole("button", { name: "먹이 주기" }) as HTMLButtonElement).disabled).toBe(true);
});

test("미보유 먹이와 미지원 성장·속성에는 먹기 조작을 제공하지 않는다", () => {
  // Given
  const view = render(<DragonScene dragon={base} decor={decor} catalog={[]} ownedFoods={[]} />);
  // When / Then
  expect(screen.queryByRole("button", { name: "먹이 주기" })).toBeNull();
  for (const dragon of [{ ...base, days: 0 }, { ...base, days: 18 }, { ...base, element: "ice" as const }, { ...base, element: null }]) {
    view.rerender(<DragonScene dragon={dragon} decor={decor} catalog={[]} ownedFoods={dragonFoods.map(food => food.id)} />);
    expect(screen.queryByRole("button", { name: "먹이 주기" })).toBeNull();
  }
});
