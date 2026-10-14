import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAssignmentTaskCounts,
  buildAssignmentActivityLogs,
  countAssignmentProgress,
  datesInRange,
  formatAssignmentTaskLabels,
  formatDate,
  formatTaskSummary,
  getActivityTasksForMaterial,
  getAssignmentBookCandidates,
  getAvailableActivityCategories,
  getAssignmentTaskCount,
  getBookSetupIssues,
  getCompletionCount,
  getDefaultTasksForMaterial,
  getEditableTasksForAssignment,
  getLaunchMinutes,
  getTaskAudioUrl,
  getUpcomingAssignments,
  hasCustomCover,
  isWordReadingMaterial,
  isValidExternalUrl,
  normalizeText,
  sortTasks,
} from "../lib/reading-calculations";
import { emptyReadingData } from "../lib/reading-data";
import type { Assignment, Book, ReadingData, TaskType } from "../lib/reading-types";

const assignment: Assignment = {
  id: "assignment-1",
  childId: "child-1",
  date: "2026-06-10",
  bookId: "book-1",
  activityCategory: "focusListen",
  tasks: ["listen", "shadow", "self"],
  taskCounts: { listen: 2, shadow: 1, self: 1 },
  quizEnabled: false,
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

const wordReadingBook: Book = {
  id: "word-book-1",
  active: true,
  contentType: "wordReading",
  title: "단어 카드",
  series: "단어 시리즈",
  volume: "1",
  level: "1단계",
  cover: "",
  audio: { listen: "", shadow: "" },
  note: "",
};

test("정상 입력: datesInRange는 시작일과 종료일을 모두 포함한다", () => {
  // Given
  const startDate = "2026-06-10";
  const endDate = "2026-06-12";

  // When
  const actual = datesInRange(startDate, endDate);

  // Then
  assert.deepEqual(actual, [
    "2026-06-10",
    "2026-06-11",
    "2026-06-12",
  ]);
});

test("경계값: datesInRange는 윤년 2월 29일 한 날짜 범위를 포함한다", () => {
  // Given
  const date = "2024-02-29";

  // When
  const actual = datesInRange(date, date);

  // Then
  assert.deepEqual(actual, ["2024-02-29"]);
});

test("잘못된 범위: datesInRange는 실제 배정 폼에서 가능한 역전 범위에 빈 목록을 반환한다", () => {
  // Given
  const startDate = "2026-06-12";
  const endDate = "2026-06-10";

  // When
  const actual = datesInRange(startDate, endDate);

  // Then
  assert.deepEqual(actual, []);
});

test("정상 입력: formatDate는 월/일을 간결하게 표시한다", () => {
  // Given
  const date = "2026-06-10";

  // When
  const actual = formatDate(date);

  // Then
  assert.equal(actual, "6/10");
});

test("경계값: normalizeText는 공백을 접고 대소문자를 구분하지 않는다", () => {
  // Given
  const value = "  Bear   Says   Thanks  ";

  // When
  const actual = normalizeText(value);

  // Then
  assert.equal(actual, "bear says thanks");
});

test("정상 입력: 배정 후보는 검색할 때만 배정 이력을 포함하고 시리즈와 정규화된 제목을 적용한다", () => {
  // Given
  const input = {
    books: candidateBooks,
    selectedBookIds: ["book-3"],
    assignedBookIds: ["book-2"],
    seriesFilter: "반복 시리즈",
    search: "  다시   읽을 ",
  };

  // When
  const actual = getAssignmentBookCandidates(input).map((book) => book.id);

  // Then
  assert.deepEqual(actual, ["book-2"]);
});

test("경계값: 배정 후보는 무검색 10개와 검색 20개 상한을 최근 자료 순으로 적용하고 입력을 바꾸지 않는다", () => {
  // Given
  const books = Array.from({ length: 22 }, (_, index): Book => ({
    ...candidateBooks[0],
    id: `candidate-${index + 1}`,
    title: `Story ${index + 1}`,
    series: index < 21 ? "Series A" : "Series B",
  }));
  const selectedBookIds = new Set(["candidate-22"]);
  const assignedBookIds = new Set(["candidate-21"]);
  const originalBookIds = books.map((book) => book.id);
  const originalSelectedIds = [...selectedBookIds];
  const originalAssignedIds = [...assignedBookIds];

  // When
  const withoutSearch = getAssignmentBookCandidates({
    books,
    selectedBookIds,
    assignedBookIds,
    seriesFilter: "all",
    search: "",
  });
  const withSearch = getAssignmentBookCandidates({
    books,
    selectedBookIds,
    assignedBookIds,
    seriesFilter: "Series A",
    search: "story",
  });

  // Then
  assert.deepEqual(withoutSearch.map((book) => book.id), [
    "candidate-20", "candidate-19", "candidate-18", "candidate-17", "candidate-16",
    "candidate-15", "candidate-14", "candidate-13", "candidate-12", "candidate-11",
  ]);
  assert.deepEqual(withSearch.map((book) => book.id), [
    "candidate-21", "candidate-20", "candidate-19", "candidate-18", "candidate-17",
    "candidate-16", "candidate-15", "candidate-14", "candidate-13", "candidate-12",
    "candidate-11", "candidate-10", "candidate-9", "candidate-8", "candidate-7",
    "candidate-6", "candidate-5", "candidate-4", "candidate-3", "candidate-2",
  ]);
  assert.deepEqual(books.map((book) => book.id), originalBookIds);
  assert.deepEqual([...selectedBookIds], originalSelectedIds);
  assert.deepEqual([...assignedBookIds], originalAssignedIds);
});

test("경계값: 예정 배정은 선택한 아동의 오늘과 미래만 날짜순으로 반환하고 입력을 바꾸지 않는다", () => {
  // Given
  const assignments: Assignment[] = [
    { ...assignment, id: "past", date: "2026-06-20" },
    { ...assignment, id: "future", date: "2026-07-01" },
    { ...assignment, id: "today", date: "2026-06-21" },
    { ...assignment, id: "other-child", childId: "child-2", date: "2026-06-22" },
  ];
  const originalIds = assignments.map((item) => item.id);

  // When
  const actual = getUpcomingAssignments(assignments, "child-1", "2026-06-21");

  // Then
  assert.deepEqual(actual.map((item) => item.id), ["today", "future"]);
  assert.deepEqual(assignments.map((item) => item.id), originalIds);
});

test("정상 입력: PASS 퀴즈 결과는 task 완료 없이도 책 활동 기록이 된다", () => {
  // Given
  const data: ReadingData = {
    ...emptyReadingData,
    books: candidateBooks,
    assignments: [{ ...assignment, bookId: "book-1", quizEnabled: true, quizScore: "PASS" }],
  };

  // When
  const logs = buildAssignmentActivityLogs(data);

  // Then
  assert.deepEqual(logs, [
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
      quizScore: "PASS",
    },
  ]);
});

test("경계값: 비활성 퀴즈의 PASS score는 활동 기록에서 제외한다", () => {
  // Given
  const data: ReadingData = {
    ...emptyReadingData,
    books: candidateBooks,
    assignments: [{ ...assignment, bookId: "book-1", quizEnabled: false, quizScore: "PASS" }],
  };

  // When
  const logs = buildAssignmentActivityLogs(data);

  // Then
  assert.deepEqual(logs, []);
});

test("정상 입력: 필사 완료는 기타학습 활동 기록이 된다", () => {
  // Given
  const copyworkAssignment: Assignment = {
    ...assignment,
    id: "copywork-assignment",
    activityCategory: "extraStudy",
    tasks: ["copywork"],
    taskCounts: { copywork: 1 },
    quizEnabled: false,
    quizScore: null,
  };
  const data: ReadingData = {
    ...emptyReadingData,
    books: candidateBooks,
    assignments: [copyworkAssignment],
    completions: {
      "copywork-assignment:copywork": {
        completedAt: "2026-06-10T10:00:00.000Z",
        minutes: 5,
        audioOpenedAt: null,
        count: 1,
      },
    },
  };

  // When
  const logs = buildAssignmentActivityLogs(data);

  // Then
  assert.deepEqual(logs, [
    {
      id: "copywork-assignment:copywork",
      childId: "child-1",
      date: "2026-06-10",
      type: "copywork",
      activityCategory: "extraStudy",
      bookId: "book-1",
      title: "처음 책",
      minutes: 5,
      note: "필사",
      count: 1,
    },
  ]);
});

test("정상 입력: 일반 책과 단어 읽기는 서로 다른 자료 준비 항목을 확인한다", () => {
  // Given
  const regularBook = {
    contentType: "book" as const,
    cover: "/assets/app-icon.svg",
    audio: { listen: "", shadow: "https://example.com/shadow" },
  };
  const wordReading = {
    contentType: "wordReading" as const,
    cover: "",
    audio: { listen: "https://example.com/word", shadow: "" },
  };

  // When
  const regularIssues = getBookSetupIssues(regularBook);
  const wordReadingIssues = getBookSetupIssues(wordReading);
  const hasDefaultCover = hasCustomCover("/assets/app-icon.svg");
  const hasUploadedCover = hasCustomCover("data:image/png;base64,abc");
  const regularIsWordReading = isWordReadingMaterial(regularBook);
  const wordReadingIsWordReading = isWordReadingMaterial(wordReading);

  // Then
  assert.equal(hasDefaultCover, false);
  assert.equal(hasUploadedCover, true);
  assert.equal(regularIsWordReading, false);
  assert.equal(wordReadingIsWordReading, true);
  assert.deepEqual(regularIssues, ["표지", "읽기 링크"]);
  assert.deepEqual(wordReadingIssues, []);
});

test("경계값: 단어 읽기는 표지와 shadow 링크 없이 listen 링크만 있으면 준비된다", () => {
  // Given
  const wordReading = {
    contentType: "wordReading" as const,
    cover: "",
    audio: { listen: "   ", shadow: "" },
  };

  // When
  const actual = getBookSetupIssues(wordReading);

  // Then
  assert.deepEqual(actual, ["단어 읽기 링크"]);
});

test("정상 입력: URL helper는 빈 값과 http/https를 허용한다", () => {
  // Given
  const allowedValues = ["", "   ", "https://example.com/audio", "http://example.com/audio"];

  // When
  const allowedResults = allowedValues.map(isValidExternalUrl);

  // Then
  assert.deepEqual(allowedResults, [true, true, true, true]);
});

test("잘못된 입력: URL helper는 javascript, data, ftp와 깨진 URL을 거부한다", () => {
  // Given
  const rejectedValues = ["javascript:alert(1)", "data:text/plain,hello", "ftp://example.com/audio", "not a url"];

  // When
  const rejectedResults = rejectedValues.map(isValidExternalUrl);

  // Then
  assert.deepEqual(rejectedResults, [false, false, false, false]);
});

test("경계값: 빈 URL 허용은 helper 계약이고 일반 책의 필수 준비 항목을 충족시키지는 않는다", () => {
  // Given
  const book = {
    cover: "",
    audio: { listen: "", shadow: "" },
  };

  // When
  const isEmptyUrlAllowed = isValidExternalUrl(book.audio.listen);
  const setupIssues = getBookSetupIssues(book);

  // Then
  assert.equal(isEmptyUrlAllowed, true);
  assert.deepEqual(setupIssues, ["표지", "읽기 링크", "정따 링크"]);
});

test("정상 입력: getAssignmentTaskCount는 명시 횟수를 우선한다", () => {
  // Given
  const explicitAssignment = assignment;

  // When
  const count = getAssignmentTaskCount(explicitAssignment, "listen");

  // Then
  assert.equal(count, 2);
});

test("경계값: getAssignmentTaskCount는 legacy task 존재를 1회로 fallback한다", () => {
  // Given
  const legacyAssignment: Assignment = { ...assignment, taskCounts: {} };

  // When
  const count = getAssignmentTaskCount(legacyAssignment, "shadow");

  // Then
  assert.equal(count, 1);
});

test("경계값: getAssignmentTaskCount는 배정되지 않은 task에 0을 반환한다", () => {
  // Given
  const absentTaskAssignment: Assignment = { ...assignment, tasks: ["listen"], taskCounts: {} };

  // When
  const count = getAssignmentTaskCount(absentTaskAssignment, "self");

  // Then
  assert.equal(count, 0);
});

test("경계값: buildAssignmentTaskCounts는 category의 0회 task를 제외한다", () => {
  // Given
  const counts = { listen: 2, shadow: 0, self: 1 };

  // When
  const actual = buildAssignmentTaskCounts("focusListen", counts);

  // Then
  assert.deepEqual(actual, { tasks: ["listen", "self"], taskCounts: { listen: 2, self: 1 } });
});

test("경계값: buildAssignmentTaskCounts는 category 밖 task를 제외한다", () => {
  // Given
  const counts = { listen: 1, wordRead: 2 };

  // When
  const actual = buildAssignmentTaskCounts("extraStudy", counts);

  // Then
  assert.deepEqual(actual, { tasks: ["wordRead"], taskCounts: { wordRead: 2 } });
});

test("정상 입력: buildAssignmentTaskCounts는 명시 선택 task만 남긴다", () => {
  // Given
  const counts = { wordRead: 2, copywork: 1 };

  // When
  const actual = buildAssignmentTaskCounts("extraStudy", counts, ["copywork"]);

  // Then
  assert.deepEqual(actual, { tasks: ["copywork"], taskCounts: { copywork: 1 } });
});

test("정상 입력: getCompletionCount는 assignment:task 복합 key의 기록 횟수를 읽는다", () => {
  // Given
  const data: ReadingData = {
    ...emptyReadingData,
    completions: {
      "assignment-1:listen": {
        completedAt: "2026-06-10T10:00:00.000Z",
        minutes: 10,
        audioOpenedAt: null,
        count: 3,
      },
    },
  };

  // When
  const count = getCompletionCount(data, "assignment-1", "listen");

  // Then
  assert.equal(count, 3);
});

test("경계값: getCompletionCount는 기록 없는 task에 0을 반환한다", () => {
  // Given
  const data: ReadingData = { ...emptyReadingData };

  // When
  const count = getCompletionCount(data, "assignment-1", "self");

  // Then
  assert.equal(count, 0);
});

test("경계값: countAssignmentProgress는 목표 초과 완료를 cap한다", () => {
  // Given
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

  // When
  const cappedProgress = countAssignmentProgress(data, assignment);

  // Then
  assert.deepEqual(cappedProgress, { done: 3, total: 4, percent: 75 });
});

test("경계값: countAssignmentProgress는 0 task에 0%를 반환한다", () => {
  // Given
  const noTaskAssignment: Assignment = { ...assignment, tasks: [], taskCounts: {} };

  // When
  const noTaskProgress = countAssignmentProgress(emptyReadingData, noTaskAssignment);

  // Then
  assert.deepEqual(noTaskProgress, { done: 0, total: 0, percent: 0 });
});

test("경계값: 퀴즈 전용 pending은 진행률에 포함되지만 완료는 아니다", () => {
  // Given
  const pendingQuizAssignment = { ...assignment, tasks: [], taskCounts: {}, quizEnabled: true };

  // When
  const pendingQuizProgress = countAssignmentProgress(emptyReadingData, pendingQuizAssignment);

  // Then
  assert.deepEqual(
    pendingQuizProgress,
    { done: 0, total: 1, percent: 0 },
  );
});

test("정상 입력: 퀴즈 전용 PASS는 완료 진행률이다", () => {
  // Given
  const passedQuizAssignment = { ...assignment, tasks: [], taskCounts: {}, quizEnabled: true, quizScore: "PASS" as const };

  // When
  const passedQuizProgress = countAssignmentProgress(emptyReadingData, passedQuizAssignment);

  // Then
  assert.deepEqual(passedQuizProgress, { done: 1, total: 1, percent: 100 });
});

test("정상 입력: 퀴즈 전용 FAIL도 결과 기록으로 완료 진행률이다", () => {
  // Given
  const failedQuizAssignment = { ...assignment, tasks: [], taskCounts: {}, quizEnabled: true, quizScore: "FAIL" as const };

  // When
  const failedQuizProgress = countAssignmentProgress(emptyReadingData, failedQuizAssignment);

  // Then
  assert.deepEqual(failedQuizProgress, { done: 1, total: 1, percent: 100 });
});

test("경계값: 비활성 퀴즈의 score는 진행률에 포함하지 않는다", () => {
  // Given
  const disabledQuizAssignment = { ...assignment, tasks: [], taskCounts: {}, quizEnabled: false, quizScore: "PASS" as const };

  // When
  const disabledQuizProgress = countAssignmentProgress(emptyReadingData, disabledQuizAssignment);

  // Then
  assert.deepEqual(disabledQuizProgress, { done: 0, total: 0, percent: 0 });
});

test("정상 입력: sortTasks는 canonical task 순서를 반환한다", () => {
  // Given
  const unsortedTasks = ["copywork", "wordRead", "self", "listen", "shadow"] as const;

  // When
  const sortedTasks = sortTasks([...unsortedTasks]);

  // Then
  assert.deepEqual(sortedTasks, [
    "listen",
    "shadow",
    "self",
    "wordRead",
    "copywork",
  ]);
});

test("정상 입력: formatTaskSummary는 task label과 횟수를 canonical 순서로 표시한다", () => {
  // Given
  const tasks = ["self", "listen"] as const;

  // When
  const summary = formatTaskSummary([...tasks], { self: 2, listen: 1 });

  // Then
  assert.equal(summary, "읽기 1회 · 스스로 읽기 2회");
});

test("경계값: formatTaskSummary는 빈 task에 빈 문자열을 반환한다", () => {
  // Given
  const tasks: [] = [];

  // When
  const emptySummary = formatTaskSummary(tasks, {});

  // Then
  assert.equal(emptySummary, "");
});

test("정상 입력: formatTaskSummary는 copywork label을 표시한다", () => {
  // Given
  const tasks = ["copywork"] as const;

  // When
  const copyworkSummary = formatTaskSummary([...tasks], { copywork: 1 });

  // Then
  assert.equal(copyworkSummary, "필사 1회");
});

test("정상 입력: formatAssignmentTaskLabels는 일반 배정의 category와 task를 표시한다", () => {
  // Given
  const regularAssignment = assignment;

  // When
  const labels = formatAssignmentTaskLabels(regularAssignment);

  // Then
  assert.equal(labels, "집중듣기 · 읽기 2회 · 정따 1회 · 스스로 읽기 1회");
});

test("정상 입력: formatAssignmentTaskLabels는 wordRead 배정을 표시한다", () => {
  // Given
  const wordReadAssignment = {
    activityCategory: "extraStudy" as const,
    tasks: ["wordRead"] as TaskType[],
    taskCounts: { wordRead: 1 },
    quizEnabled: false,
  };

  // When
  const wordReadLabels = formatAssignmentTaskLabels(wordReadAssignment);

  // Then
  assert.equal(wordReadLabels, "기타학습 · 단어 읽기 1회");
});

test("정상 입력: formatAssignmentTaskLabels는 task 배정에 활성 퀴즈 label을 더한다", () => {
  // Given
  const quizAssignment = { ...assignment, quizEnabled: true };

  // When
  const quizLabels = formatAssignmentTaskLabels(quizAssignment);

  // Then
  assert.equal(quizLabels, "집중듣기 · 읽기 2회 · 정따 1회 · 스스로 읽기 1회 · 퀴즈 Y");
});

test("경계값: formatAssignmentTaskLabels는 quiz-only 배정을 표시한다", () => {
  // Given
  const quizOnlyAssignment = { ...assignment, tasks: [], taskCounts: {}, quizEnabled: true };

  // When
  const quizOnlyLabels = formatAssignmentTaskLabels(quizOnlyAssignment);

  // Then
  assert.equal(quizOnlyLabels, "집중듣기 · 퀴즈 Y");
});

test("정상 입력: 활동 기록은 유효 배정의 복합 key와 입력 순서대로 task와 FAIL 퀴즈를 연결한다", () => {
  // Given
  const focusListenAssignment: Assignment = {
    ...assignment,
    id: "focus-listen-assignment",
    date: "2026-06-11",
    tasks: ["listen", "shadow", "self"],
    taskCounts: { listen: 1, shadow: 1, self: 1 },
    quizEnabled: true,
    quizScore: "FAIL",
  };
  const copyworkAssignment: Assignment = {
    ...assignment,
    id: "copywork-assignment",
    date: "2026-06-09",
    activityCategory: "extraStudy",
    tasks: ["copywork"],
    taskCounts: { copywork: 2 },
  };
  const wordReadAssignment: Assignment = {
    ...assignment,
    id: "word-read-assignment",
    bookId: "word-book-1",
    date: "2026-06-12",
    activityCategory: "extraStudy",
    tasks: ["wordRead"],
    taskCounts: { wordRead: 3 },
  };
  const data: ReadingData = {
    ...emptyReadingData,
    books: [...candidateBooks, wordReadingBook],
    assignments: [focusListenAssignment, copyworkAssignment, wordReadAssignment],
    completions: {
      "focus-listen-assignment:listen": { completedAt: "2026-06-11T01:00:00.000Z", minutes: 10, audioOpenedAt: "2026-06-11T00:00:00", count: 1 },
      "focus-listen-assignment:shadow": { completedAt: "2026-06-11T01:00:00.000Z", minutes: 11, audioOpenedAt: "2026-06-11T00:01:00", count: 1 },
      "focus-listen-assignment:self": { completedAt: "2026-06-11T01:00:00.000Z", minutes: 5, audioOpenedAt: null, count: 1 },
      "copywork-assignment:copywork": { completedAt: "2026-06-09T01:00:00.000Z", minutes: 7, audioOpenedAt: null, count: 2 },
      "word-read-assignment:wordRead": { completedAt: "2026-06-12T01:00:00.000Z", minutes: 6, audioOpenedAt: "2026-06-12T00:02:00", count: 3 },
    },
  };

  // When
  const logs = buildAssignmentActivityLogs(data);

  // Then
  assert.deepEqual(logs.map((log) => [log.id, log.date, log.type, log.minutes, log.count, log.activityCategory, log.title, log.note, log.quizScore]), [
    ["focus-listen-assignment:listen", "2026-06-11", "listen", 10, 1, "focusListen", "처음 책", "오디오 열기 00:00", undefined],
    ["focus-listen-assignment:shadow", "2026-06-11", "shadow", 11, 1, "focusListen", "처음 책", "오디오 열기 00:01", undefined],
    ["focus-listen-assignment:self", "2026-06-11", "self", 5, 1, "focusListen", "처음 책", "스스로 읽기", undefined],
    ["focus-listen-assignment:quiz", "2026-06-11", "quiz", 0, 1, "focusListen", "처음 책", "", "FAIL"],
    ["copywork-assignment:copywork", "2026-06-09", "copywork", 7, 2, "extraStudy", "처음 책", "필사", undefined],
    ["word-read-assignment:wordRead", "2026-06-12", "wordRead", 6, 3, "extraStudy", "단어 카드", "링크 열기 00:02", undefined],
  ]);
});

test("경계값: 자료가 없는 배정은 task와 퀴즈 완료가 있어도 활동 기록에서 생략한다", () => {
  // Given
  const data: ReadingData = {
    ...emptyReadingData,
    assignments: [{ ...assignment, bookId: "missing-book", quizEnabled: true, quizScore: "PASS" }],
    completions: {
      "assignment-1:listen": { completedAt: "2026-06-10T01:00:00.000Z", minutes: 10, audioOpenedAt: null, count: 1 },
    },
  };

  // When
  const logs = buildAssignmentActivityLogs(data);

  // Then
  assert.deepEqual(logs, []);
});

test("정상 입력: 자료 유형별 활동, 기본 task와 오디오 링크는 UI 허용 선택을 따른다", () => {
  // Given
  const regularBook = {
    contentType: "book" as const,
    audio: { listen: "https://example.com/listen", shadow: "https://example.com/shadow" },
  };
  const wordReading = {
    contentType: "wordReading" as const,
    audio: { listen: "https://example.com/word", shadow: "" },
  };

  // When
  const regularCategories = getAvailableActivityCategories(regularBook);
  const wordReadingCategories = getAvailableActivityCategories(wordReading);
  const regularDefaultTasks = getDefaultTasksForMaterial(regularBook);
  const wordReadingDefaultTasks = getDefaultTasksForMaterial(wordReading);
  const regularActivityTasks = regularCategories.map((category) => getActivityTasksForMaterial(category, regularBook));
  const wordReadingActivityTasks = wordReadingCategories.map((category) => getActivityTasksForMaterial(category, wordReading));
  const regularListenUrl = getTaskAudioUrl(regularBook, "listen");
  const regularShadowUrl = getTaskAudioUrl(regularBook, "shadow");
  const regularSelfUrl = getTaskAudioUrl(regularBook, "self");
  const wordReadingUrl = getTaskAudioUrl(wordReading, "wordRead");
  const regularWordReadUrl = getTaskAudioUrl({ contentType: "book", audio: wordReading.audio }, "wordRead");
  const copyworkUrl = getTaskAudioUrl(regularBook, "copywork");

  // Then
  assert.deepEqual(regularDefaultTasks, ["listen", "shadow", "self"]);
  assert.deepEqual(wordReadingDefaultTasks, ["wordRead"]);
  assert.deepEqual(regularCategories, [
    "focusListen",
    "readAloud",
    "englishPicture",
    "extraStudy",
  ]);
  assert.deepEqual(regularActivityTasks, [
    ["listen", "shadow", "self"],
    ["listen", "shadow", "self"],
    ["listen"],
    ["copywork"],
  ]);
  assert.deepEqual(wordReadingCategories, ["extraStudy"]);
  assert.deepEqual(wordReadingActivityTasks, [["wordRead"]]);
  assert.equal(regularListenUrl, "https://example.com/listen");
  assert.equal(regularShadowUrl, "https://example.com/shadow");
  assert.equal(regularSelfUrl, "");
  assert.equal(wordReadingUrl, "https://example.com/word");
  assert.equal(regularWordReadUrl, "");
  assert.equal(copyworkUrl, "");
});

test("경계값: 빈 배정 task는 자료별 활동 task로 복원하고 명시 task는 보존한다", () => {
  // Given
  const emptyExtraStudyAssignment = { activityCategory: "extraStudy" as const, tasks: [] };
  const explicitTaskAssignment = { activityCategory: "extraStudy" as const, tasks: ["copywork" as const] };

  // When
  const regularFallback = getEditableTasksForAssignment(emptyExtraStudyAssignment, { contentType: "book" });
  const wordReadingFallback = getEditableTasksForAssignment(emptyExtraStudyAssignment, { contentType: "wordReading" });
  const explicitTasks = getEditableTasksForAssignment(explicitTaskAssignment, { contentType: "wordReading" });

  // Then
  assert.deepEqual(
    regularFallback,
    ["copywork"],
  );
  assert.deepEqual(
    wordReadingFallback,
    ["wordRead"],
  );
  assert.deepEqual(
    explicitTasks,
    ["copywork"],
  );
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
