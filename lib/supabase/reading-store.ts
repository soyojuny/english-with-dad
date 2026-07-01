import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityCategory,
  Assignment,
  AudioLaunch,
  Book,
  BookContentType,
  Child,
  Completion,
  ManualLog,
  ManualLogType,
  QuizResult,
  ReadingData,
  TaskCountMap,
  TaskType,
} from "../reading-types";

type SupabaseLikeClient = SupabaseClient<any, "public", any>;

type ChildRow = {
  id: string;
  owner_user_id: string;
  name: string;
  level: string;
  goal: string;
};

type BookRow = {
  id: string;
  owner_user_id: string;
  active: boolean;
  content_type: BookContentType | null;
  series: string;
  title: string;
  volume: string;
  level: string;
  cover: string;
  audio_listen: string;
  audio_shadow: string;
  note: string;
};

type AssignmentRow = {
  id: string;
  owner_user_id: string;
  child_id: string;
  date: string;
  book_id: string;
  activity_category: ActivityCategory;
  tasks: string[];
  task_counts: TaskCountMap | null;
  quiz_enabled: boolean | null;
  quiz_score: string | null;
};

type TodayAssignmentRow = AssignmentRow & {
  book: BookRow | BookRow[] | null;
  completions: CompletionRow[] | null;
  audioLaunches: AudioLaunchRow[] | null;
};

type CompletionRow = {
  assignment_id: string;
  task_type: string;
  completed_at: string;
  minutes: number;
  audio_opened_at: string | null;
  count: number;
};

type AudioLaunchRow = {
  assignment_id: string;
  task_type: string;
  opened_at: string;
  returned_at: string | null;
};

type ManualLogRow = {
  id: string;
  child_id: string;
  date: string;
  type: ManualLogType;
  title: string;
  minutes: number;
  note: string;
};

type BookSeriesRow = {
  series: string | null;
};

const bookSelectColumns =
  "id, owner_user_id, active, content_type, series, title, volume, level, cover, audio_listen, audio_shadow, note";

function toQuizResult(value: string | null): QuizResult | null {
  return value === "PASS" || value === "FAIL" ? value : null;
}

function mapChild(row: ChildRow): Child {
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    goal: row.goal,
  };
}

function mapBook(row: BookRow): Book {
  return {
    id: row.id,
    active: row.active,
    contentType: row.content_type ?? "book",
    series: row.series,
    title: row.title,
    volume: row.volume,
    level: row.level,
    cover: row.cover,
    audio: {
      listen: row.audio_listen,
      shadow: row.audio_shadow,
    },
    note: row.note,
  };
}

function mapAssignment(row: AssignmentRow): Assignment {
  const taskCounts = row.task_counts ?? {};
  const tasks = Object.keys(taskCounts).length
    ? (Object.keys(taskCounts) as TaskType[])
    : [...new Set(row.tasks)] as TaskType[];
  return {
    id: row.id,
    childId: row.child_id,
    date: row.date,
    bookId: row.book_id,
    activityCategory: row.activity_category,
    tasks,
    taskCounts,
    quizEnabled: row.quiz_enabled ?? false,
    quizScore: toQuizResult(row.quiz_score),
  };
}

function firstEmbeddedBook(row: TodayAssignmentRow) {
  if (Array.isArray(row.book)) return row.book[0] ?? null;
  return row.book;
}

function mapManualLog(row: ManualLogRow): ManualLog {
  return {
    id: row.id,
    childId: row.child_id,
    date: row.date,
    type: row.type,
    title: row.title,
    minutes: row.minutes,
    note: row.note,
    count: 1,
  };
}

function toCompletionRecord(rows: CompletionRow[]) {
  return rows.reduce<Record<string, Completion>>((acc, row) => {
    acc[`${row.assignment_id}:${row.task_type}`] = {
      completedAt: row.completed_at,
      minutes: row.minutes,
      audioOpenedAt: row.audio_opened_at,
      count: row.count,
    };
    return acc;
  }, {});
}

function toAudioLaunchRecord(rows: AudioLaunchRow[]) {
  return rows.reduce<Record<string, AudioLaunch>>((acc, row) => {
    acc[`${row.assignment_id}:${row.task_type}`] = {
      openedAt: row.opened_at,
      returnedAt: row.returned_at,
    };
    return acc;
  }, {});
}

function toUniqueSeriesNames(rows: BookSeriesRow[]) {
  return [...new Set(rows.map((row) => String(row.series ?? "").trim()).filter(Boolean))].sort();
}

function uniqueValues(values: string[]) {
  return [...new Set(values)].filter(Boolean);
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, message: string): T {
  if (result.error || result.data === null) {
    throw new Error(result.error?.message ?? message);
  }
  return result.data;
}

export async function fetchReadingData(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
): Promise<ReadingData> {
  const [childrenResult, booksResult, assignmentsResult, completionsResult, audioLaunchesResult, manualLogsResult] =
    await Promise.all([
      supabase
        .from("children")
        .select("id, owner_user_id, name, level, goal")
        .eq("owner_user_id", ownerUserId)
        .order("created_at", { ascending: true }),
      supabase
        .from("books")
        .select(bookSelectColumns)
        .eq("owner_user_id", ownerUserId)
        .order("created_at", { ascending: true }),
      supabase
        .from("assignments")
        .select("id, owner_user_id, child_id, date, book_id, activity_category, tasks, task_counts, quiz_enabled, quiz_score")
        .eq("owner_user_id", ownerUserId)
        .order("date", { ascending: true }),
      supabase
        .from("completions")
        .select("assignment_id, task_type, completed_at, minutes, audio_opened_at, count")
        .eq("owner_user_id", ownerUserId),
      supabase
        .from("audio_launches")
        .select("assignment_id, task_type, opened_at, returned_at")
        .eq("owner_user_id", ownerUserId),
      supabase
        .from("manual_logs")
        .select("id, child_id, date, type, title, minutes, note")
        .eq("owner_user_id", ownerUserId)
        .order("date", { ascending: true }),
    ]);

  if (childrenResult.error) throw new Error(childrenResult.error.message);
  if (booksResult.error) throw new Error(booksResult.error.message);
  if (assignmentsResult.error) throw new Error(assignmentsResult.error.message);
  if (completionsResult.error) throw new Error(completionsResult.error.message);
  if (audioLaunchesResult.error) throw new Error(audioLaunchesResult.error.message);
  if (manualLogsResult.error) throw new Error(manualLogsResult.error.message);

  const children = (childrenResult.data ?? []).map((row) => mapChild(row as ChildRow));
  const books = (booksResult.data ?? []).map((row) => mapBook(row as BookRow));
  const assignments = (assignmentsResult.data ?? []).map((row) => mapAssignment(row as AssignmentRow));
  const completions = toCompletionRecord((completionsResult.data ?? []) as CompletionRow[]);
  const audioLaunches = toAudioLaunchRecord((audioLaunchesResult.data ?? []) as AudioLaunchRow[]);
  const manualLogs = (manualLogsResult.data ?? []).map((row) => mapManualLog(row as ManualLogRow));

  return {
    children,
    books,
    assignments,
    completions,
    audioLaunches,
    manualLogs,
  };
}

export async function fetchParentActivityData(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  range: { startKey: string; endKey: string },
): Promise<ReadingData> {
  const [childrenResult, assignmentsResult, manualLogsResult] = await Promise.all([
    supabase
      .from("children")
      .select("id, owner_user_id, name, level, goal")
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: true }),
    supabase
      .from("assignments")
      .select("id, owner_user_id, child_id, date, book_id, activity_category, tasks, task_counts, quiz_enabled, quiz_score")
      .eq("owner_user_id", ownerUserId)
      .gte("date", range.startKey)
      .lte("date", range.endKey)
      .order("date", { ascending: true }),
    supabase
      .from("manual_logs")
      .select("id, child_id, date, type, title, minutes, note")
      .eq("owner_user_id", ownerUserId)
      .gte("date", range.startKey)
      .lte("date", range.endKey)
      .order("date", { ascending: true }),
  ]);

  if (childrenResult.error) throw new Error(childrenResult.error.message);
  if (assignmentsResult.error) throw new Error(assignmentsResult.error.message);
  if (manualLogsResult.error) throw new Error(manualLogsResult.error.message);

  const assignmentRows = (assignmentsResult.data ?? []) as AssignmentRow[];
  const assignmentIds = uniqueValues(assignmentRows.map((row) => row.id));
  const bookIds = uniqueValues(assignmentRows.map((row) => row.book_id));

  const [booksResult, completionsResult, audioLaunchesResult] = await Promise.all([
    bookIds.length
      ? supabase
          .from("books")
          .select(bookSelectColumns)
          .eq("owner_user_id", ownerUserId)
          .in("id", bookIds)
      : Promise.resolve({ data: [], error: null }),
    assignmentIds.length
      ? supabase
          .from("completions")
          .select("assignment_id, task_type, completed_at, minutes, audio_opened_at, count")
          .eq("owner_user_id", ownerUserId)
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [], error: null }),
    assignmentIds.length
      ? supabase
          .from("audio_launches")
          .select("assignment_id, task_type, opened_at, returned_at")
          .eq("owner_user_id", ownerUserId)
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (booksResult.error) throw new Error(booksResult.error.message);
  if (completionsResult.error) throw new Error(completionsResult.error.message);
  if (audioLaunchesResult.error) throw new Error(audioLaunchesResult.error.message);

  return {
    children: (childrenResult.data ?? []).map((row) => mapChild(row as ChildRow)),
    books: (booksResult.data ?? []).map((row) => mapBook(row as BookRow)),
    assignments: assignmentRows.map((row) => mapAssignment(row)),
    completions: toCompletionRecord((completionsResult.data ?? []) as CompletionRow[]),
    audioLaunches: toAudioLaunchRecord((audioLaunchesResult.data ?? []) as AudioLaunchRow[]),
    manualLogs: (manualLogsResult.data ?? []).map((row) => mapManualLog(row as ManualLogRow)),
  };
}

export async function fetchReadingProfileData(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
): Promise<Pick<ReadingData, "children">> {
  const result = await supabase
    .from("children")
    .select("id, owner_user_id, name, level, goal")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: true });

  if (result.error) throw new Error(result.error.message);

  return {
    children: (result.data ?? []).map((row) => mapChild(row as ChildRow)),
  };
}

export async function fetchChildTodayData(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  childId: string,
  date: string,
): Promise<Omit<ReadingData, "children" | "manualLogs">> {
  const assignmentsResult = await supabase
    .from("assignments")
    .select(`
      id,
      owner_user_id,
      child_id,
      date,
      book_id,
      activity_category,
      tasks,
      task_counts,
      quiz_enabled,
      quiz_score,
      book:books!assignments_book_owner_fkey(${bookSelectColumns}),
      completions:completions!completions_assignment_owner_fkey(assignment_id, task_type, completed_at, minutes, audio_opened_at, count),
      audioLaunches:audio_launches!audio_launches_assignment_owner_fkey(assignment_id, task_type, opened_at, returned_at)
    `)
    .eq("owner_user_id", ownerUserId)
    .eq("child_id", childId)
    .eq("date", date)
    .order("date", { ascending: true });

  if (assignmentsResult.error) throw new Error(assignmentsResult.error.message);

  const rows = (assignmentsResult.data ?? []) as unknown as TodayAssignmentRow[];
  const books = rows.flatMap((row) => {
    const book = firstEmbeddedBook(row);
    return book ? [mapBook(book)] : [];
  });
  const completions = rows.flatMap((row) => row.completions ?? []);
  const audioLaunches = rows.flatMap((row) => row.audioLaunches ?? []);

  return {
    books,
    assignments: rows.map((row) => mapAssignment(row)),
    completions: toCompletionRecord(completions),
    audioLaunches: toAudioLaunchRecord(audioLaunches),
  };
}

export async function fetchUpcomingAssignmentData(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  childId: string,
  startDate: string,
): Promise<Pick<ReadingData, "books" | "assignments">> {
  const result = await supabase
    .from("assignments")
    .select(`
      id,
      owner_user_id,
      child_id,
      date,
      book_id,
      activity_category,
      tasks,
      task_counts,
      quiz_enabled,
      quiz_score,
      book:books!assignments_book_owner_fkey(${bookSelectColumns})
    `)
    .eq("owner_user_id", ownerUserId)
    .eq("child_id", childId)
    .gte("date", startDate)
    .order("date", { ascending: true });

  if (result.error) throw new Error(result.error.message);

  const rows = (result.data ?? []) as unknown as TodayAssignmentRow[];
  const booksById = new Map<string, Book>();

  rows.forEach((row) => {
    const book = firstEmbeddedBook(row);
    if (book) booksById.set(book.id, mapBook(book));
  });

  return {
    books: [...booksById.values()],
    assignments: rows.map((row) => mapAssignment(row)),
  };
}

export async function fetchBookManageData(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  filters: { series?: string; title?: string } = {},
): Promise<Pick<ReadingData, "books">> {
  let query = supabase
    .from("books")
    .select(bookSelectColumns)
    .eq("owner_user_id", ownerUserId);

  if (filters.series && filters.series !== "all") {
    query = query.eq("series", filters.series);
  }

  if (filters.title) {
    query = query.ilike("title", `%${filters.title}%`);
  }

  const booksResult = await query.order("created_at", { ascending: true });
  if (booksResult.error) throw new Error(booksResult.error.message);

  return {
    books: (booksResult.data ?? []).map((row) => mapBook(row as BookRow)),
  };
}

export async function fetchBookSeriesNames(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
): Promise<string[]> {
  const rpcResult = await supabase.rpc("book_series_names", { target_owner_user_id: ownerUserId });
  if (!rpcResult.error) {
    return toUniqueSeriesNames((rpcResult.data ?? []) as BookSeriesRow[]);
  }

  const result = await supabase
    .from("books")
    .select("series")
    .eq("owner_user_id", ownerUserId)
    .order("series", { ascending: true });

  if (result.error) throw new Error(result.error.message);

  return toUniqueSeriesNames((result.data ?? []) as BookSeriesRow[]);
}

export async function fetchLibraryData(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
): Promise<Pick<ReadingData, "books">> {
  const result = await supabase
    .from("books")
    .select(bookSelectColumns)
    .eq("owner_user_id", ownerUserId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (result.error) throw new Error(result.error.message);

  return {
    books: (result.data ?? []).map((row) => mapBook(row as BookRow)),
  };
}

export async function fetchAssignedBookIds(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
): Promise<string[]> {
  const result = await supabase
    .from("assignments")
    .select("book_id")
    .eq("owner_user_id", ownerUserId);

  if (result.error) throw new Error(result.error.message);

  return uniqueValues(
    ((result.data ?? []) as Array<{ book_id: string }>).map((row) => row.book_id),
  );
}

export async function saveChild(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  child: Pick<Child, "name" | "level" | "goal"> & { id?: string },
) {
  if (child.id) {
    const result = await supabase
      .from("children")
      .update({
        name: child.name,
        level: child.level,
        goal: child.goal,
      })
      .eq("owner_user_id", ownerUserId)
      .eq("id", child.id)
      .select("id, owner_user_id, name, level, goal")
      .single();

    return mapChild(unwrap(result, "아동 정보를 저장하지 못했습니다.") as ChildRow);
  }

  const result = await supabase
    .from("children")
    .insert({
      owner_user_id: ownerUserId,
      name: child.name,
      level: child.level,
      goal: child.goal,
    })
    .select("id, owner_user_id, name, level, goal")
    .single();

  return mapChild(unwrap(result, "아동을 추가하지 못했습니다.") as ChildRow);
}

export async function saveBook(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  book: Book,
) {
  const payload = {
    owner_user_id: ownerUserId,
    active: book.active,
    content_type: book.contentType,
    series: book.series,
    title: book.title,
    volume: book.volume,
    level: book.level,
    cover: book.cover,
    audio_listen: book.audio.listen,
    audio_shadow: book.audio.shadow,
    note: book.note,
  };

  if (book.id) {
    const result = await supabase
      .from("books")
      .update(payload)
      .eq("owner_user_id", ownerUserId)
      .eq("id", book.id)
      .select(bookSelectColumns)
      .single();

    return mapBook(unwrap(result, "책 정보를 저장하지 못했습니다.") as BookRow);
  }

  const result = await supabase
    .from("books")
    .insert(payload)
    .select(bookSelectColumns)
    .single();

  return mapBook(unwrap(result, "책을 추가하지 못했습니다.") as BookRow);
}

export async function setBookActive(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  bookId: string,
  active: boolean,
) {
  const result = await supabase
    .from("books")
    .update({ active })
    .eq("owner_user_id", ownerUserId)
    .eq("id", bookId)
    .select(bookSelectColumns)
    .single();

  return mapBook(unwrap(result, "책 상태를 변경하지 못했습니다.") as BookRow);
}

export async function saveAssignments(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  payloads: Array<{
    childId: string;
    date: string;
    bookId: string;
    activityCategory: ActivityCategory;
    tasks: TaskType[];
    taskCounts: TaskCountMap;
    quizEnabled: boolean;
  }>,
) {
  const result = await supabase
    .from("assignments")
    .upsert(
      payloads.map((assignment) => ({
        owner_user_id: ownerUserId,
        child_id: assignment.childId,
        date: assignment.date,
        book_id: assignment.bookId,
        activity_category: assignment.activityCategory,
        tasks: assignment.tasks,
        task_counts: assignment.taskCounts,
        quiz_enabled: assignment.quizEnabled,
        ...(!assignment.quizEnabled ? { quiz_score: null } : {}),
      })),
      { onConflict: "owner_user_id,child_id,date,book_id,activity_category" },
    )
    .select("id, owner_user_id, child_id, date, book_id, activity_category, tasks, task_counts, quiz_enabled, quiz_score");

  if (result.error) throw new Error(result.error.message);

  return (result.data ?? []).map((row) => mapAssignment(row as AssignmentRow));
}

export async function saveAssignmentQuizScore(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  assignmentId: string,
  quizScore: QuizResult,
) {
  const result = await supabase
    .from("assignments")
    .update({ quiz_score: quizScore })
    .eq("owner_user_id", ownerUserId)
    .eq("id", assignmentId)
    .select("id, owner_user_id, child_id, date, book_id, activity_category, tasks, task_counts, quiz_enabled, quiz_score")
    .single();

  return mapAssignment(unwrap(result, "퀴즈 결과를 저장하지 못했습니다.") as AssignmentRow);
}

export async function saveAssignmentTaskCounts(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  assignmentId: string,
  payload: {
    tasks: TaskType[];
    taskCounts: TaskCountMap;
    quizEnabled: boolean;
  },
) {
  const result = await supabase
    .from("assignments")
    .update({
      tasks: payload.tasks,
      task_counts: payload.taskCounts,
      quiz_enabled: payload.quizEnabled,
      ...(!payload.quizEnabled ? { quiz_score: null } : {}),
    })
    .eq("owner_user_id", ownerUserId)
    .eq("id", assignmentId)
    .select("id, owner_user_id, child_id, date, book_id, activity_category, tasks, task_counts, quiz_enabled, quiz_score")
    .single();

  return mapAssignment(unwrap(result, "할 일 횟수를 수정하지 못했습니다.") as AssignmentRow);
}

export async function deleteAssignment(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  assignmentId: string,
) {
  const result = await supabase
    .from("assignments")
    .delete()
    .eq("owner_user_id", ownerUserId)
    .eq("id", assignmentId);

  if (result.error) throw new Error(result.error.message);
}

export async function saveCompletion(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  payload: {
    assignmentId: string;
    taskType: TaskType;
    completedAt: string;
    minutes: number;
    audioOpenedAt: string | null;
    count: number;
  },
) {
  const result = await supabase
    .from("completions")
    .upsert(
      {
        owner_user_id: ownerUserId,
        assignment_id: payload.assignmentId,
        task_type: payload.taskType,
        completed_at: payload.completedAt,
        minutes: payload.minutes,
        audio_opened_at: payload.audioOpenedAt,
        count: payload.count,
      },
      { onConflict: "owner_user_id,assignment_id,task_type" },
    )
    .select("assignment_id, task_type, completed_at, minutes, audio_opened_at, count")
    .single();

  const row = unwrap(result, "완료 기록을 저장하지 못했습니다.") as CompletionRow;

  return {
    key: `${row.assignment_id}:${row.task_type}`,
    value: {
      completedAt: row.completed_at,
      minutes: row.minutes,
      audioOpenedAt: row.audio_opened_at,
      count: row.count,
    } satisfies Completion,
  };
}

export async function saveAudioLaunch(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  payload: {
    assignmentId: string;
    taskType: TaskType;
    openedAt: string;
    returnedAt: string | null;
  },
) {
  const result = await supabase
    .from("audio_launches")
    .upsert(
      {
        owner_user_id: ownerUserId,
        assignment_id: payload.assignmentId,
        task_type: payload.taskType,
        opened_at: payload.openedAt,
        returned_at: payload.returnedAt,
      },
      { onConflict: "owner_user_id,assignment_id,task_type" },
    )
    .select("assignment_id, task_type, opened_at, returned_at")
    .single();

  const row = unwrap(result, "오디오 실행 기록을 저장하지 못했습니다.") as AudioLaunchRow;

  return {
    key: `${row.assignment_id}:${row.task_type}`,
    value: {
      openedAt: row.opened_at,
      returnedAt: row.returned_at,
    } satisfies AudioLaunch,
  };
}

export async function saveManualLog(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  payload: {
    childId: string;
    date: string;
    type: ManualLogType;
    title: string;
    minutes: number;
    note: string;
  },
) {
  const result = await supabase
    .from("manual_logs")
    .insert({
      owner_user_id: ownerUserId,
      child_id: payload.childId,
      date: payload.date,
      type: payload.type,
      title: payload.title,
      minutes: payload.minutes,
      note: payload.note,
    })
    .select("id, child_id, date, type, title, minutes, note")
    .single();

  return mapManualLog(unwrap(result, "수기 기록을 저장하지 못했습니다.") as ManualLogRow);
}

export async function deleteManualLog(
  supabase: SupabaseLikeClient,
  ownerUserId: string,
  manualLogId: string,
) {
  const result = await supabase
    .from("manual_logs")
    .delete()
    .eq("owner_user_id", ownerUserId)
    .eq("id", manualLogId)
    .select("id")
    .single();

  unwrap(result, "수기 기록을 삭제하지 못했습니다.");
  return manualLogId;
}
