import { activityCategoryDefinitions, dateKey, taskDefinitions } from "./reading-data";
import type {
  ActivityCategory,
  Assignment,
  AudioLaunch,
  Book,
  BookContentType,
  ReadingData,
  TaskCountMap,
  TaskType,
} from "./reading-types";

export const taskOrder: TaskType[] = ["listen", "shadow", "self", "wordRead"];
export const activityCategoryOrder: ActivityCategory[] = ["focusListen", "readAloud", "englishPicture", "extraStudy"];

export const bookContentTypeLabels: Record<BookContentType, string> = {
  book: "책",
  wordReading: "단어 읽기",
};

export type BookSetupInput = {
  contentType?: BookContentType;
  cover: string;
  audio: {
    listen: string;
    shadow: string;
  };
};

export function formatDate(value: string, options: { includeWeekday?: boolean } = {}) {
  const [, month, day] = value.split("-");
  const formattedDate = `${Number(month)}/${Number(day)}`;
  if (!options.includeWeekday) return formattedDate;

  const date = new Date(`${value}T00:00:00`);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${formattedDate}(${weekdays[date.getDay()]})`;
}

export function formatTime(isoDate: string) {
  const date = new Date(isoDate);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function datesInRange(startValue: string, endValue: string) {
  const dates: string[] = [];
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(dateKey(cursor));
  }

  return dates;
}

export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getAssignmentBookCandidates({
  books,
  selectedBookIds,
  assignedBookIds,
  seriesFilter,
  search,
}: {
  books: Book[];
  selectedBookIds: Iterable<string>;
  assignedBookIds: Iterable<string>;
  seriesFilter: string;
  search: string;
}) {
  const query = normalizeText(search);
  const selectedIds = new Set(selectedBookIds);
  const assignedIds = new Set(assignedBookIds);

  return [...books]
    .reverse()
    .filter((book) => {
      const matchesSeries = seriesFilter === "all" || book.series === seriesFilter;
      const matchesQuery =
        !query ||
        [book.title, book.series, book.volume, book.level].some((field) =>
          normalizeText(field).includes(query),
        );
      const canShowAssignedBook = Boolean(query) || !assignedIds.has(book.id);

      return !selectedIds.has(book.id) && canShowAssignedBook && matchesSeries && matchesQuery;
    })
    .slice(0, query ? 20 : 10);
}

export function getUpcomingAssignments(assignments: Assignment[], childId: string, startDate: string) {
  return assignments
    .filter((assignment) => assignment.childId === childId && assignment.date >= startDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function hasCustomCover(cover: string) {
  return Boolean(cover && cover !== "/assets/app-icon.svg");
}

export function isWordReadingMaterial(book: { contentType?: BookContentType }) {
  return book.contentType === "wordReading";
}

export function getBookSetupIssues(book: BookSetupInput) {
  const issues: string[] = [];
  if (isWordReadingMaterial(book)) {
    if (!book.audio.listen.trim()) issues.push("단어 읽기 링크");
    return issues;
  }

  if (!hasCustomCover(book.cover)) issues.push("표지");
  if (!book.audio.listen.trim()) issues.push("읽기 링크");
  if (!book.audio.shadow.trim()) issues.push("정따 링크");
  return issues;
}

export function getAvailableActivityCategories(book: Pick<Book, "contentType">): ActivityCategory[] {
  return isWordReadingMaterial(book) ? ["extraStudy"] : ["focusListen", "readAloud", "englishPicture"];
}

export function getDefaultTasksForMaterial(book: Pick<Book, "contentType">): TaskType[] {
  return isWordReadingMaterial(book) ? ["wordRead"] : ["listen", "shadow", "self"];
}

export function getTaskAudioUrl(book: Pick<Book, "audio" | "contentType">, taskType: TaskType) {
  if (taskType === "wordRead") return isWordReadingMaterial(book) ? book.audio.listen : "";
  if (taskType === "listen" || taskType === "shadow") return book.audio[taskType];
  return "";
}

export function isValidExternalUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getAssignmentTaskCount(assignment: Assignment, taskType: TaskType) {
  return assignment.taskCounts[taskType] ?? (assignment.tasks.includes(taskType) ? 1 : 0);
}

export function getCompletionCount(data: ReadingData, assignmentId: string, taskType: TaskType) {
  return data.completions[`${assignmentId}:${taskType}`]?.count ?? 0;
}

export function formatTaskSummary(tasks: TaskType[], taskCounts: TaskCountMap) {
  return [...tasks]
    .sort((left, right) => taskOrder.indexOf(left) - taskOrder.indexOf(right))
    .map((taskType) => `${taskDefinitions[taskType].label} ${taskCounts[taskType] ?? 1}회`)
    .join(" · ");
}

export function sortTasks(tasks: TaskType[]) {
  return [...tasks].sort((left, right) => taskOrder.indexOf(left) - taskOrder.indexOf(right));
}

export function getLaunchMinutes(launch: AudioLaunch | null | undefined, fallbackMinutes: number) {
  if (!launch?.openedAt || !launch.returnedAt) return fallbackMinutes;
  const openedAt = new Date(launch.openedAt).getTime();
  const returnedAt = new Date(launch.returnedAt).getTime();
  if (!Number.isFinite(openedAt) || !Number.isFinite(returnedAt) || returnedAt <= openedAt) {
    return fallbackMinutes;
  }
  return Math.max(1, Math.ceil((returnedAt - openedAt) / 60000));
}

export function countAssignmentProgress(data: ReadingData, assignment: Assignment) {
  const total = assignment.tasks.reduce((sum, taskType) => sum + getAssignmentTaskCount(assignment, taskType), 0);
  const done = assignment.tasks.reduce(
    (sum, taskType) => sum + Math.min(getCompletionCount(data, assignment.id, taskType), getAssignmentTaskCount(assignment, taskType)),
    0,
  );
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}

export function formatAssignmentTaskLabels(assignment: Pick<Assignment, "activityCategory" | "tasks" | "taskCounts">) {
  return `${activityCategoryDefinitions[assignment.activityCategory].label} · ${formatTaskSummary(assignment.tasks, assignment.taskCounts)}`;
}
