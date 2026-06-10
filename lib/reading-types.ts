export type Child = {
  id: string;
  name: string;
  level: string;
  goal: string;
};

export type TaskType = "listen" | "shadow" | "self";
export type TaskCountMap = Partial<Record<TaskType, number>>;

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
  taskCounts: TaskCountMap;
};

export type Completion = {
  completedAt: string;
  minutes: number;
  audioOpenedAt: string | null;
  count: number;
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
  count: number;
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
  count: number;
};

export type ReadingData = {
  children: Child[];
  books: Book[];
  assignments: Assignment[];
  completions: Record<string, Completion>;
  audioLaunches: Record<string, AudioLaunch>;
  manualLogs: ManualLog[];
};
