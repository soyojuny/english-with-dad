import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { DragonFoodRewards } from "../../app/dragon-food-rewards";
import { dragonFoods } from "../../lib/dragon-food";
import type { DragonWorld } from "../../lib/dragon-types";
import type { DragonController } from "../../app/use-dragon-world";

function controller(credits: number, owned: string[] = []): DragonController {
  const world: DragonWorld = { credits, owned, totalDays: 3, today: "", credited: true, eligible: true, dragons: [], catalog: dragonFoods.map(food => ({ id: food.id, name: food.name, art: food.id, kind: "food", free: false })) };
  return { world, pending: false, error: "", retry: null, run: vi.fn().mockResolvedValue(false) };
}

test("선택 기회로 먹이를 요청하고 서버가 보유를 확인한 뒤에만 획득 표시를 한다", () => {
  // Given
  const state = controller(1), view = render(<DragonFoodRewards controller={state} />);
  // When
  fireEvent.click(screen.getByRole("button", { name: "용암 열매받기 · 기회 1개" }));
  // Then
  expect(state.run).toHaveBeenCalledWith({ action: "claim", itemId: "lava-apple" });
  expect(screen.queryByText("받았어요 · 계속 사용")).toBeNull();
  view.rerender(<DragonFoodRewards controller={controller(0, ["lava-apple"])} />);
  expect(screen.getByText("받았어요 · 계속 사용")).toBeTruthy();
});

test("기회 부족과 저장 중에는 해금 요청을 막는다", () => {
  // Given
  const state = controller(0), view = render(<DragonFoodRewards controller={state} />);
  // When / Then
  for (const button of screen.getAllByRole("button")) expect((button as HTMLButtonElement).disabled).toBe(true);
  view.rerender(<DragonFoodRewards controller={{ ...controller(1), pending: true }} />);
  for (const button of screen.getAllByRole("button")) expect((button as HTMLButtonElement).disabled).toBe(true);
});
