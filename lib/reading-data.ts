import type { ReadingData, TaskType } from "./reading-types";

export const emptyReadingData: ReadingData = {
  children: [],
  books: [],
  assignments: [],
  completions: {},
  audioLaunches: {},
  manualLogs: [],
};

export const taskDefinitions: Record<
  TaskType,
  { label: string; minutes: number; needsAudio: boolean }
> = {
  listen: { label: "듣기", minutes: 10, needsAudio: true },
  shadow: { label: "정따", minutes: 10, needsAudio: true },
  self: { label: "스스로 읽기", minutes: 8, needsAudio: false },
};

export const logLabels = {
  dvd: "DVD",
  listen: "듣기",
  shadow: "정따",
  self: "스스로 읽기",
  korean: "국어책 읽기",
  englishPicture: "영어 그림책 읽기",
} as const;

const pad = (value: number) => String(value).padStart(2, "0");

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
