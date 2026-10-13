import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { AssignmentQuizScore } from "../../app/assignment-quiz-score";

test("C02-N01: 결과가 없을 때 PASS 클릭은 저장 callback에 PASS를 전달한다", async () => {
  // Given
  const onSave = vi.fn();
  const user = userEvent.setup();
  render(<AssignmentQuizScore assignmentId="assignment-1" score={null} onSave={onSave} />);

  // When
  await user.click(screen.getByRole("button", { name: "PASS" }));

  // Then
  expect(onSave).toHaveBeenCalledExactlyOnceWith("PASS");
  expect(screen.getByRole("button", { name: "PASS" }).classList.contains("secondary-button")).toBe(true);
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
  expect(screen.getByRole("button", { name: "FAIL" }).classList.contains("primary-button")).toBe(true);
  expect(screen.getByRole("button", { name: "PASS" }).classList.contains("secondary-button")).toBe(true);
  expect(newSave).toHaveBeenCalledExactlyOnceWith("FAIL");
  expect(oldSave).not.toHaveBeenCalled();
  view.unmount();
  expect(screen.queryByRole("group", { name: "퀴즈 결과 선택" })).toBeNull();
});
