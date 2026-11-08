import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { DragonScene } from "../../app/dragon-scene";
import { defaultDragonDecor } from "../../lib/dragon-data";

const decor = defaultDragonDecor();
const dragon = { id: "baby", egg: 0, selectedDate: "2026-11-04", days: 1, element: null, skills: [], decor, version: 0 };
afterEach(() => vi.useRealTimers());

test("날기 획득 후 이륙·좌우 비행·공중 대기·역순 착륙을 하고 공중에서는 앉지 않는다", () => {
  // Given
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const view = render(<DragonScene dragon={{ ...dragon, skills: ["fly"] }} decor={decor} catalog={[]} />);
  const scene = screen.getByLabelText("드래곤의 공간"); scene.setPointerCapture = vi.fn();
  const advance = (count: number) => { for (let i = 0; i < count; i++) act(() => vi.advanceTimersByTime(84)); };
  // When
  fireEvent.click(screen.getByRole("button", { name: "날기" }));
  expect(screen.getByLabelText("날아오르는 아기 드래곤")).toBeTruthy();
  expect(screen.getByRole("button", { name: "날아오르는 중" }).hasAttribute("disabled")).toBe(true);
  advance(30);
  const resident = view.container.querySelector<HTMLElement>(".dragon-resident")!;
  expect(resident.style.top).toBe("49%");
  fireEvent.pointerDown(scene, { pointerId: 1, clientX: 20, clientY: 20 });
  fireEvent.pointerMove(scene, { pointerId: 1, clientX: 60, clientY: 20 });
  expect(screen.getByLabelText("비행하는 아기 드래곤")).toBeTruthy();
  expect(screen.queryByLabelText("걷는 아기 드래곤")).toBeNull();
  fireEvent.pointerUp(scene, { pointerId: 1 }); advance(72);
  expect(screen.getByLabelText("공중에 머무는 아기 드래곤")).toBeTruthy();
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "날기" }));
  expect(screen.getByLabelText("착륙하는 아기 드래곤")).toBeTruthy();
  advance(30);
  // Then
  expect(view.container.querySelector(".dragon-flight")).toBeNull();
  expect(resident.style.top).toBe("65%");
  expect(screen.getByRole("button", { name: "날기" }).getAttribute("aria-pressed")).toBe("false");
});

for (const element of [null, "fire", "thunder", "ice"] as const) {
test(`${element ?? "무속성"} 아기는 5초 후 ${element === "ice" ? "네" : "다섯"} 자세로 앉고 터치하면 역순으로 일어선다`, () => {
  // Given
  vi.useFakeTimers();
  render(<DragonScene dragon={{ ...dragon, element }} decor={decor} catalog={[]} />);
  const scene = screen.getByLabelText("드래곤의 공간");
  scene.setPointerCapture = vi.fn();
  // When
  act(() => vi.advanceTimersByTime(4999));
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
  act(() => vi.advanceTimersByTime(1));
  // Then: each approved pose advances exactly every 300ms.
  const positions = element === "ice" ? ["33.333333333333336%", "66.66666666666667%", "100%"] : ["25%", "50%", "75%", "100%"];
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundSize).toBe(element === "ice" ? "400% 100%" : "500% 100%");
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe("0%");
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundImage).toContain(`/assets/dragons/baby/${element ? `${element}-` : ""}sit-sequence.webp`);
  act(() => vi.advanceTimersByTime(299));
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe("0%");
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe(positions[0]);
  for (const position of positions.slice(1)) {
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe(position);
  }
  expect(screen.getByLabelText("쉬는 아기 드래곤").className).toContain("is-seated");
  act(() => vi.advanceTimersByTime(3000));
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe("100%");
  fireEvent.pointerDown(scene, { pointerId: 1, pointerType: "touch", clientX: 20, clientY: 20 });
  expect(screen.getByLabelText("쉬는 아기 드래곤").className).toContain("is-rising");
  for (const position of positions.slice(0, -1).reverse()) {
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe(position);
  }
  act(() => vi.advanceTimersByTime(300));
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
});

test("앉는 도중 터치하면 현재 자세에서 되돌아가며 마지막 자세로 뛰지 않는다", () => {
  // Given
  vi.useFakeTimers();
  render(<DragonScene dragon={{ ...dragon, element }} decor={decor} catalog={[]} />);
  const scene = screen.getByLabelText("드래곤의 공간");
  scene.setPointerCapture = vi.fn();
  act(() => vi.advanceTimersByTime(5000));
  act(() => vi.advanceTimersByTime(300));
  act(() => vi.advanceTimersByTime(300));
  // When
  fireEvent.pointerDown(scene, { pointerId: 1, pointerType: "touch", clientX: 20, clientY: 20 });
  // Then
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe(element === "ice" ? "66.66666666666667%" : "50%");
  act(() => vi.advanceTimersByTime(300));
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe(element === "ice" ? "33.333333333333336%" : "25%");
  act(() => vi.advanceTimersByTime(300));
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
});
}

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

test("앉은 무속성 아기가 불 속성을 선택하면 서기로 초기화한 뒤 불 시트로 앉는다", () => {
  // Given
  vi.useFakeTimers();
  const view = render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  act(() => vi.advanceTimersByTime(5000));
  for (let frame = 0; frame < 4; frame++) act(() => vi.advanceTimersByTime(300));
  expect(screen.getByLabelText("쉬는 아기 드래곤")).toBeTruthy();
  // When
  view.rerender(<DragonScene dragon={{ ...dragon, days: 6, element: "fire" }} decor={decor} catalog={[]} />);
  act(() => vi.advanceTimersByTime(4999));
  // Then
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
  expect(screen.getByLabelText("드래곤의 공간").className).toContain("is-controllable");
  expect(view.container.querySelector('.dragon-idle img')?.getAttribute('src')).toBe('/assets/dragons/baby/fire.webp');
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundPositionX).toBe("0%");
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundImage).toContain("fire-sit-sequence.webp");
});

test.each([
  { name: "불 알", days: 0, element: "fire" as const, editing: false, enabled: false },
  { name: "불 아기 마지막 날", days: 17, element: "fire" as const, editing: false, enabled: true },
  { name: "불 청소년 첫날", days: 18, element: "fire" as const, editing: false, enabled: false },
  { name: "번개 알", days: 0, element: "thunder" as const, editing: false, enabled: false },
  { name: "번개 아기", days: 6, element: "thunder" as const, editing: false, enabled: true },
  { name: "번개 아기 마지막 날", days: 17, element: "thunder" as const, editing: false, enabled: true },
  { name: "번개 청소년 첫날", days: 18, element: "thunder" as const, editing: false, enabled: false },
  { name: "꾸미는 중인 번개 아기", days: 6, element: "thunder" as const, editing: true, enabled: false },
  { name: "얼음 알", days: 0, element: "ice" as const, editing: false, enabled: false },
  { name: "얼음 아기", days: 6, element: "ice" as const, editing: false, enabled: true },
  { name: "얼음 아기 마지막 날", days: 17, element: "ice" as const, editing: false, enabled: true },
  { name: "얼음 청소년 첫날", days: 18, element: "ice" as const, editing: false, enabled: false },
  { name: "꾸미는 중인 얼음 아기", days: 6, element: "ice" as const, editing: true, enabled: false },
  { name: "꾸미는 중인 불 아기", days: 6, element: "fire" as const, editing: true, enabled: false },
])("$name 조작 허용 여부를 지킨다", ({ days, element, editing, enabled }) => {
  // Given
  vi.useFakeTimers();
  render(<DragonScene dragon={{ ...dragon, days, element }} decor={decor} catalog={[]} editing={editing} />);
  // When
  act(() => vi.advanceTimersByTime(10000));
  // Then
  expect(screen.getByLabelText("드래곤의 공간").className.includes("is-controllable")).toBe(enabled);
  expect(!!screen.queryByLabelText("쉬는 아기 드래곤")).toBe(enabled && (element === "fire" || element === "thunder" || element === "ice"));
});

for (const element of ["thunder", "ice"] as const) {
test(`${element} 아기는 드래그 중 전용 시트로 걷고 손을 떼면 정지한 뒤 속성별 대기 동작을 한다`, () => {
  // Given
  vi.useFakeTimers();
  const view = render(<DragonScene dragon={{ ...dragon, element }} decor={decor} catalog={[]} />);
  const scene = screen.getByLabelText("드래곤의 공간");
  scene.setPointerCapture = vi.fn();
  // When
  fireEvent.pointerDown(scene, { pointerId: 1, pointerType: "touch", clientX: 20, clientY: 20 });
  fireEvent.pointerMove(scene, { pointerId: 1, pointerType: "touch", clientX: 60, clientY: 20 });
  // Then
  expect(screen.getByLabelText("걷는 아기 드래곤").firstElementChild?.getAttribute("style")).toContain(`${element}-walk-bde.webp`);
  fireEvent.pointerUp(scene, { pointerId: 1 });
  expect(screen.queryByLabelText("걷는 아기 드래곤")).toBeNull();
  expect(view.container.querySelector('.dragon-idle img')?.getAttribute('src')).toBe(`/assets/dragons/baby/${element}.webp`);
  act(() => vi.advanceTimersByTime(4999));
  expect(screen.queryByLabelText("쉬는 아기 드래곤")).toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByLabelText("쉬는 아기 드래곤").style.backgroundImage).toContain(`${element}-sit-sequence.webp`);
});
}
