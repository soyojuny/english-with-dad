import type { ActivityCategory, ReadingData, TaskType } from "./reading-types";

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
  listen: { label: "읽기", minutes: 10, needsAudio: true },
  shadow: { label: "정따", minutes: 10, needsAudio: true },
  self: { label: "스스로 읽기", minutes: 5, needsAudio: false },
};

export const activityCategoryDefinitions: Record<
  ActivityCategory,
  { label: string; tasks: TaskType[] }
> = {
  focusListen: { label: "집중듣기", tasks: ["listen", "shadow", "self"] },
  readAloud: { label: "소리내어 읽기", tasks: ["listen", "shadow", "self"] },
  englishPicture: { label: "영어 그림책", tasks: ["listen"] },
};

export const logLabels = {
  dvd: "DVD",
  passiveListen: "흘려듣기",
  listen: "읽기",
  shadow: "정따",
  self: "스스로 읽기",
  korean: "한글책",
  englishPicture: "영어 그림책",
  extraStudy: "기타학습",
} as const;

export const taskCountOptions = [0, 1, 2, 3] as const;

const pad = (value: number) => String(value).padStart(2, "0");

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
