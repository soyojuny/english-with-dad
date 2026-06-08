export type Child = {
  id: string;
  name: string;
  level: string;
  goal: string;
};

export type TaskType = "listen" | "shadow" | "self";

export type ManualLogType = "dvd" | "korean" | "englishPicture";

export type ActivityLogType = TaskType | ManualLogType;

export type Book = {
  id: string;
  active: boolean;
  title: string;
  series: string;
  volume: string;
  level: string;
  cover: string;
  audio: {
    listen: string;
    shadow: string;
  };
  note: string;
};

export type Assignment = {
  id: string;
  childId: string;
  date: string;
  bookId: string;
  tasks: TaskType[];
};

export type Completion = {
  completedAt: string;
  minutes: number;
  audioOpenedAt: string | null;
};

export type AudioLaunch = {
  openedAt: string;
  returnedAt: string | null;
};

export type ManualLog = {
  id: string;
  childId: string;
  date: string;
  type: ManualLogType;
  title: string;
  minutes: number;
  note: string;
};

export type ActivityLog = {
  id: string;
  childId: string;
  date: string;
  type: ActivityLogType;
  bookId?: string;
  title: string;
  minutes: number;
  note: string;
};

export type ReadingData = {
  children: Child[];
  books: Book[];
  assignments: Assignment[];
  completions: Record<string, Completion>;
  audioLaunches: Record<string, AudioLaunch>;
  manualLogs: ManualLog[];
};
