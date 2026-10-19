import test from "node:test";
import assert from "node:assert/strict";
import { removeAssignmentFromReadingData } from "../lib/reading-data";
import type { ReadingData } from "../lib/reading-types";

const data: ReadingData = {
  children: [],
  books: [],
  assignments: [
    {
      id: "assignment-1",
      childId: "child-1",
      date: "2026-10-18",
      bookId: "book-1",
      activityCategory: "focusListen",
      tasks: ["listen"],
      taskCounts: { listen: 1 },
      quizEnabled: false,
      quizScore: null,
    },
    {
      id: "assignment-10",
      childId: "child-1",
      date: "2026-10-19",
      bookId: "book-1",
      activityCategory: "focusListen",
      tasks: ["listen"],
      taskCounts: { listen: 1 },
      quizEnabled: false,
      quizScore: null,
    },
  ],
  completions: {
    "assignment-1:listen": { completedAt: "2026-10-18T01:00:00.000Z", minutes: 3, audioOpenedAt: null, count: 1 },
    "assignment-10:listen": { completedAt: "2026-10-19T01:00:00.000Z", minutes: 3, audioOpenedAt: null, count: 1 },
  },
  audioLaunches: {
    "assignment-1:listen": { openedAt: "2026-10-18T00:55:00.000Z", returnedAt: null },
    "assignment-10:listen": { openedAt: "2026-10-19T00:55:00.000Z", returnedAt: null },
  },
  manualLogs: [],
};

test("정상 입력: 배정을 삭제하면 해당 완료와 오디오 cache만 제거하고 입력을 바꾸지 않는다", () => {
  // Given
  const original = structuredClone(data);

  // When
  const actual = removeAssignmentFromReadingData(data, "assignment-1");

  // Then
  assert.deepEqual(actual.assignments.map((assignment) => assignment.id), ["assignment-10"]);
  assert.deepEqual(actual.completions, { "assignment-10:listen": data.completions["assignment-10:listen"] });
  assert.deepEqual(actual.audioLaunches, { "assignment-10:listen": data.audioLaunches["assignment-10:listen"] });
  assert.deepEqual(data, original);
});

test("경계값: 접두사가 이웃한 배정 ID의 cache는 삭제하지 않는다", () => {
  // Given
  const input: ReadingData = {
    ...data,
    assignments: data.assignments.slice(0, 1),
  };

  // When
  const actual = removeAssignmentFromReadingData(input, "assignment-1");

  // Then
  assert.deepEqual(actual.completions, { "assignment-10:listen": data.completions["assignment-10:listen"] });
  assert.deepEqual(actual.audioLaunches, { "assignment-10:listen": data.audioLaunches["assignment-10:listen"] });
});

test("경계값: cache가 없는 배정도 다른 데이터를 보존한 채 삭제한다", () => {
  // Given
  const input: ReadingData = {
    ...data,
    completions: {},
    audioLaunches: {},
  };

  // When
  const actual = removeAssignmentFromReadingData(input, "assignment-1");

  // Then
  assert.deepEqual(actual.assignments.map((assignment) => assignment.id), ["assignment-10"]);
  assert.deepEqual(actual.completions, {});
  assert.deepEqual(actual.audioLaunches, {});
});

test("잘못된 입력: 알 수 없는 배정 ID는 모든 데이터를 보존한다", () => {
  // Given
  const original = structuredClone(data);

  // When
  const actual = removeAssignmentFromReadingData(data, "missing-assignment");

  // Then
  assert.deepEqual(actual, data);
  assert.deepEqual(data, original);
});

test("잘못된 입력: 빈 배정 ID는 모든 데이터를 보존한다", () => {
  // Given
  const original = structuredClone(data);

  // When
  const actual = removeAssignmentFromReadingData(data, "");

  // Then
  assert.deepEqual(actual, data);
  assert.deepEqual(data, original);
});
