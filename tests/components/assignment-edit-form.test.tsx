import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { AssignmentEditForm } from "../../app/assignment-edit-form";
import type { Assignment, Book } from "../../lib/reading-types";

const regularBook: Pick<Book, "contentType"> = { contentType: "book" };
const wordBook: Pick<Book, "contentType"> = { contentType: "wordReading" };
const assignment: Assignment = {
  id: "assignment-1", childId: "child-1", date: "2026-10-15", bookId: "book-1", activityCategory: "focusListen",
  tasks: ["listen", "self"], taskCounts: { listen: 2, self: 3 }, quizEnabled: true, quizScore: null,
};

test("C01-N02: 기존 횟수와 퀴즈 값은 이름 있는 form control에 표시된다", () => {
  // Given
  // When
  render(<AssignmentEditForm assignment={assignment} book={regularBook} onCancel={vi.fn()} onSubmit={vi.fn()} />);

  // Then
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "읽기" })).toHaveProperty("name", "assignmentCount:assignment-1:listen");
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "읽기" }).value).toBe("2");
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "스스로 읽기" }).value).toBe("3");
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "퀴즈" }).value).toBe("Y");
});

test("C01-N03: 변경한 form 값으로 저장하면 원래 assignment와 submit event를 callback에 전달한다", async () => {
  // Given
  let submittedData: Record<string, FormDataEntryValue> | undefined;
  const onSubmit = vi.fn((_assignment: Assignment, event: React.FormEvent<HTMLFormElement>) => {
    submittedData = Object.fromEntries(new FormData(event.currentTarget));
  });
  const user = userEvent.setup();
  render(<AssignmentEditForm assignment={assignment} book={regularBook} onCancel={vi.fn()} onSubmit={onSubmit} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "읽기" }), "1");
  await user.selectOptions(screen.getByRole("combobox", { name: "퀴즈" }), "N");

  // When
  await user.click(screen.getByRole("button", { name: "횟수 저장" }));

  // Then
  expect(onSubmit).toHaveBeenCalledTimes(1);
  const [submittedAssignment] = onSubmit.mock.calls[0];
  expect(submittedAssignment).toBe(assignment);
  expect(submittedData).toEqual({
    "assignmentCount:assignment-1:listen": "1", "assignmentCount:assignment-1:self": "3", "assignmentQuiz:assignment-1": "N",
  });
});

test("C01-N04: 취소는 저장 없이 cancel callback만 호출한다", async () => {
  // Given
  const onCancel = vi.fn();
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(<AssignmentEditForm assignment={assignment} book={regularBook} onCancel={onCancel} onSubmit={onSubmit} />);

  // When
  await user.click(screen.getByRole("button", { name: "취소" }));

  // Then
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onSubmit).not.toHaveBeenCalled();
});

test("C01-E03: 빈 영어 그림책 일반 책 배정은 읽기 fallback 횟수와 퀴즈 값을 표시한다", () => {
  // Given
  const emptyQuizAssignment: Assignment = {
    ...assignment,
    activityCategory: "englishPicture",
    tasks: [],
    taskCounts: {},
    quizEnabled: true,
  };

  // When
  render(<AssignmentEditForm assignment={emptyQuizAssignment} book={regularBook} onCancel={vi.fn()} onSubmit={vi.fn()} />);

  // Then
  const listenControl = screen.getByRole<HTMLSelectElement>("combobox", { name: "읽기" });
  expect(listenControl.name).toBe("assignmentCount:assignment-1:listen");
  expect(listenControl.value).toBe("0");
  const quizControl = screen.getByRole<HTMLSelectElement>("combobox", { name: "퀴즈" });
  expect(quizControl.name).toBe("assignmentQuiz:assignment-1");
  expect(quizControl.value).toBe("Y");
});

test("D06-E03: 빈 기타학습 배정은 필사 fallback을 표시하고 퀴즈를 숨긴다", () => {
  // Given
  const emptyCopyworkAssignment: Assignment = { ...assignment, activityCategory: "extraStudy", tasks: [], taskCounts: {}, quizEnabled: false };

  // When
  render(<AssignmentEditForm assignment={emptyCopyworkAssignment} book={regularBook} onCancel={vi.fn()} onSubmit={vi.fn()} />);

  // Then
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "필사" }).value).toBe("0");
  expect(screen.queryByRole("combobox", { name: "퀴즈" })).toBeNull();
});

test("D06-E04: 빈 단어 읽기 배정은 단어 읽기 fallback을 표시하고 퀴즈를 숨긴다", () => {
  // Given
  const emptyWordAssignment: Assignment = { ...assignment, activityCategory: "extraStudy", tasks: [], taskCounts: {}, quizEnabled: false };

  // When
  render(<AssignmentEditForm assignment={emptyWordAssignment} book={wordBook} onCancel={vi.fn()} onSubmit={vi.fn()} />);

  // Then
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "단어 읽기" }).value).toBe("0");
  expect(screen.queryByRole("combobox", { name: "퀴즈" })).toBeNull();
});
