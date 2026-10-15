import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { AssignmentBookPicker } from "../../app/assignment-book-picker";
import type { Book } from "../../lib/reading-types";

const regularBook: Book = {
  id: "book-regular", active: true, contentType: "book", title: "The Big Tree", series: "Tree Tales", volume: "1", level: "A", cover: "/cover.png",
  audio: { listen: "https://audio.invalid/listen", shadow: "https://audio.invalid/shadow" }, note: "",
};
const wordBook: Book = {
  id: "book-word", active: true, contentType: "wordReading", title: "Word Cards", series: "Words", volume: "2", level: "B", cover: "",
  audio: { listen: "https://audio.invalid/words", shadow: "" }, note: "",
};

function renderPicker(overrides: Partial<React.ComponentProps<typeof AssignmentBookPicker>> = {}) {
  const callbacks = {
    onSeriesFilterChange: vi.fn(), onSearchChange: vi.fn(), onAdd: vi.fn(), onRemove: vi.fn(),
  };
  return {
    callbacks,
    ...render(
      <AssignmentBookPicker
        candidates={[regularBook]}
        selectedBooks={[]}
        assignedBookIds={new Set<string>()}
        seriesNames={["Tree Tales", "Words"]}
        seriesFilter="all"
        search=""
        childName="민준"
        {...callbacks}
        {...overrides}
      />,
    ),
  };
}

test("C01-N01: 시리즈·검색·후보 추가는 각각의 callback과 배정 이력 표시를 전달한다", async () => {
  // Given
  const user = userEvent.setup();
  const { callbacks } = renderPicker({ assignedBookIds: new Set([regularBook.id]) });

  // When
  await user.selectOptions(screen.getByRole("combobox", { name: "배정 시리즈 선택" }), "Tree Tales");
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Big" } });
  await user.click(screen.getByRole("button", { name: "추가" }));

  // Then
  expect(callbacks.onSeriesFilterChange).toHaveBeenCalledExactlyOnceWith("Tree Tales");
  expect(callbacks.onSearchChange).toHaveBeenCalledExactlyOnceWith("Big");
  expect(callbacks.onAdd).toHaveBeenCalledExactlyOnceWith(regularBook.id);
  expect(screen.getByText("배정 이력 있음")).not.toBeNull();
});

test("C01-E01: 후보와 선택 자료가 비면 각각의 안내를 표시한다", () => {
  // Given
  // When
  renderPicker({ candidates: [] });

  // Then
  expect(screen.getByText("아직 배정하지 않은 책/자료가 없습니다.")).not.toBeNull();
  expect(screen.getByText("위 목록에서 배정할 책/자료를 추가하세요.")).not.toBeNull();
});

test("D06-N02: 일반 책은 허용 활동과 그림책 읽기 기본 횟수·퀴즈를 표시한다", async () => {
  // Given
  const user = userEvent.setup();
  renderPicker({ candidates: [], selectedBooks: [regularBook] });
  const category = screen.getByRole<HTMLSelectElement>("combobox", { name: "활동 구분" });

  // When
  await user.selectOptions(category, "englishPicture");

  // Then
  expect([...category.options].map((option) => option.value)).toEqual(["", "focusListen", "readAloud", "englishPicture", "extraStudy"]);
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "읽기" }).name).toBe("assignCount:book-regular:listen");
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "읽기" }).value).toBe("1");
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "퀴즈" }).name).toBe("assignQuiz:book-regular");
});

test("D06-E02: 활동을 기타학습으로 바꾸면 이전 활동의 task와 퀴즈 control을 제거하고 필사 1회를 기본값으로 둔다", async () => {
  // Given
  const user = userEvent.setup();
  renderPicker({ candidates: [], selectedBooks: [regularBook] });
  const category = screen.getByRole("combobox", { name: "활동 구분" });
  await user.selectOptions(category, "englishPicture");

  // When
  await user.selectOptions(category, "extraStudy");

  // Then
  expect(screen.queryByRole("combobox", { name: "읽기" })).toBeNull();
  expect(screen.queryByRole("combobox", { name: "퀴즈" })).toBeNull();
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "필사" }).name).toBe("assignCount:book-regular:copywork");
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "필사" }).value).toBe("1");
});

test("D06-N03: 단어 읽기 자료는 기타학습과 단어 읽기 1회만 허용하고 퀴즈를 표시하지 않는다", () => {
  // Given
  // When
  renderPicker({ candidates: [], selectedBooks: [wordBook] });

  // Then
  const category = screen.getByRole<HTMLSelectElement>("combobox", { name: "활동 구분" });
  expect(category.value).toBe("extraStudy");
  expect([...category.options].map((option) => option.value)).toEqual(["extraStudy"]);
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "단어 읽기" }).name).toBe("assignCount:book-word:wordRead");
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "단어 읽기" }).value).toBe("1");
  expect(screen.queryByRole("combobox", { name: "퀴즈" })).toBeNull();
});

test("C01-E02: 선택 해제 뒤 같은 일반 책을 다시 추가하면 활동 선택을 초기화한다", async () => {
  // Given
  const user = userEvent.setup();
  const { callbacks, rerender } = renderPicker({ candidates: [], selectedBooks: [regularBook] });
  const category = screen.getByRole<HTMLSelectElement>("combobox", { name: "활동 구분" });
  await user.selectOptions(category, "englishPicture");
  await user.click(screen.getByRole("button", { name: "선택 해제" }));

  // When
  rerender(
    <AssignmentBookPicker candidates={[]} selectedBooks={[]} assignedBookIds={new Set()} seriesNames={[]} seriesFilter="all" search="" childName="민준" {...callbacks} />,
  );
  rerender(
    <AssignmentBookPicker candidates={[]} selectedBooks={[regularBook]} assignedBookIds={new Set()} seriesNames={[]} seriesFilter="all" search="" childName="민준" {...callbacks} />,
  );

  // Then
  expect(callbacks.onRemove).toHaveBeenCalledExactlyOnceWith(regularBook.id);
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "활동 구분" }).value).toBe("");
  expect(screen.queryByRole("combobox", { name: "읽기" })).toBeNull();
});
