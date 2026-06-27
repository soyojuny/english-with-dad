export type Child = {
  id: string;
  name: string;
  level: string;
  goal: string;
};

export type TaskType = "listen" | "shadow" | "self" | "wordRead";
export type TaskCountMap = Partial<Record<TaskType, number>>;
export type ActivityCategory = "focusListen" | "readAloud" | "englishPicture" | "extraStudy";
export type BookContentType = "book" | "wordReading";

export type ManualLogType = "dvd" | "passiveListen" | "korean" | "englishPicture" | "extraStudy";

export type ActivityLogType = TaskType | ManualLogType | "quiz";
export type QuizResult = "PASS" | "FAIL";

export type Book = {
  id: string;
  active: boolean;
  contentType: BookContentType;
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
  activityCategory: ActivityCategory;
  tasks: TaskType[];
  taskCounts: TaskCountMap;
  quizEnabled: boolean;
  quizScore: QuizResult | null;
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
  activityCategory?: ActivityCategory;
  bookId?: string;
  title: string;
  minutes: number;
  note: string;
  count: number;
  quizScore?: QuizResult;
};

export type ReadingData = {
  children: Child[];
  books: Book[];
  assignments: Assignment[];
  completions: Record<string, Completion>;
  audioLaunches: Record<string, AudioLaunch>;
  manualLogs: ManualLog[];
};
