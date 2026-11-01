import test from "node:test";
import assert from "node:assert/strict";
import { getActivityMinutes } from "../lib/reading-calculations";
import type { ActivityLog } from "../lib/reading-types";

test("책 읽기와 반복 DVD 시청 및 기존 시청 기록의 시간을 분리해 합산한다", () => {
  // Given
  const common = { childId: "child-1", date: "2026-10-18", note: "", count: 1 };
  const logs: ActivityLog[] = [
    { ...common, id: "book-1", type: "korean", title: "한글책", minutes: 30 },
    { ...common, id: "book-2", type: "englishPicture", title: "영어 그림책", minutes: 40 },
    { ...common, id: "dvd-1", type: "dvd", title: "DVD", minutes: 60 },
    { ...common, id: "dvd-2", type: "dvd", title: "DVD", minutes: 60 },
    { ...common, id: "dvd-old", type: "dvd", title: "이전 DVD", minutes: 15 },
  ];

  // When
  const actual = getActivityMinutes(logs);

  // Then
  assert.deepEqual(actual, { readingMinutes: 70, dvdMinutes: 135 });
});
