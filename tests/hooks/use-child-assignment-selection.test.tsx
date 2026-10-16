import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useChildAssignmentSelection } from "../../app/use-child-assignment-selection";
import { childSelectionStorageKey } from "../../lib/child-task-policy";
import type { Assignment } from "../../lib/reading-types";

type SelectionOptions = Parameters<typeof useChildAssignmentSelection>[0];

const childId = "child-1";
const date = "2026-10-16";
const ownerUserId = "owner-1";
const storageKey = childSelectionStorageKey(ownerUserId, childId, date);

function assignment(id: string, overrides: Partial<Assignment> = {}): Assignment {
  return {
    id,
    childId,
    date,
    bookId: "book-1",
    activityCategory: "focusListen",
    tasks: ["listen"],
    taskCounts: { listen: 1 },
    quizEnabled: false,
    quizScore: null,
    ...overrides,
  };
}

function options(overrides: Partial<SelectionOptions> = {}): SelectionOptions {
  return {
    storageKey,
    dataStatus: "ready",
    childId,
    date,
    assignments: [assignment("assignment-1"), assignment("assignment-2")],
    selectedId: "",
    onSelect: vi.fn(),
    ...overrides,
  };
}

function renderSelection(initialOptions: SelectionOptions) {
  return renderHook(({ currentOptions }) => useChildAssignmentSelection(currentOptions), {
    initialProps: { currentOptions: initialOptions },
  });
}

test("H01-E01: loading 중 빈 배정은 storage를 읽거나 쓰지 않는다", () => {
  // Given
  const getItem = vi.spyOn(Storage.prototype, "getItem");
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  const loadingOptions = options({ dataStatus: "loading", assignments: [] });

  // When
  renderSelection(loadingOptions);

  // Then
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
  expect(loadingOptions.onSelect).not.toHaveBeenCalled();
});

test("H01-N01: loading에서 ready로 바뀌면 저장된 두 번째 배정을 첫 fallback보다 먼저 복원한다", () => {
  // Given
  sessionStorage.setItem(storageKey, "assignment-2");
  const onSelect = vi.fn();
  const view = renderSelection(options({ dataStatus: "loading", assignments: [], onSelect }));

  // When
  view.rerender({ currentOptions: options({ onSelect }) });

  // Then
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("assignment-2");
  expect(sessionStorage.getItem(storageKey)).toBe("assignment-2");
});

test("H01-N02: 사용자가 선택한 배정은 새 hook 인스턴스에서 fallback보다 먼저 복원한다", () => {
  // Given
  const originalOnSelect = vi.fn();
  const originalView = renderSelection(options({ selectedId: "assignment-1", onSelect: originalOnSelect }));
  originalOnSelect.mockClear();

  // When
  act(() => originalView.result.current("assignment-2"));
  originalView.unmount();
  const restoredOnSelect = vi.fn();
  renderSelection(options({ selectedId: "", onSelect: restoredOnSelect }));

  // Then
  expect(originalOnSelect).toHaveBeenCalledExactlyOnceWith("assignment-2");
  expect(sessionStorage.getItem(storageKey)).toBe("assignment-2");
  expect(restoredOnSelect).toHaveBeenCalledExactlyOnceWith("assignment-2");
});

test("H01-F01: 삭제된 저장 ID는 첫 유효 배정으로 fallback하고 그 값을 저장한다", () => {
  // Given
  sessionStorage.setItem(storageKey, "deleted-assignment");
  const onSelect = vi.fn();

  // When
  renderSelection(options({ onSelect }));

  // Then
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("assignment-1");
  expect(sessionStorage.getItem(storageKey)).toBe("assignment-1");
});

test("H03-N01: owner만 전환하면 새 owner key의 저장 선택을 복원하고 이전 key에는 쓰지 않는다", () => {
  // Given
  const nextStorageKey = childSelectionStorageKey("owner-2", childId, date);
  sessionStorage.setItem(storageKey, "assignment-2");
  sessionStorage.setItem(nextStorageKey, "assignment-1");
  const onSelect = vi.fn();
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  const view = renderSelection(options({ onSelect }));
  view.rerender({ currentOptions: options({ selectedId: "assignment-2", onSelect }) });
  onSelect.mockClear();
  setItem.mockClear();

  // When
  view.rerender({ currentOptions: options({ storageKey: nextStorageKey, selectedId: "assignment-2", onSelect }) });

  // Then
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("assignment-1");
  expect(setItem).toHaveBeenCalledExactlyOnceWith(nextStorageKey, "assignment-1");
  expect(setItem).not.toHaveBeenCalledWith(storageKey, expect.any(String));
});

test("H03-N02: 아동과 배정 fixture를 함께 전환하면 새 아동 scope의 저장 선택을 복원하고 이전 key에는 쓰지 않는다", () => {
  // Given
  const nextChildId = "child-2";
  const nextStorageKey = childSelectionStorageKey(ownerUserId, nextChildId, date);
  const nextAssignments = [assignment("child-2-assignment", { childId: nextChildId })];
  sessionStorage.setItem(nextStorageKey, "child-2-assignment");
  const onSelect = vi.fn();
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  const view = renderSelection(options({ selectedId: "assignment-1", onSelect }));
  onSelect.mockClear();
  setItem.mockClear();

  // When
  view.rerender({ currentOptions: options({ storageKey: nextStorageKey, childId: nextChildId, assignments: nextAssignments, selectedId: "assignment-1", onSelect }) });

  // Then
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("child-2-assignment");
  expect(setItem).toHaveBeenCalledExactlyOnceWith(nextStorageKey, "child-2-assignment");
  expect(setItem).not.toHaveBeenCalledWith(storageKey, expect.any(String));
});

test("H03-N03: 날짜와 배정 fixture를 함께 전환하면 새 날짜 scope의 저장 선택을 복원하고 이전 key에는 쓰지 않는다", () => {
  // Given
  const nextDate = "2026-10-17";
  const nextStorageKey = childSelectionStorageKey(ownerUserId, childId, nextDate);
  const nextAssignments = [assignment("next-date-assignment", { date: nextDate })];
  sessionStorage.setItem(nextStorageKey, "next-date-assignment");
  const onSelect = vi.fn();
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  const view = renderSelection(options({ selectedId: "assignment-1", onSelect }));
  onSelect.mockClear();
  setItem.mockClear();

  // When
  view.rerender({ currentOptions: options({ storageKey: nextStorageKey, date: nextDate, assignments: nextAssignments, selectedId: "assignment-1", onSelect }) });

  // Then
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("next-date-assignment");
  expect(setItem).toHaveBeenCalledExactlyOnceWith(nextStorageKey, "next-date-assignment");
  expect(setItem).not.toHaveBeenCalledWith(storageKey, expect.any(String));
});

test("H01-E02: 저장된 다른 아동 ID는 첫 현재 scope 배정으로 fallback한다", () => {
  // Given
  const assignments = [
    assignment("other-child", { childId: "child-2" }),
    assignment("assignment-1"),
    assignment("assignment-2"),
  ];
  sessionStorage.setItem(storageKey, "other-child");
  const onSelect = vi.fn();

  // When
  renderSelection(options({ assignments, onSelect }));

  // Then
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("assignment-1");
  expect(sessionStorage.getItem(storageKey)).toBe("assignment-1");
});

test("H01-E03: 저장된 다른 날짜 ID는 첫 현재 scope 배정으로 fallback한다", () => {
  // Given
  const assignments = [
    assignment("other-date", { date: "2026-10-15" }),
    assignment("assignment-1"),
    assignment("assignment-2"),
  ];
  sessionStorage.setItem(storageKey, "other-date");
  const onSelect = vi.fn();

  // When
  renderSelection(options({ assignments, onSelect }));

  // Then
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("assignment-1");
  expect(sessionStorage.getItem(storageKey)).toBe("assignment-1");
});

test("H01-E04: 현재 child/date scope에 유효한 배정이 없으면 선택을 비우고 storage를 덮어쓰지 않는다", () => {
  // Given
  const assignments = [assignment("other-child", { childId: "child-2" })];
  sessionStorage.setItem(storageKey, "assignment-1");
  const onSelect = vi.fn();
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  setItem.mockClear();

  // When
  renderSelection(options({ assignments, selectedId: "assignment-1", onSelect }));

  // Then
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("");
  expect(setItem).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(storageKey)).toBe("assignment-1");
});

test("H01-F02: storage 읽기 예외에도 첫 배정 fallback을 메모리에서 선택하고 예외를 전파하지 않는다", () => {
  // Given
  const onSelect = vi.fn();
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("storage read unavailable"); });

  // When
  expect(() => renderSelection(options({ onSelect }))).not.toThrow();

  // Then
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("assignment-1");
});

test("H01-F03: storage 쓰기 예외에도 사용자 선택은 메모리에 남고 예외를 전파하지 않는다", () => {
  // Given
  const onSelect = vi.fn();
  const view = renderSelection(options({ selectedId: "assignment-1", onSelect }));
  onSelect.mockClear();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("storage write unavailable"); });

  // When
  expect(() => act(() => view.result.current("assignment-2"))).not.toThrow();

  // Then
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("assignment-2");
});

test("H03-E01: null storageKey 전환은 복원 상태를 초기화하고 storage 접근을 막는다", () => {
  // Given
  sessionStorage.setItem(storageKey, "assignment-2");
  const onSelect = vi.fn();
  const getItem = vi.spyOn(Storage.prototype, "getItem");
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  const view = renderSelection(options({ onSelect }));
  sessionStorage.setItem(storageKey, "assignment-1");
  getItem.mockClear();
  setItem.mockClear();
  onSelect.mockClear();
  let storageReadsWhileDisabled = -1;
  let storageWritesWhileDisabled = -1;

  // When
  view.rerender({ currentOptions: options({ storageKey: null, selectedId: "assignment-2", onSelect }) });
  storageReadsWhileDisabled = getItem.mock.calls.length;
  storageWritesWhileDisabled = setItem.mock.calls.length;
  view.rerender({ currentOptions: options({ selectedId: "assignment-2", onSelect }) });

  // Then
  expect(storageReadsWhileDisabled).toBe(0);
  expect(storageWritesWhileDisabled).toBe(0);
  expect(getItem).toHaveBeenCalledExactlyOnceWith(storageKey);
  expect(setItem).toHaveBeenCalledExactlyOnceWith(storageKey, "assignment-1");
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("assignment-1");
});

test("H01-F04: 유효하지 않은 사용자 요청 ID는 선택이나 storage를 바꾸지 않는다", () => {
  // Given
  const onSelect = vi.fn();
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  const view = renderSelection(options({ selectedId: "assignment-1", onSelect }));
  onSelect.mockClear();
  setItem.mockClear();

  // When
  act(() => view.result.current("unknown-assignment"));

  // Then
  expect(onSelect).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
});

test.fails("H01-F05: 다른 아동 ID 직접 선택은 callback과 storage를 바꾸지 않아야 한다", () => {
  // Given
  const onSelect = vi.fn();
  sessionStorage.setItem(storageKey, "assignment-1");
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  const view = renderSelection(options({
    selectedId: "assignment-1",
    assignments: [assignment("assignment-1"), assignment("other-child", { childId: "child-2" })],
    onSelect,
  }));
  onSelect.mockClear();
  setItem.mockClear();

  // When
  act(() => view.result.current("other-child"));

  // Then
  expect(onSelect).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(storageKey)).toBe("assignment-1");
});

test.fails("H01-F06: 다른 날짜 ID 직접 선택은 callback과 storage를 바꾸지 않아야 한다", () => {
  // Given
  const onSelect = vi.fn();
  sessionStorage.setItem(storageKey, "assignment-1");
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  const view = renderSelection(options({
    selectedId: "assignment-1",
    assignments: [assignment("assignment-1"), assignment("other-date", { date: "2026-10-15" })],
    onSelect,
  }));
  onSelect.mockClear();
  setItem.mockClear();

  // When
  act(() => view.result.current("other-date"));

  // Then
  expect(onSelect).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(storageKey)).toBe("assignment-1");
});
