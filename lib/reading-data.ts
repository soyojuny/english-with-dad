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
  listen: { label: "흘려듣기", minutes: 10, needsAudio: true },
  shadow: { label: "집중듣기", minutes: 10, needsAudio: true },
  self: { label: "소리내어 읽기", minutes: 8, needsAudio: false },
  picture: { label: "영어 그림책", minutes: 8, needsAudio: false },
};

export const logLabels = {
  dvd: "DVD",
  passiveListen: "흘려듣기",
  listen: "흘려듣기",
  shadow: "집중듣기",
  self: "소리내어 읽기",
  picture: "영어 그림책",
  korean: "한글책",
  englishPicture: "영어 그림책",
  extraStudy: "기타학습",
} as const;

export const taskCountOptions = [0, 1, 2, 3] as const;

const pad = (value: number) => String(value).padStart(2, "0");

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
