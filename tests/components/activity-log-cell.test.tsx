import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { ActivityLogCell } from "../../app/activity-log-cell";
import type { ActivityLog, Book, ManualLog } from "../../lib/reading-types";

const book: Book = {
  id: "book-1", active: true, contentType: "book", title: "The Moon", series: "Oxford Reading Tree", volume: "3", level: "A",
  cover: "/cover.jpg", audio: { listen: "", shadow: "" }, note: "",
};

function automaticLog(overrides: Partial<ActivityLog> = {}): ActivityLog {
  return { id: "auto-1", childId: "child-1", date: "2026-10-16", type: "listen", activityCategory: "focusListen", bookId: "book-1", title: "The Moon", minutes: 5, note: "집중", count: 1, ...overrides };
}

const manualLog: ManualLog = { id: "manual-1", childId: "child-1", date: "2026-10-16", type: "dvd", title: "영화", minutes: 20, note: "가족", count: 1 };

function renderCell(overrides: Partial<React.ComponentProps<typeof ActivityLogCell>> = {}) {
  const onDeleteManualLog = vi.fn();
  render(
    <ActivityLogCell
      logs={[]} matcher={{ types: "listen" }} manualLogIds={new Set()} getBook={(id) => id === book.id ? book : undefined}
      onDeleteManualLog={onDeleteManualLog} {...overrides}
    />,
  );
  return onDeleteManualLog;
}

test("C04-E01: matcher에 맞는 활동 기록이 없으면 대시만 표시한다", () => {
  // Given
  const props = { logs: [automaticLog({ type: "shadow" })] };

  // When
  renderCell(props);

  // Then
  expect(screen.getByText("-").classList.contains("task-meta")).toBe(true);
});

test("C04-N01: type 또는 활동 분류 matcher에 맞는 기록만 표시한다", () => {
  // Given
  const props: Partial<React.ComponentProps<typeof ActivityLogCell>> = {
    logs: [automaticLog({ id: "listen", title: "읽기 기록" }), automaticLog({ id: "picture", type: "englishPicture", activityCategory: "englishPicture", title: "그림책 기록" }), automaticLog({ id: "excluded", type: "copywork", activityCategory: "extraStudy", title: "제외 기록" })],
    matcher: { types: "listen", activityCategories: "englishPicture" },
  };

  // When
  renderCell(props);

  // Then
  expect(screen.getByText("읽기 기록").textContent).toContain("읽기 기록");
  expect(screen.getByText("그림책 기록").textContent).toContain("그림책 기록");
  expect(screen.queryByText("제외 기록")).toBeNull();
});

test("C04-N02: 자동 기록은 같은 분류와 제목으로 묶어 횟수·시간과 중복 없는 메모를 합산한다", () => {
  // Given
  const props: Partial<React.ComponentProps<typeof ActivityLogCell>> = {
    logs: [
      automaticLog({ id: "first", minutes: 5, count: 1, note: "첫 메모" }),
      automaticLog({ id: "second", minutes: 10, count: 2, note: "첫 메모" }),
      automaticLog({ id: "third", minutes: 7, count: 1, note: "둘째 메모" }),
    ],
  };

  // When
  renderCell(props);

  // Then
  expect(screen.getByText("4회 · 22분 · 첫 메모, 둘째 메모").textContent).toBe("4회 · 22분 · 첫 메모, 둘째 메모");
  expect(screen.getAllByText("The Moon")).toHaveLength(1);
});

test("C04-N05: 일반 요약은 제목이 같아도 활동 분류가 다르면 따로 표시한다", () => {
  // Given
  const props: Partial<React.ComponentProps<typeof ActivityLogCell>> = {
    logs: [
      automaticLog({ id: "normal-category-listen", title: "같은 제목", minutes: 5, count: 1, activityCategory: "focusListen" }),
      automaticLog({ id: "normal-category-picture", title: "같은 제목", minutes: 10, count: 2, type: "englishPicture", activityCategory: "englishPicture" }),
    ],
    matcher: { activityCategories: ["focusListen", "englishPicture"] },
  };

  // When
  renderCell(props);

  // Then
  expect(screen.getAllByText("같은 제목")).toHaveLength(2);
});

test("D08-N02: 책 요약은 시리즈·과제 횟수·분·퀴즈 결과를 자동 기록별로 합산한다", () => {
  // Given
  const props: Partial<React.ComponentProps<typeof ActivityLogCell>> = {
    logs: [
      automaticLog({ id: "listen", type: "listen", minutes: 10, count: 2 }),
      automaticLog({ id: "shadow", type: "shadow", minutes: 10, count: 1 }),
      automaticLog({ id: "quiz", type: "quiz", minutes: 0, count: 1, quizScore: "FAIL" }),
    ],
    matcher: { types: ["listen", "shadow", "quiz"], bookSummary: true },
  };

  // When
  renderCell(props);

  // Then
  expect(screen.getByText("Oxford Reading Tree").textContent).toBe("Oxford Reading Tree");
  expect(screen.getByText("The Moon").textContent).toContain("The Moon");
  expect(screen.getByText("읽기 2회, 정따 1회 (20분) 퀴즈 (FAIL)").textContent).toBe("읽기 2회, 정따 1회 (20분) 퀴즈 (FAIL)");
});

test("D08-N03: 책 요약은 시리즈가 같아도 제목이 다르면 따로 표시한다", () => {
  // Given
  const props: Partial<React.ComponentProps<typeof ActivityLogCell>> = {
    logs: [
      automaticLog({ id: "book-title-moon", title: "The Moon", minutes: 5, count: 1 }),
      automaticLog({ id: "book-title-sun", title: "The Sun", minutes: 10, count: 2 }),
    ],
    matcher: { types: "listen", bookSummary: true },
  };

  // When
  renderCell(props);

  // Then
  expect(screen.getAllByText("Oxford Reading Tree")).toHaveLength(2);
  expect(screen.getByText("The Moon").textContent).toContain("The Moon");
  expect(screen.getByText("The Sun").textContent).toContain("The Sun");
  expect(screen.getByText("읽기 1회 (5분)").textContent).toBe("읽기 1회 (5분)");
  expect(screen.getByText("읽기 2회 (10분)").textContent).toBe("읽기 2회 (10분)");
});

test("D08-E02: 책 ID가 없는 직접 입력 자동 기록은 직접 입력 시리즈로 요약한다", () => {
  // Given
  const props: Partial<React.ComponentProps<typeof ActivityLogCell>> = {
    logs: [automaticLog({ bookId: undefined, title: "직접 적은 자료", type: "copywork", minutes: 5 })],
    matcher: { types: "copywork", bookSummary: true },
  };

  // When
  renderCell(props);

  // Then
  expect(screen.getByText("직접 입력").textContent).toBe("직접 입력");
  expect(screen.getByText("직접 적은 자료").textContent).toContain("직접 적은 자료");
  expect(screen.getByText("필사 1회 (5분)").textContent).toBe("필사 1회 (5분)");
});

test("C04-F01: 혼합 기록에서 삭제는 manualLogIds에 있는 수동 기록만 callback에 전달한다", async () => {
  // Given
  const onDeleteManualLog = renderCell({
    logs: [manualLog, automaticLog({ id: "auto-2", title: "자동 기록" })],
    matcher: { types: ["dvd", "listen"] },
    manualLogIds: new Set([manualLog.id]),
  });
  const user = userEvent.setup();

  // When
  await user.click(screen.getByRole("button", { name: "삭제" }));

  // Then
  expect(screen.getAllByRole("button", { name: "삭제" })).toHaveLength(1);
  expect(onDeleteManualLog).toHaveBeenCalledExactlyOnceWith(manualLog);
});
