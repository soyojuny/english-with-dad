import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { DragonScreen } from "../../app/dragon-companion";
import { defaultDragonDecor } from "../../lib/dragon-data";
import type { DragonController } from "../../app/use-dragon-world";
import type { DragonWorld } from "../../lib/dragon-types";

function controller(world: DragonWorld | null): DragonController {
  return { world, pending: false, error: "", retry: null, run: vi.fn().mockResolvedValue(false) };
}
function world(): DragonWorld {
  return { today: "2026-11-04", credited: true, eligible: true, totalDays: 0, credits: 0,
    owned: ["lava-open-foreground", "ancient-dragon-relic", "lava-crystal"],
    dragons: [{ id: "first", egg: 0, selectedDate: "2026-11-04", days: 0, element: null, decor: defaultDragonDecor(), version: 0 }],
    catalog: [{ id: "ancient-dragon-relic", name: "고대 드래곤 석비", kind: "prop", art: "ancient-dragon-relic", free: true },
      { id: "lava-open-foreground", name: "용암 계곡", kind: "background", art: "lava-open-foreground", free: true },
      { id: "lava-crystal", name: "용암 수정", kind: "prop", art: "lava-crystal", free: true }] };
}

test("초기 조회 실패도 전용 화면에서 다시 확인할 수 있다", async () => {
  // Given
  const state = { ...controller(null), error: "연결 오류", retry: { action: "sync" } as const };
  render(<DragonScreen controller={state} />);
  // When
  await userEvent.click(screen.getByRole("button", { name: "반영 다시 확인" }));
  // Then
  expect(screen.getByRole("alert").textContent).toContain("연결 오류");
  expect(state.run).toHaveBeenCalledWith({ action: "sync" });
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("첫 알 자격이 없을 때 선택을 허용하지 않고 학습 조건을 설명한다", () => {
  // Given
  const state = controller({ ...world(), dragons: [], eligible: false });
  // When
  render(<DragonScreen controller={state} />);
  // Then
  expect(screen.getByText(/오늘 배정된 학습을 모두 마치면/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "반점 무늬 알" })).toBeNull();
});

test("배경을 먼저 고를 수 있고 둥지와 미제공 장식은 표시하지 않는다", async () => {
  // Given
  const data = world();
  data.catalog.push({ id: "flowers", name: "들꽃", kind: "prop", art: "flowers", free: true });
  render(<DragonScreen controller={controller(data)} />);
  // When
  expect(screen.queryByRole("button", { name: "용암 계곡 기본 제공" })).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "공간 꾸미기" }));
  expect(screen.getByRole("button", { name: "용암 계곡 기본 제공" })).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "장식 1" }));
  // Then
  expect(screen.queryByRole("button", { name: "둥지" })).toBeNull();
  expect(screen.queryByRole("button", { name: /들꽃/ })).toBeNull();
  expect(screen.getByRole("button", { name: "고대 드래곤 석비 기본 제공" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "용암 수정 기본 제공" })).toBeTruthy();
});

test("무료 소품은 기회 없이 선택하고 저장 실패 후 배치를 유지하거나 취소할 수 있다", async () => {
  // Given
  const state = controller(world()); render(<DragonScreen controller={state} />);
  // When
  await userEvent.click(screen.getByRole("button", { name: "공간 꾸미기" }));
  await userEvent.click(screen.getByRole("button", { name: "장식 1" }));
  await userEvent.click(screen.getByRole("button", { name: "용암 수정 기본 제공" }));
  await userEvent.click(screen.getByRole("button", { name: "꾸미기 저장" }));
  // Then
  expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ action: "decorate", version: 0,
    decor: expect.objectContaining({ left: { itemId: "lava-crystal", x: 82, y: 60 } }) }));
  expect(screen.getByRole("button", { name: "꾸미기 저장" }).hasAttribute("disabled")).toBe(false);
  expect(screen.queryByRole("button", { name: /받기 · 기회/ })).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "변경 취소" }));
  expect(screen.getByRole("button", { name: "꾸미기 저장" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("button", { name: /장식 1: 고대 드래곤 석비/ })).toBeTruthy();
});

test("저장 대기 중에는 소품 선택과 이동을 막는다", async () => {
  // Given
  const state = { ...controller(world()), pending: true };
  // When
  render(<DragonScreen controller={state} />);
  // Then
  await userEvent.click(screen.getByRole("button", { name: "공간 꾸미기" }));
  await userEvent.click(screen.getByRole("button", { name: "장식 1" }));
  for (const name of ["용암 수정 기본 제공", "오른쪽", "꾸미기 저장"]) {
    expect(screen.getByRole("button", { name }).hasAttribute("disabled")).toBe(true);
  }
});

test("보기에서는 소품을 편집할 수 없고 닫으면 저장하지 않은 배치를 버린다", async () => {
  // Given
  render(<DragonScreen controller={controller(world())} />);
  expect(screen.getByRole("button", { name: /장식 1: 고대 드래곤 석비/ }).hasAttribute("disabled")).toBe(true);
  // When
  await userEvent.click(screen.getByRole("button", { name: "공간 꾸미기" }));
  await userEvent.click(screen.getByRole("button", { name: "장식 1" }));
  await userEvent.click(screen.getByRole("button", { name: "용암 수정 기본 제공" }));
  await userEvent.click(screen.getByRole("button", { name: "변경 취소하고 닫기" }));
  // Then
  expect(screen.queryByRole("button", { name: "꾸미기 저장" })).toBeNull();
  expect(screen.getByRole("button", { name: /장식 1: 고대 드래곤 석비/ }).hasAttribute("disabled")).toBe(true);
  await userEvent.click(screen.getByRole("button", { name: "공간 꾸미기" }));
  expect(screen.getByRole("button", { name: "꾸미기 저장" }).hasAttribute("disabled")).toBe(true);
});
