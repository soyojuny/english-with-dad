import test from "node:test";
import assert from "node:assert/strict";
import * as readingData from "../lib/reading-data";

test("아동 기록 시간은 기본 30분과 30~90분의 10분 단위만 허용한다", () => {
  // Given
  const validMinutes = [30, 40, 50, 60, 70, 80, 90];
  const invalidMinutes = [0, 29, 31, 35, 89, 91, 100];
  const validate = Reflect.get(readingData, "isValidChildRecordMinutes") as ((minutes: number) => boolean) | undefined;

  // When
  const actual = {
    defaultMinutes: Reflect.get(readingData, "CHILD_RECORD_DEFAULT_MINUTES"),
    options: Reflect.get(readingData, "CHILD_RECORD_MINUTE_OPTIONS"),
    valid: validMinutes.map((minutes) => validate?.(minutes)),
    invalid: invalidMinutes.map((minutes) => validate?.(minutes)),
  };

  // Then
  assert.deepEqual(actual, {
    defaultMinutes: 30,
    options: [30, 40, 50, 60, 70, 80, 90],
    valid: [true, true, true, true, true, true, true],
    invalid: [false, false, false, false, false, false, false],
  });
});
