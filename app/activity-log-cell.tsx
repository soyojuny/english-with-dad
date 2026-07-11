import { sortTasks } from "../lib/reading-calculations";
import { taskDefinitions } from "../lib/reading-data";
import type { ActivityCategory, ActivityLog, Book, ManualLog, QuizResult, TaskType } from "../lib/reading-types";

type ActivityLogCellProps = {
  logs: ActivityLog[];
  matcher: {
    types?: ActivityLog["type"] | ActivityLog["type"][];
    activityCategories?: ActivityCategory | ActivityCategory[];
    bookSummary?: boolean;
  };
  manualLogIds: Set<string>;
  getBook: (bookId: string) => Book | undefined;
  onDeleteManualLog: (manualLog: ManualLog) => void;
};

export function ActivityLogCell({
  logs,
  matcher,
  manualLogIds,
  getBook,
  onDeleteManualLog,
}: ActivityLogCellProps) {
  const typeList = matcher.types ? (Array.isArray(matcher.types) ? matcher.types : [matcher.types]) : [];
  const categoryList = matcher.activityCategories
    ? (Array.isArray(matcher.activityCategories) ? matcher.activityCategories : [matcher.activityCategories])
    : [];
  const filteredLogs = logs.filter((log) => {
    const matchesType = typeList.length > 0 && typeList.includes(log.type);
    const matchesCategory = categoryList.length > 0 && Boolean(log.activityCategory && categoryList.includes(log.activityCategory));
    return matchesType || matchesCategory;
  });

  if (!filteredLogs.length) {
    return <span className="task-meta">-</span>;
  }

  const isManualActivityLog = (log: ActivityLog): log is ManualLog => manualLogIds.has(log.id);
  const manualLogs = filteredLogs.filter(isManualActivityLog);
  const automaticLogs = filteredLogs.filter((log) => !isManualActivityLog(log));
  const manualItems = manualLogs.map((log) => (
    <div className="activity-log-entry is-manual" key={log.id}>
      <span>
        {log.title}
        <br />
        <small>
          {log.minutes}분{log.note ? ` · ${log.note}` : ""}
        </small>
      </span>
      <button className="activity-delete-button" type="button" onClick={() => onDeleteManualLog(log)}>
        삭제
      </button>
    </div>
  ));

  if (matcher.bookSummary) {
    const grouped = automaticLogs.reduce<
      Record<string, { series: string; title: string; minutes: number; taskCounts: Partial<Record<TaskType, number>>; quizScore: QuizResult | null }>
    >((acc, log) => {
      const book = log.bookId ? getBook(log.bookId) : undefined;
      const series = book?.series || "직접 입력";
      const key = `${series}:${log.title}`;
      acc[key] ??= { series, title: log.title, minutes: 0, taskCounts: {}, quizScore: null };
      acc[key].minutes += Number(log.minutes || 0);
      if (log.quizScore !== undefined) acc[key].quizScore = log.quizScore;
      if (log.type in taskDefinitions) {
        const taskType = log.type as TaskType;
        acc[key].taskCounts[taskType] = (acc[key].taskCounts[taskType] ?? 0) + log.count;
      }
      return acc;
    }, {});

    return [
      ...manualItems,
      ...Object.entries(grouped).map(([key, entry]) => {
        const detailText = sortTasks(Object.keys(entry.taskCounts) as TaskType[])
          .map((taskType) => `${taskDefinitions[taskType].label} ${entry.taskCounts[taskType] ?? 0}회`)
          .join(", ");

        return (
          <div key={key}>
            <strong>{entry.series}</strong>
            <br />
            {entry.title}
            <br />
            <small>
              {detailText || "활동 기록"} ({entry.minutes}분)
              {entry.quizScore !== null ? ` 퀴즈 (${entry.quizScore})` : ""}
            </small>
          </div>
        );
      }),
    ];
  }

  const grouped = automaticLogs.reduce<Record<string, { title: string; minutes: number; counts: number; notes: string[] }>>((acc, log) => {
    const key = `${log.activityCategory ?? log.type}:${log.title}`;
    acc[key] ??= { title: log.title, minutes: 0, counts: 0, notes: [] };
    acc[key].minutes += Number(log.minutes || 0);
    acc[key].counts += log.count;
    if (log.note && !acc[key].notes.includes(log.note)) acc[key].notes.push(log.note);
    return acc;
  }, {});

  return [
    ...manualItems,
    ...Object.entries(grouped).map(([key, entry]) => (
      <div key={key}>
        {entry.title}
        <br />
        <small>
          {entry.counts > 1 ? `${entry.counts}회 · ` : ""}{entry.minutes}분{entry.notes.length ? ` · ${entry.notes.join(", ")}` : ""}
        </small>
      </div>
    )),
  ];
}
