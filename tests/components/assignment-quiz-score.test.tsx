import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { AssignmentQuizScore } from "../../app/assignment-quiz-score";

test("C02-N01: 결과가 없을 때 PASS 클릭은 저장 callback에 PASS를 전달하고 선택 전 표시는 유지한다", async () => {
  // Given
  const onSave = vi.fn();
  const user = userEvent.setup();
  render(<AssignmentQuizScore assignmentId="assignment-1" score={null} onSave={onSave} />);

  // When
  await user.click(screen.getByRole("button", { name: "PASS" }));

  // Then
  expect(onSave).toHaveBeenCalledExactlyOnceWith("PASS", null);
  expect(screen.getByRole("button", { name: "FAIL" }).getAttribute("aria-pressed")).toBe("false");
  expect(screen.getByRole("button", { name: "PASS" }).getAttribute("aria-pressed")).toBe("false");
});

test("C02-N02: PASS와 FAIL은 현재 score에 맞춰 선택 표시되고 각각 저장 callback을 전달한다", async () => {
  // Given
  const onSave = vi.fn();
  const user = userEvent.setup();
  const view = render(<AssignmentQuizScore assignmentId="assignment-1" score="PASS" onSave={onSave} />);

  // When
  await user.click(screen.getByRole("button", { name: "PASS" }));
  view.rerender(<AssignmentQuizScore assignmentId="assignment-1" score="FAIL" onSave={onSave} />);
  await user.click(screen.getByRole("button", { name: "FAIL" }));

  // Then
  expect(screen.getByRole("button", { name: "FAIL" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: "PASS" }).getAttribute("aria-pressed")).toBe("false");
  expect(onSave).toHaveBeenNthCalledWith(1, "PASS", null);
  expect(onSave).toHaveBeenNthCalledWith(2, "FAIL", null);
  expect(onSave).toHaveBeenCalledTimes(2);
});

test("T01-E07: StrictMode rerender는 새 선택과 callback을 적용하고 unmount는 DOM을 제거한다", async () => {
  // Given
  const oldSave = vi.fn();
  const newSave = vi.fn();
  const user = userEvent.setup();
  const view = render(
    <StrictMode><AssignmentQuizScore assignmentId="assignment-1" score="PASS" onSave={oldSave} /></StrictMode>,
  );

  // When
  view.rerender(
    <StrictMode><AssignmentQuizScore assignmentId="assignment-2" score="FAIL" onSave={newSave} /></StrictMode>,
  );
  await user.click(screen.getByRole("button", { name: "FAIL" }));

  // Then
  expect(screen.getByRole("button", { name: "FAIL" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: "PASS" }).getAttribute("aria-pressed")).toBe("false");
  expect(newSave).toHaveBeenCalledExactlyOnceWith("FAIL", null);
  expect(oldSave).not.toHaveBeenCalled();
  view.unmount();
  expect(screen.queryByRole("group", { name: "퀴즈 결과 선택" })).toBeNull();
});

for (const points of [0, 90, 100]) {
  test(`점수 ${points}는 PASS와 함께 저장한다`, async () => {
    // Given
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<AssignmentQuizScore assignmentId="assignment-1" score={null} onSave={onSave} />);
    // When
    await user.type(screen.getByLabelText("점수"), String(points));
    await user.click(screen.getByRole("button", { name: "PASS" }));
    // Then
    expect(onSave).toHaveBeenCalledExactlyOnceWith("PASS", points);
  });
}

for (const points of [-1, 101, 90.5]) {
  test(`잘못된 점수 ${points}는 저장하지 않는다`, async () => {
    // Given
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<AssignmentQuizScore assignmentId="assignment-1" score={null} onSave={onSave} />);
    // When
    await user.type(screen.getByLabelText("점수"), String(points));
    await user.click(screen.getByRole("button", { name: "PASS" }));
    // Then
    expect(onSave).not.toHaveBeenCalled();
  });
}

test("기존 점수를 수정하고 비워 저장할 수 있다", async () => {
  // Given
  const onSave = vi.fn();
  const user = userEvent.setup();
  render(<AssignmentQuizScore assignmentId="assignment-1" score="PASS" points={90} onSave={onSave} />);
  const input = screen.getByLabelText("점수");
  expect(input).toHaveProperty("value", "90");
  // When
  await user.clear(input);
  await user.type(input, "80");
  await user.click(screen.getByRole("button", { name: "FAIL" }));
  await user.clear(input);
  await user.click(screen.getByRole("button", { name: "FAIL" }));
  // Then
  expect(onSave).toHaveBeenNthCalledWith(1, "FAIL", 80);
  expect(onSave).toHaveBeenNthCalledWith(2, "FAIL", null);
});

for (const score of [null, "PASS", "FAIL"] as const) {
  test(`점수 입력칸 Enter는 기존 결과 ${score ?? "미입력"}를 저장하거나 변경하지 않는다`, async () => {
    // Given
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<AssignmentQuizScore assignmentId="assignment-1" score={score} points={50} onSave={onSave} />);
    const input = screen.getByLabelText("점수");

    // When
    await user.clear(input);
    await user.type(input, "60{Enter}");

    // Then
    expect(onSave).not.toHaveBeenCalled();
    expect(input).toHaveProperty("value", "60");
    if (score !== null) {
      expect(screen.getByRole("button", { name: score }).getAttribute("aria-pressed")).toBe("true");
    }
  });
}

for (const [result, key] of [["PASS", "{Enter}"], ["FAIL", " "]] as const) {
  test(`결과 버튼에 초점을 두고 ${key}로 ${result}와 점수를 저장할 수 있다`, async () => {
    // Given
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<AssignmentQuizScore assignmentId="assignment-1" score={null} points={100} onSave={onSave} />);
    screen.getByRole("button", { name: result }).focus();

    // When
    await user.keyboard(key);

    // Then
    expect(onSave).toHaveBeenCalledExactlyOnceWith(result, 100);
  });
}
