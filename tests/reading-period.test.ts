import test from "node:test";
import assert from "node:assert/strict";
import { formatDate, formatTime } from "../lib/reading-calculations";
import { dateKey } from "../lib/reading-data";
import {
  formatPeriodRangeLabel,
  getPeriodDateRange,
  shiftSelectedDateKey,
} from "../lib/reading-period";

test("정상 입력: dateKey는 로컬 날짜를 0으로 채운 YYYY-MM-DD로 만든다", () => {
  // Given
  const localDate = new Date(2026, 0, 2, 12, 0, 0);

  // When
  const actual = dateKey(localDate);

  // Then
  assert.equal(actual, "2026-01-02");
});

test("경계값: 주간 범위는 일요일에 시작해 연말과 연초를 모두 포함한다", () => {
  // Given
  const selectedDate = "2027-01-01";

  // When
  const actual = getPeriodDateRange("week", selectedDate);

  // Then
  assert.deepEqual(actual, {
    startKey: "2026-12-27",
    endKey: "2027-01-02",
  });
});

test("경계값: 월간 범위는 윤년 2월의 마지막 날을 포함한다", () => {
  // Given
  const selectedDate = "2024-02-29";

  // When
  const actual = getPeriodDateRange("month", selectedDate);

  // Then
  assert.deepEqual(actual, {
    startKey: "2024-02-01",
    endKey: "2024-02-29",
  });
});

test("경계값: 주간 이동은 연말을 넘어 7일을 이동하고 월간 이동은 대상 월 1일로 맞춘다", () => {
  // Given
  const weekDate = "2026-12-27";
  const monthDate = "2026-01-31";

  // When
  const shiftedWeek = shiftSelectedDateKey(weekDate, "week", 1);
  const shiftedMonth = shiftSelectedDateKey(monthDate, "month", 1);

  // Then
  assert.equal(shiftedWeek, "2027-01-03");
  assert.equal(shiftedMonth, "2026-02-01");
});

test("정상 입력: 기간 라벨은 주간 양 끝의 요일과 월간 연월을 표시한다", () => {
  // Given
  const weekDateKeys = ["2026-12-27", "2027-01-02"];
  const monthDateKeys = ["2024-02-01", "2024-02-29"];

  // When
  const weekLabel = formatPeriodRangeLabel("week", weekDateKeys);
  const monthLabel = formatPeriodRangeLabel("month", monthDateKeys);

  // Then
  assert.equal(weekLabel, "2026. 12/27(일) - 2027. 1/2(토)");
  assert.equal(monthLabel, "2024. 2");
});

test("경계값: 빈 주간 라벨은 고정한 오늘 날짜를 시작과 종료로 사용한다", (t) => {
  // Given
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 6, 4, 12, 0, 0) });

  // When
  const actual = formatPeriodRangeLabel("week", []);

  // Then
  assert.equal(actual, "2026. 7/4(토) - 2026. 7/4(토)");
});

test("정상 입력: formatDate는 요일을 포함해 로컬 날짜를 표시한다", () => {
  // Given
  const date = "2024-02-29";

  // When
  const actual = formatDate(date, { includeWeekday: true });

  // Then
  assert.equal(actual, "2/29(목)");
});

test("정상 입력: formatTime은 UTC ISO 시각을 실행 환경의 로컬 시각으로 표시한다", () => {
  // Given
  const isoDate = "2026-06-10T00:05:00.000Z";
  const expectedByTimeZone: Record<string, string> = {
    "Asia/Seoul": "09:05",
    UTC: "00:05",
  };
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // When
  const actual = formatTime(isoDate);

  // Then
  assert.equal(actual, expectedByTimeZone[timeZone] ?? actual);
  assert.ok(expectedByTimeZone[timeZone], `Step 05 verifies formatTime under Asia/Seoul and UTC, received ${timeZone}`);
});
