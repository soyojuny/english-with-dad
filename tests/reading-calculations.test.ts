import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAssignmentActivityLogs,
  countAssignmentProgress,
  datesInRange,
  formatAssignmentTaskLabels,
  formatDate,
  formatTaskSummary,
  getAssignmentBookCandidates,
  getAvailableActivityCategories,
  getAssignmentTaskCount,
  getBookSetupIssues,
  getCompletionCount,
  getDefaultTasksForMaterial,
  getLaunchMinutes,
  getTaskAudioUrl,
  getUpcomingAssignments,
  hasCustomCover,
  isValidExternalUrl,
  normalizeText,
  sortTasks,
} from "../lib/reading-calculations";
import { emptyReadingData } from "../lib/reading-data";
import {
  formatPeriodRangeLabel,
  getPeriodDateRange,
  shiftSelectedDateKey,
} from "../lib/reading-period";
import type { Assignment, Book, ReadingData } from "../lib/reading-types";

const assignment: Assignment = {
  id: "assignment-1",
  childId: "child-1",
  date: "2026-06-10",
  bookId: "book-1",
  activityCategory: "focusListen",
  tasks: ["listen", "shadow", "self"],
  taskCounts: { listen: 2, shadow: 1, self: 1 },
  quizScore: null,
};

const candidateBooks: Book[] = ["처음 책", "다시 읽을 책", "선택한 책"].map((title, index) => ({
  id: `book-${index + 1}`,
  active: true,
  contentType: "book",
  title,
  series: index === 1 ? "반복 시리즈" : "기본 시리즈",
  volume: `${index + 1}`,
  level: "1단계",
  cover: "",
  audio: { listen: "", shadow: "" },
  note: "",
}));

test("datesInRange returns inclusive date keys", () => {
  assert.deepEqual(datesInRange("2026-06-10", "2026-06-12"), [
    "2026-06-10",
    "2026-06-11",
    "2026-06-12",
  ]);
});

test("datesInRange returns an empty array when the range is inverted", () => {
  assert.deepEqual(datesInRange("2026-06-12", "2026-06-10"), []);
});

test("formatDate displays compact month and day", () => {
  assert.equal(formatDate("2026-06-10"), "6/10");
});

test("activity periods support weekly default navigation and monthly views", () => {
  assert.deepEqual(getPeriodDateRange("week", "2026-06-10"), {
    startKey: "2026-06-07",
    endKey: "2026-06-13",
  });
  assert.equal(shiftSelectedDateKey("2026-06-10", "week", 1), "2026-06-17");
  assert.deepEqual(getPeriodDateRange("month", "2026-06-10"), {
    startKey: "2026-06-01",
    endKey: "2026-06-30",
  });
  assert.equal(formatPeriodRangeLabel("month", ["2026-06-01", "2026-06-30"]), "2026. 6");
});

test("normalizeText trims, folds spaces, and lowercases", () => {
  assert.equal(normalizeText("  Bear   Says   Thanks  "), "bear says thanks");
});

test("assignment candidates show only unassigned books until a search includes assignment history", () => {
  assert.deepEqual(
    getAssignmentBookCandidates({
      books: candidateBooks,
      selectedBookIds: ["book-3"],
      assignedBookIds: ["book-2"],
      seriesFilter: "all",
      search: "",
    }).map((book) => book.id),
    ["book-1"],
  );

  assert.deepEqual(
    getAssignmentBookCandidates({
      books: candidateBooks,
      selectedBookIds: ["book-3"],
      assignedBookIds: ["book-2"],
      seriesFilter: "all",
      search: "다시 읽을",
    }).map((book) => book.id),
    ["book-2"],
  );
});

test("upcoming assignments include today and all future dates for the selected child", () => {
  const assignments: Assignment[] = [
    { ...assignment, id: "past", date: "2026-06-20" },
    { ...assignment, id: "today", date: "2026-06-21" },
    { ...assignment, id: "future", date: "2026-07-01" },
    { ...assignment, id: "other-child", childId: "child-2", date: "2026-06-22" },
  ];

  assert.deepEqual(
    getUpcomingAssignments(assignments, "child-1", "2026-06-21").map((item) => item.id),
    ["today", "future"],
  );
});

test("quiz scores become book activity logs without requiring a task completion", () => {
  const data: ReadingData = {
    ...emptyReadingData,
    books: candidateBooks,
    assignments: [{ ...assignment, bookId: "book-1", quizScore: 80 }],
  };

  assert.deepEqual(buildAssignmentActivityLogs(data), [
    {
      id: "assignment-1:quiz",
      childId: "child-1",
      date: "2026-06-10",
      type: "quiz",
      activityCategory: "focusListen",
      bookId: "book-1",
      title: "처음 책",
      minutes: 0,
      note: "",
      count: 1,
      quizScore: 80,
    },
  ]);
});

test("cover and book setup issue helpers identify missing setup", () => {
  assert.equal(hasCustomCover("/assets/app-icon.svg"), false);
  assert.equal(hasCustomCover("data:image/png;base64,abc"), true);
  assert.deepEqual(
    getBookSetupIssues({
      cover: "/assets/app-icon.svg",
      audio: { listen: "", shadow: "https://example.com/shadow" },
    }),
    ["표지", "읽기 링크"],
  );
  assert.deepEqual(
    getBookSetupIssues({
      contentType: "wordReading",
      cover: "",
      audio: { listen: "", shadow: "" },
    }),
    ["단어 읽기 링크"],
  );
  assert.deepEqual(
    getBookSetupIssues({
      contentType: "wordReading",
      cover: "",
      audio: { listen: "https://example.com/word", shadow: "" },
    }),
    [],
  );
});

test("isValidExternalUrl allows empty, http, and https values only", () => {
  assert.equal(isValidExternalUrl(""), true);
  assert.equal(isValidExternalUrl("https://example.com/audio"), true);
  assert.equal(isValidExternalUrl("http://example.com/audio"), true);
  assert.equal(isValidExternalUrl("ftp://example.com/audio"), false);
  assert.equal(isValidExternalUrl("not a url"), false);
});

test("task counts fall back to legacy task presence", () => {
  assert.equal(getAssignmentTaskCount(assignment, "listen"), 2);
  assert.equal(getAssignmentTaskCount({ ...assignment, taskCounts: {} }, "shadow"), 1);
  assert.equal(getAssignmentTaskCount({ ...assignment, tasks: ["listen"], taskCounts: {} }, "self"), 0);
});

test("completion count and progress cap completed repetitions at target count", () => {
  const data: ReadingData = {
    ...emptyReadingData,
    completions: {
      "assignment-1:listen": {
        completedAt: "2026-06-10T10:00:00.000Z",
        minutes: 10,
        audioOpenedAt: null,
        count: 3,
      },
      "assignment-1:shadow": {
        completedAt: "2026-06-10T10:05:00.000Z",
        minutes: 10,
        audioOpenedAt: null,
        count: 1,
      },
    },
  };

  assert.equal(getCompletionCount(data, "assignment-1", "listen"), 3);
  assert.deepEqual(countAssignmentProgress(data, assignment), { done: 3, total: 4, percent: 75 });
});

test("task formatting follows canonical task order", () => {
  assert.deepEqual(sortTasks(["wordRead", "self", "listen", "shadow"]), ["listen", "shadow", "self", "wordRead"]);
  assert.equal(formatTaskSummary(["self", "listen"], { self: 2, listen: 1 }), "읽기 1회 · 스스로 읽기 2회");
  assert.equal(formatAssignmentTaskLabels(assignment), "집중듣기 · 읽기 2회 · 정따 1회 · 스스로 읽기 1회");
  assert.equal(
    formatAssignmentTaskLabels({
      activityCategory: "extraStudy",
      tasks: ["wordRead"],
      taskCounts: { wordRead: 1 },
    }),
    "기타학습 · 단어 읽기 1회",
  );
});

test("word reading materials use extra study assignment defaults and the listen URL", () => {
  const wordReading = {
    contentType: "wordReading" as const,
    audio: { listen: "https://example.com/word", shadow: "" },
  };
  assert.deepEqual(getAvailableActivityCategories(wordReading), ["extraStudy"]);
  assert.deepEqual(getDefaultTasksForMaterial(wordReading), ["wordRead"]);
  assert.equal(getTaskAudioUrl(wordReading, "wordRead"), "https://example.com/word");
  assert.equal(getTaskAudioUrl({ contentType: "book", audio: wordReading.audio }, "wordRead"), "");
});

test("getLaunchMinutes uses rounded elapsed minutes and falls back for invalid launches", () => {
  assert.equal(
    getLaunchMinutes(
      {
        openedAt: "2026-06-10T10:00:00.000Z",
        returnedAt: "2026-06-10T10:02:01.000Z",
      },
      10,
    ),
    3,
  );
  assert.equal(getLaunchMinutes({ openedAt: "bad", returnedAt: "2026-06-10T10:00:00.000Z" }, 10), 10);
  assert.equal(getLaunchMinutes({ openedAt: "2026-06-10T10:00:00.000Z", returnedAt: null }, 10), 10);
});
