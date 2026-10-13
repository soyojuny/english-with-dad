import test from "node:test";
import assert from "node:assert/strict";
import { bookToDraft, childToDraft, emptyBookDraft } from "../lib/reading-drafts";
import {
  activityCategoryDefinitions,
  emptyReadingData,
  quizResultOptions,
  taskCountOptions,
  taskDefinitions,
} from "../lib/reading-data";
import type { Book, Child } from "../lib/reading-types";

const book: Book = {
  id: "book-1",
  active: true,
  contentType: "wordReading",
  series: "단어",
  title: "Word Reader",
  volume: "2",
  level: "A",
  cover: "https://example.com/cover.jpg",
  audio: { listen: "https://example.com/listen", shadow: "https://example.com/shadow" },
  note: "매일 읽기",
};

const child: Child = { id: "child-1", name: "하늘", level: "2", goal: "매일 10분" };

test("정상 입력: bookToDraft는 모든 편집 필드를 보존한다", () => {
  // Given
  const expected = {
    id: "book-1",
    contentType: "wordReading",
    series: "단어",
    title: "Word Reader",
    volume: "2",
    level: "A",
    cover: "https://example.com/cover.jpg",
    audio: { listen: "https://example.com/listen", shadow: "https://example.com/shadow" },
    note: "매일 읽기",
  };

  // When
  const actual = bookToDraft(book);

  // Then
  assert.deepEqual(actual, expected);
});

test("정상 입력: childToDraft는 모든 편집 필드를 보존한다", () => {
  // Given
  const expected = { id: "child-1", name: "하늘", level: "2", goal: "매일 10분" };

  // When
  const actual = childToDraft(child);

  // Then
  assert.deepEqual(actual, expected);
});

test("경계값: null은 독립적인 빈 book·child 초안을 반환한다", () => {
  // Given
  const expectedBook = {
    id: "",
    contentType: "book",
    series: "",
    title: "",
    volume: "",
    level: "",
    cover: "",
    audio: { listen: "", shadow: "" },
    note: "",
  };
  const expectedChild = { id: "", name: "", level: "", goal: "" };

  // When
  const bookDraft = bookToDraft(null);
  const childDraft = childToDraft(null);
  const nextChildDraft = childToDraft(null);

  // Then
  assert.deepEqual(bookDraft, expectedBook);
  assert.deepEqual(childDraft, expectedChild);
  assert.notStrictEqual(bookDraft, emptyBookDraft);
  assert.notStrictEqual(bookDraft.audio, emptyBookDraft.audio);
  assert.notStrictEqual(childDraft, nextChildDraft);
});

test("경계값: 빈 문자열과 반복 생성한 초안은 원본·빈 초안·다른 초안과 분리된다", () => {
  // Given
  const source = { ...book, title: "", audio: { listen: "", shadow: "" } };
  const emptyChild = { ...child, name: "", level: "", goal: "" };

  // When
  const firstDraft = bookToDraft(source);
  const secondDraft = bookToDraft(source);
  const firstChildDraft = childToDraft(emptyChild);
  const secondChildDraft = childToDraft(emptyChild);
  firstDraft.audio.listen = "https://example.com/changed";
  secondDraft.audio.shadow = "https://example.com/second";
  firstChildDraft.name = "변경됨";
  source.audio.listen = "https://example.com/source";

  // Then
  assert.equal(firstDraft.title, "");
  assert.equal(firstDraft.audio.listen, "https://example.com/changed");
  assert.equal(firstDraft.audio.shadow, "");
  assert.equal(secondDraft.audio.listen, "");
  assert.equal(secondDraft.audio.shadow, "https://example.com/second");
  assert.deepEqual(emptyBookDraft.audio, { listen: "", shadow: "" });
  assert.notStrictEqual(firstDraft.audio, source.audio);
  assert.notStrictEqual(firstDraft.audio, secondDraft.audio);
  assert.notStrictEqual(firstDraft.audio, emptyBookDraft.audio);
  assert.deepEqual(secondChildDraft, { id: "child-1", name: "", level: "", goal: "" });
  assert.notStrictEqual(firstChildDraft, secondChildDraft);
});

test("정상 입력: 초기 데이터 shape와 UI가 소비하는 task·category·option 정의를 제공한다", () => {
  // Given
  const expectedTaskDefinitions = {
    listen: { label: "읽기", needsAudio: true },
    shadow: { label: "정따", needsAudio: true },
    self: { label: "스스로 읽기", needsAudio: false },
    wordRead: { label: "단어 읽기", needsAudio: true },
    copywork: { label: "필사", needsAudio: false },
  };

  // When
  const initialData = emptyReadingData;

  // Then
  assert.deepEqual(initialData, {
    children: [],
    books: [],
    assignments: [],
    completions: {},
    audioLaunches: {},
    manualLogs: [],
  });
  assert.deepEqual(
    Object.fromEntries(Object.entries(taskDefinitions).map(([type, definition]) => [type, {
      label: definition.label,
      needsAudio: definition.needsAudio,
    }])),
    expectedTaskDefinitions,
  );
  assert.deepEqual(activityCategoryDefinitions.focusListen, { label: "집중듣기", tasks: ["listen", "shadow", "self"] });
  assert.deepEqual(activityCategoryDefinitions.readAloud, { label: "소리내어 읽기", tasks: ["listen", "shadow", "self"] });
  assert.deepEqual(activityCategoryDefinitions.englishPicture, { label: "영어 그림책", tasks: ["listen"] });
  assert.deepEqual(activityCategoryDefinitions.extraStudy, { label: "기타학습", tasks: ["wordRead", "copywork"] });
  assert.deepEqual(taskCountOptions, [0, 1, 2, 3]);
  assert.deepEqual(quizResultOptions, ["PASS", "FAIL"]);
});
