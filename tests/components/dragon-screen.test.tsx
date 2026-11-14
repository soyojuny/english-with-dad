import { fireEvent, render, screen } from "@testing-library/react";
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
    dragons: [{ id: "first", egg: 0, selectedDate: "2026-11-04", days: 0, element: null, skills: [], decor: defaultDragonDecor(), version: 0 }],
    catalog: [{ id: "ancient-dragon-relic", name: "고대 드래곤 석비", kind: "prop", art: "ancient-dragon-relic", free: true },
      { id: "lava-open-foreground", name: "용암 계곡", kind: "background", art: "lava-open-foreground", free: true },
      { id: "lava-crystal", name: "용암 수정", kind: "prop", art: "lava-crystal", free: true }] };
}

test.each(["fire", "thunder"] as const)("%s 분신은 기회 1개로 획득을 요청하고 저장 후에만 놀이 버튼을 제공한다", element => {
  // Given
  const data = world(); data.credits = 1; data.dragons[0].days = 6; data.dragons[0].element = element;
  const state = controller(data); const view = render(<DragonScreen controller={state} />);
  // When
  fireEvent.click(screen.getByRole("button", { name: "분신 배우기 · 기회 1개" }));
  // Then
  expect(state.run).toHaveBeenCalledWith({ action: "skill", id: "first", skill: "clone" });
  expect(screen.queryByRole("button", { name: "분신 놀이" })).toBeNull();
  view.rerender(<DragonScreen controller={{ ...state, world: { ...data, credits: 0, dragons: [{ ...data.dragons[0], skills: ["clone"] }] } }} />);
  expect(screen.queryByRole("button", { name: "분신 배우기 · 기회 1개" })).toBeNull();
  expect(screen.getByRole("button", { name: "분신 놀이" })).toBeTruthy();
});

test("분신 획득은 기회 부족·저장 중에는 막고 불·번개 아기에게만 제공한다", () => {
  // Given
  const data = world(); data.dragons[0].days = 6; data.dragons[0].element = "fire";
  const state = controller(data); const view = render(<DragonScreen controller={state} />);
  // When / Then
  expect((screen.getByRole("button", { name: "분신 배우기 · 기회 1개" }) as HTMLButtonElement).disabled).toBe(true);
  view.rerender(<DragonScreen controller={{ ...state, pending: true, world: { ...data, credits: 1 } }} />);
  expect((screen.getByRole("button", { name: "분신 배우기 · 기회 1개" }) as HTMLButtonElement).disabled).toBe(true);
  view.rerender(<DragonScreen controller={{ ...state, world: { ...data, dragons: [{ ...data.dragons[0], element: "ice" }] } }} />);
  expect(screen.queryByRole("button", { name: "분신 배우기 · 기회 1개" })).toBeNull();
});

test("보상 기회가 있을 때 선택한 드래곤의 날기를 요청하고 저장 전에는 조작 버튼을 주지 않는다", async () => {
  // Given
  const data = world(); data.credits = 1; data.dragons[0].days = 3;
  const state = controller(data); render(<DragonScreen controller={state} />);
  // When
  await userEvent.click(screen.getByRole("button", { name: "날기 배우기 · 기회 1개" }));
  // Then
  expect(state.run).toHaveBeenCalledWith({ action: "skill", id: "first", skill: "fly" });
  expect(screen.queryByRole("button", { name: "날기" })).toBeNull();
});

test("기회가 없으면 날기를 배울 수 없고 저장 중에는 획득 요청을 막는다", () => {
  // Given
  const data = world(); data.dragons[0].days = 3;
  const state = controller(data); const view = render(<DragonScreen controller={state} />);
  // When / Then
  expect(screen.getByRole("button", { name: "날기 배우기 · 기회 1개" }).hasAttribute("disabled")).toBe(true);
  view.rerender(<DragonScreen controller={{ ...state, pending: true, world: { ...data, credits: 1 } }} />);
  expect(screen.getByRole("button", { name: "날기 배우기 · 기회 1개" }).hasAttribute("disabled")).toBe(true);
});

test.each(["fire", "thunder"] as const)("%s 아기는 기회 1개로 꼬리 공격을 요청하고 서버 저장 후 조작 버튼을 받는다", async (element) => {
  // Given
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const data = world(); data.credits = 1; data.dragons[0].days = 6; data.dragons[0].element = element;
  const state = controller(data); const view = render(<DragonScreen controller={state} />);
  // When
  await userEvent.click(screen.getByRole("button", { name: "꼬리 공격 배우기 · 기회 1개" }));
  // Then
  expect(state.run).toHaveBeenCalledWith({ action: "skill", id: "first", skill: "tail-attack" });
  expect(screen.queryByRole("button", { name: "꼬리 공격" })).toBeNull();
  view.rerender(<DragonScreen controller={{ ...state, world: { ...data, credits: 0, dragons: [{ ...data.dragons[0], skills: ["tail-attack"] }] } }} />);
  expect(screen.queryByRole("button", { name: "꼬리 공격 배우기 · 기회 1개" })).toBeNull();
  expect(screen.getByRole("button", { name: "꼬리 공격" })).toBeTruthy();
});

test("꼬리 공격 획득은 기회 부족과 저장 중에는 막고 다른 속성에는 제공하지 않는다", () => {
  // Given
  const data = world(); data.dragons[0].days = 6; data.dragons[0].element = "thunder";
  const state = controller(data); const view = render(<DragonScreen controller={state} />);
  // When / Then
  expect(screen.getByRole("button", { name: "꼬리 공격 배우기 · 기회 1개" }).hasAttribute("disabled")).toBe(true);
  view.rerender(<DragonScreen controller={{ ...state, pending: true, world: { ...data, credits: 1 } }} />);
  expect(screen.getByRole("button", { name: "꼬리 공격 배우기 · 기회 1개" }).hasAttribute("disabled")).toBe(true);
  view.rerender(<DragonScreen controller={{ ...state, world: { ...data, dragons: [{ ...data.dragons[0], element: "ice" }] } }} />);
  expect(screen.queryByRole("button", { name: "꼬리 공격 배우기 · 기회 1개" })).toBeNull();
});

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
