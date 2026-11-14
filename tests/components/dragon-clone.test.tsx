import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DragonScene } from "../../app/dragon-scene";
import { defaultDragonDecor } from "../../lib/dragon-data";
import type { Dragon } from "../../lib/dragon-types";

const decor = defaultDragonDecor();
describe.each(["fire", "thunder"] as const)("%s 분신 놀이", element => {
const dragon: Dragon = { id: element, egg: 0, selectedDate: "", days: 6, element, skills: ["clone", "fly", "tail-attack"], decor, version: 0 };
function advanceToChoices() { act(() => vi.advanceTimersByTime(6400)); }
function renderGame() {
  const view = render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "분신 놀이" }));
  return view;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(.999);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});

test("오답과 단서 재확인 후에도 같은 문제에서 정답을 고르고 새 문제를 시작한다", () => {
  // Given: deterministic shuffle puts the real dragon first.
  renderGame();
  advanceToChoices();
  const positions = [...document.querySelectorAll<HTMLElement>(".clone-candidate")].map(button => button.style.cssText);
  // When
  fireEvent.click(screen.getByRole("button", { name: "2번 드래곤 선택" }));
  fireEvent.click(screen.getByRole("button", { name: "단서 다시 보기" }));
  advanceToChoices();
  // Then
  expect((screen.getByRole("button", { name: "2번 드래곤 선택" }) as HTMLButtonElement).disabled).toBe(true);
  expect([...document.querySelectorAll<HTMLElement>(".clone-candidate")].map(button => button.style.cssText)).toEqual(positions);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "1번 드래곤 선택" }));
  fireEvent.click(screen.getByRole("button", { name: "1번 드래곤 선택" }));
  expect(screen.getByRole("status").textContent).toContain("알아보는구나");
  expect(screen.queryByRole("button", { name: "단서 다시 보기" })).toBeNull();
  vi.mocked(Math.random).mockReturnValue(.001);
  act(() => vi.advanceTimersByTime(1200));
  expect(screen.getByRole("button", { name: "분신 놀이" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "분신 놀이" }));
  advanceToChoices();
  expect([...document.querySelectorAll<HTMLElement>(".clone-candidate")].map(button => button.style.cssText)).not.toEqual(positions);
});

test("난이도를 무작위로 정하고 관찰은 시간 제한 없이 반복된다", () => {
  // Given
  renderGame();
  // When
  expect(screen.queryByRole("combobox")).toBeNull();
  advanceToChoices();
  act(() => vi.advanceTimersByTime(1300));
  // Then
  expect(screen.getByText("눈을 두 번 깜빡이고 → 앉았다 일어나기")).toBeTruthy();
  const first = screen.getByRole("button", { name: "1번 드래곤 선택" });
  const second = screen.getByRole("button", { name: "2번 드래곤 선택" });
  expect(first.querySelector<HTMLElement>(".clone-blink")!.style.opacity).toBe("1");
  expect(second.querySelector<HTMLElement>(".clone-blink")!.style.opacity).toBe("0");
  act(() => vi.advanceTimersByTime(7200 * 3));
  expect(first.querySelector<HTMLElement>(".clone-blink")!.style.opacity).toBe("1");
  expect((first as HTMLButtonElement).disabled).toBe(false);
  vi.mocked(Math.random).mockReturnValue(.001);
  fireEvent.click(screen.getByRole("button", { name: "새로 놀기" }));
  expect(screen.getByText("천천히 앉았다가 → 다시 일어나기")).toBeTruthy();
});

test("단서 행동 한 번 후 소멸·생성 효과를 거쳐 선택을 시작하며 전환 중에는 선택하지 못한다", () => {
  // Given
  const view = renderGame();
  const phase = () => view.container.querySelector<HTMLElement>(".clone-stage")!.dataset.phase;
  expect(phase()).toBe("clue");
  // When / Then: one clue pass, then disappearance and reappearance.
  act(() => vi.advanceTimersByTime(5100));
  expect(phase()).toBe("clue");
  act(() => vi.advanceTimersByTime(400));
  expect(phase()).toBe("vanish");
  expect(view.container.querySelector<HTMLElement>(".clone-magic-body")!.style.opacity).toBe("0.5");
  expect(screen.queryByRole("button", { name: "1번 드래곤 선택" })).toBeNull();
  act(() => vi.advanceTimersByTime(600));
  expect(phase()).toBe("emerge");
  expect(view.container.querySelectorAll(".clone-magic-burst")).toHaveLength(3);
  expect((screen.getByRole("button", { name: "1번 드래곤 선택" }) as HTMLButtonElement).disabled).toBe(true);
  act(() => vi.advanceTimersByTime(300));
  expect(phase()).toBe("observe");
  expect((screen.getByRole("button", { name: "1번 드래곤 선택" }) as HTMLButtonElement).disabled).toBe(false);
});

test("정답 효과는 잠시 표시하고 일시정지를 지키며 원래 대기 모습으로 돌아간다", () => {
  // Given
  const view = renderGame(); advanceToChoices();
  // When
  fireEvent.click(screen.getByRole("button", { name: "1번 드래곤 선택" }));
  act(() => vi.advanceTimersByTime(600));
  // Then
  expect(view.container.querySelector(".clone-success-sparkle")).toBeTruthy();
  expect(view.container.querySelector(".dragon-resident")).toBeNull();
  view.rerender(<DragonScene dragon={dragon} decor={decor} catalog={[]} paused />);
  act(() => vi.advanceTimersByTime(3000));
  expect(view.container.querySelector(".clone-success-sparkle")).toBeTruthy();
  view.rerender(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  act(() => vi.advanceTimersByTime(600));
  expect(screen.queryByLabelText("분신 관찰 놀이")).toBeNull();
  expect(view.container.querySelector(".dragon-idle")).toBeTruthy();
});

test("움직임 줄이기는 확대·축소 없이 전환하고 분신 생성도 일시정지할 수 있다", () => {
  // Given
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const view = renderGame();
  act(() => vi.advanceTimersByTime(5500));
  const body = view.container.querySelector<HTMLElement>(".clone-magic-body")!;
  // When
  const before = body.style.cssText;
  view.rerender(<DragonScene dragon={dragon} decor={decor} catalog={[]} paused />);
  act(() => vi.advanceTimersByTime(9000));
  // Then
  expect(body.style.transform).toBe("scale(1)");
  expect(body.style.cssText).toBe(before);
  expect(view.container.querySelector<HTMLElement>(".clone-stage")!.dataset.phase).toBe("vanish");
  view.rerender(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  act(() => vi.advanceTimersByTime(900));
  expect(view.container.querySelector<HTMLElement>(".clone-stage")!.dataset.phase).toBe("observe");
});

test("일시정지는 자세와 선택을 멈추고 화면 복귀는 같은 단서부터 다시 보여준다", () => {
  // Given
  const view = renderGame();
  advanceToChoices();
  act(() => vi.advanceTimersByTime(2500));
  const before = view.container.querySelector(".clone-pose")!.getAttribute("style");
  // When
  view.rerender(<DragonScene dragon={dragon} decor={decor} catalog={[]} paused />);
  act(() => vi.advanceTimersByTime(10000));
  // Then
  expect(view.container.querySelector(".clone-pose")!.getAttribute("style")).toBe(before);
  expect((screen.getByRole("button", { name: "1번 드래곤 선택" }) as HTMLButtonElement).disabled).toBe(true);
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  hidden.mockReturnValue(false);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(view.container.querySelector<HTMLElement>(".clone-stage")!.dataset.phase).toBe("clue");
});

test("원래 장면과 배경을 유지하며 놀이를 열고 이동·날기·공격은 중지한다", () => {
  // Given
  const view = render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  const scene = screen.getByLabelText("드래곤의 공간");
  const background = view.container.querySelector(".dragon-background-art");
  // When
  fireEvent.click(screen.getByRole("button", { name: "분신 놀이" }));
  // Then
  expect(screen.getByLabelText("드래곤의 공간")).toBe(scene);
  expect(view.container.querySelector(".dragon-background-art")).toBe(background);
  expect(scene.querySelector(".clone-stage")).toBeTruthy();
  expect(scene.querySelector(".dragon-resident")).toBeNull();
  expect(screen.queryByRole("button", { name: "날기" })).toBeNull();
  expect(screen.queryByRole("button", { name: "꼬리 공격" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "놀이 끝내기" }));
  expect(screen.getByLabelText("드래곤의 공간")).toBeTruthy();
  expect(screen.getByRole("button", { name: "날기" })).toBeTruthy();
});

test("배경 위 드래곤에 키보드 초점이 있을 때 Escape로 놀이를 종료한다", () => {
  // Given
  renderGame();
  advanceToChoices();
  // When
  fireEvent.keyDown(screen.getByRole("button", { name: "1번 드래곤 선택" }), { key: "Escape" });
  // Then
  expect(screen.queryByLabelText("분신 관찰 놀이")).toBeNull();
  expect(screen.getByRole("button", { name: "분신 놀이" })).toBeTruthy();
});

test("날기와 공격 중에는 분신을 시작할 수 없고 선택·꾸미기 전환은 놀이를 종료한다", () => {
  // Given
  const view = render(<DragonScene dragon={dragon} decor={decor} catalog={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "꼬리 공격" }));
  expect((screen.getByRole("button", { name: "분신 놀이" }) as HTMLButtonElement).disabled).toBe(true);
  act(() => vi.advanceTimersByTime(3000));
  fireEvent.click(screen.getByRole("button", { name: "날기" }));
  expect((screen.getByRole("button", { name: "분신 놀이" }) as HTMLButtonElement).disabled).toBe(true);
  // When
  view.rerender(<DragonScene dragon={{ ...dragon, id: "second" }} decor={decor} catalog={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "분신 놀이" }));
  view.rerender(<DragonScene dragon={{ ...dragon, id: "third" }} decor={decor} catalog={[]} />);
  // Then
  expect(screen.queryByLabelText("분신 관찰 놀이")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "분신 놀이" }));
  view.rerender(<DragonScene dragon={dragon} decor={decor} catalog={[]} editing />);
  expect(screen.queryByLabelText("분신 관찰 놀이")).toBeNull();
});

test.each([
  { ...dragon, skills: [] }, { ...dragon, days: 0 }, { ...dragon, days: 18 },
  { ...dragon, element: null }, { ...dragon, element: "ice" as const },
])("획득하지 않았거나 지원하지 않는 $element/$days 드래곤에는 진입 버튼이 없다", entry => {
  // Given / When
  render(<DragonScene dragon={entry} decor={decor} catalog={[]} />);
  // Then
  expect(screen.queryByRole("button", { name: "분신 놀이" })).toBeNull();
});

});
