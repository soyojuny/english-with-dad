"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { ActivityLogCell } from "./activity-log-cell";
import { AssignmentBookPicker } from "./assignment-book-picker";
import { AssignmentEditForm } from "./assignment-edit-form";
import { AssignmentQuizScore } from "./assignment-quiz-score";
import { MaterialThumb, formatMaterialMeta } from "./material-thumb";
import {
  bookContentTypeLabels,
  buildAssignmentTaskCounts,
  buildAssignmentActivityLogs,
  countAssignmentProgress,
  datesInRange,
  formatAssignmentTaskLabels,
  formatDate,
  formatTime,
  getAssignmentBookCandidates,
  getUpcomingAssignments,
  getAvailableActivityCategories,
  getAssignmentTaskCount,
  getBookSetupIssues,
  getCompletionCount,
  getDefaultTasksForMaterial,
  getLaunchMinutes,
  getTaskAudioUrl,
  hasCustomCover,
  isWordReadingMaterial,
  isValidExternalUrl,
  normalizeText,
  sortTasks,
  taskOrder,
} from "../lib/reading-calculations";
import {
  activityCategoryDefinitions,
  dateKey,
  emptyReadingData,
  taskDefinitions,
} from "../lib/reading-data";
import {
  bookToDraft,
  childToDraft,
  emptyBookDraft,
  emptyChildDraft,
} from "../lib/reading-drafts";
import type { BookDraft, ChildDraft } from "../lib/reading-drafts";
import {
  formatPeriodRangeLabel,
  getPeriodDateRange,
  shiftSelectedDateKey,
} from "../lib/reading-period";
import type { Period } from "../lib/reading-period";
import { readQrValueFromSource } from "../lib/qr-reader";
import { compressCoverImage } from "../lib/cover-image";
import type {
  ActivityCategory,
  ActivityLog,
  Assignment,
  Book,
  BookContentType,
  ManualLog,
  ManualLogType,
  QuizResult,
  ReadingData,
  TaskCountMap,
  TaskType,
} from "../lib/reading-types";
import { createClient } from "../lib/supabase/client";
import {
  deleteAssignment as deleteAssignmentRecord,
  deleteManualLog,
  fetchAssignedBookIds,
  fetchBookManageData,
  fetchBookSeriesNames,
  fetchChildTodayData,
  fetchLibraryData,
  fetchParentActivityData,
  fetchReadingProfileData,
  fetchUpcomingAssignmentData,
  saveAssignments,
  saveAssignmentQuizScore,
  saveAssignmentTaskCounts,
  saveAudioLaunch,
  saveBook as saveBookRecord,
  saveChild,
  saveCompletion,
  saveManualLog,
  setBookActive,
} from "../lib/supabase/reading-store";

type ViewName = "child" | "parent" | "books" | "assign";
type ParentPanel = "activity" | "manual";
type AudioLinkField = "listen" | "shadow";
type BookListFilter = "active" | "attention" | "ready" | "inactive";
type ChildManualLogType = Extract<ManualLogType, "korean" | "englishPicture">;

type QrState = {
  open: boolean;
  target: AudioLinkField | null;
  status: string;
};


type ReadingManagerClientProps = {
  ownerUserId: string;
  onSignOut: () => void;
  isSigningOut: boolean;
};

type ActiveProfile =
  | { kind: "parent" }
  | { kind: "child"; childId: string }
  | { kind: "library" }
  | null;

export default function HomePage({ ownerUserId, onSignOut, isSigningOut }: ReadingManagerClientProps) {
  const [data, setData] = useState<ReadingData>(emptyReadingData);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingProfileData, setIsLoadingProfileData] = useState(true);
  const [syncError, setSyncError] = useState("");
  const [view, setView] = useState<ViewName>("child");
  const [childId, setChildId] = useState("");
  const [period, setPeriod] = useState<Period>("week");
  const [parentPanel, setParentPanel] = useState<ParentPanel>("activity");
  const [weeklyPrintRequested, setWeeklyPrintRequested] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState(() => dateKey());
  const [loadedParentActivityRangeKey, setLoadedParentActivityRangeKey] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [bookSearch, setBookSearch] = useState("");
  const [manageSeriesFilter, setManageSeriesFilter] = useState("all");
  const [manageBookSearch, setManageBookSearch] = useState("");
  const [manageBookResults, setManageBookResults] = useState<Book[]>([]);
  const [manageSeriesNames, setManageSeriesNames] = useState<string[]>([]);
  const [isBookManageDataLoaded, setIsBookManageDataLoaded] = useState(false);
  const [isLoadingBookManageData, setIsLoadingBookManageData] = useState(false);
  const [isLoadingBookSeries, setIsLoadingBookSeries] = useState(false);
  const [isAssignBookDataLoaded, setIsAssignBookDataLoaded] = useState(false);
  const [assignSeriesFilter, setAssignSeriesFilter] = useState("all");
  const [assignBookSearch, setAssignBookSearch] = useState("");
  const [assignSelectedBookIds, setAssignSelectedBookIds] = useState<string[]>([]);
  const [assignHistoryBookIds, setAssignHistoryBookIds] = useState<string[]>([]);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [bookListFilter, setBookListFilter] = useState<BookListFilter>("active");
  const [isChildManualLogOpen, setIsChildManualLogOpen] = useState(false);
  const [bookDraft, setBookDraft] = useState<BookDraft>(() => bookToDraft(null));
  const [bookDraftMode, setBookDraftMode] = useState<"new" | "edit">("new");
  const [childDraft, setChildDraft] = useState<ChildDraft>(emptyChildDraft);
  const [childDraftMode, setChildDraftMode] = useState<"new" | "edit">("new");
  const [toast, setToast] = useState("");
  const [activeProfile, setActiveProfile] = useState<ActiveProfile>(null);
  const [qrState, setQrState] = useState<QrState>({
    open: false,
    target: null,
    status: "카메라 권한을 허용하면 QR 코드를 자동으로 읽습니다.",
  });
  const [supabase] = useState(() => createClient());
  const qrVideoRef = useRef<HTMLVideoElement | null>(null);
  const qrStreamRef = useRef<MediaStream | null>(null);
  const qrTimerRef = useRef<number | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);
  const profileLoadedRef = useRef(false);

  const activeBooks = useMemo(() => data.books.filter((book) => book.active !== false), [data.books]);
  const activeBookItems = useMemo(() => activeBooks.filter((book) => !isWordReadingMaterial(book)), [activeBooks]);
  const manageBooks = useMemo(() => (isBookManageDataLoaded ? manageBookResults : []), [isBookManageDataLoaded, manageBookResults]);
  const activeManageBooks = useMemo(() => manageBooks.filter((book) => book.active !== false), [manageBooks]);
  const inactiveManageBooks = useMemo(() => manageBooks.filter((book) => book.active === false), [manageBooks]);
  const child = useMemo(
    () => data.children.find((item) => item.id === childId) ?? { id: "", name: "", level: "", goal: "" },
    [childId, data.children],
  );
  const childSummary = child.id ? child : {
    id: "",
    name: "아동 없음",
    level: "",
    goal: "프로필 관리에서 아동을 먼저 추가하세요.",
  };
  const seriesNames = useMemo(
    () => [...new Set(activeBookItems.map((book) => book.series).filter(Boolean))].sort(),
    [activeBookItems],
  );
  const assignSeriesNames = useMemo(
    () => [...new Set(activeBooks.map((book) => book.series).filter(Boolean))].sort(),
    [activeBooks],
  );
  const allSeriesNames = useMemo(
    () => manageSeriesNames,
    [manageSeriesNames],
  );
  const draftSourceBook = useMemo(
    () => data.books.find((book) => book.id === bookDraft.id) ?? manageBookResults.find((book) => book.id === bookDraft.id) ?? null,
    [bookDraft.id, data.books, manageBookResults],
  );
  const parentActivityRange = useMemo(
    () => getPeriodDateRange(period, selectedDateKey),
    [period, selectedDateKey],
  );
  const parentActivityRangeKey = `${parentActivityRange.startKey}:${parentActivityRange.endKey}`;

  const getBook = (bookId: string) => data.books.find((book) => book.id === bookId);
  const getAssignment = (assignmentId: string) =>
    data.assignments.find((assignment) => assignment.id === assignmentId);

  const todayAssignments = useMemo(
    () =>
      data.assignments.filter((assignment) => {
        const book = getBook(assignment.bookId);
        return assignment.childId === childId && assignment.date === dateKey() && book?.active !== false;
      }),
    [childId, data.assignments, data.books],
  );

  const selectedAssignment = selectedAssignmentId ? getAssignment(selectedAssignmentId) : undefined;
  const selectedBook = selectedAssignment
    ? getBook(selectedAssignment.bookId)
    : selectedBookId
      ? getBook(selectedBookId)
      : undefined;
  const selectedMaterialTasks = selectedAssignment?.tasks ?? (selectedBook ? getDefaultTasksForMaterial(selectedBook) : taskOrder);
  const isWordReadingDraft = isWordReadingMaterial(bookDraft);
  const draftContentTypeLabel = bookContentTypeLabels[bookDraft.contentType];

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoadingProfileData(true);
      setIsLoadingData(true);
      setSyncError("");

      try {
        const profileData = await fetchReadingProfileData(supabase, ownerUserId);
        if (cancelled) return;
        setData((current) => ({ ...current, children: profileData.children }));
      } catch (error) {
        if (cancelled) return;
        setSyncError(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.");
        showToast("Supabase에서 데이터를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) {
          setIsLoadingProfileData(false);
          setIsLoadingData(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [ownerUserId, supabase]);

  useEffect(() => {
    if (!activeProfile) return;
    let cancelled = false;

    const load = async () => {
      setIsLoadingData(true);
      setSyncError("");

      try {
        if (activeProfile.kind === "parent") {
          setLoadedParentActivityRangeKey("");
          const nextData = await fetchParentActivityData(supabase, ownerUserId, parentActivityRange);
          if (cancelled) return;
          setData((current) => {
            const booksById = new Map(current.books.map((book) => [book.id, book]));
            nextData.books.forEach((book) => booksById.set(book.id, book));

            return {
              children: nextData.children,
              books: [...booksById.values()],
              assignments: nextData.assignments,
              completions: nextData.completions,
              audioLaunches: nextData.audioLaunches,
              manualLogs: nextData.manualLogs,
            };
          });
          setManageBookResults([]);
          setIsBookManageDataLoaded(false);
          setIsAssignBookDataLoaded(false);
          setLoadedParentActivityRangeKey(parentActivityRangeKey);
          return;
        }

        if (activeProfile.kind === "library") {
          const nextData = await fetchLibraryData(supabase, ownerUserId);
          if (cancelled) return;
          setData((current) => ({
            children: current.children,
            books: nextData.books,
            assignments: [],
            completions: {},
            audioLaunches: {},
            manualLogs: [],
          }));
          setManageBookResults([]);
          setIsBookManageDataLoaded(false);
          setIsAssignBookDataLoaded(false);
          return;
        }

        const nextData = await fetchChildTodayData(supabase, ownerUserId, activeProfile.childId, dateKey());
        if (cancelled) return;
        setData((current) => ({
          children: current.children,
          books: nextData.books,
          assignments: nextData.assignments,
          completions: nextData.completions,
          audioLaunches: nextData.audioLaunches,
          manualLogs: [],
        }));
        setManageBookResults([]);
        setIsBookManageDataLoaded(false);
        setIsAssignBookDataLoaded(false);
      } catch (error) {
        if (cancelled) return;
        setSyncError(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.");
        showToast("선택한 프로필 데이터를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [activeProfile, ownerUserId, parentActivityRange, parentActivityRangeKey, supabase]);

  useEffect(() => {
    if (activeProfile?.kind !== "parent" || view !== "books" || manageSeriesNames.length) return;

    let cancelled = false;

    const load = async () => {
      setIsLoadingBookSeries(true);

      try {
        const seriesNames = await fetchBookSeriesNames(supabase, ownerUserId);
        if (cancelled) return;
        setManageSeriesNames(seriesNames);
      } catch (error) {
        if (cancelled) return;
        setSyncError(error instanceof Error ? error.message : "시리즈 목록을 불러오지 못했습니다.");
        showToast("시리즈 목록을 불러오지 못했습니다. 전체 시리즈로 조회해 주세요.");
      } finally {
        if (!cancelled) setIsLoadingBookSeries(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [activeProfile, manageSeriesNames.length, ownerUserId, supabase, view]);

  useEffect(() => {
    if (activeProfile?.kind !== "parent" || view !== "assign") return;
    if (isAssignBookDataLoaded) return;

    let cancelled = false;

    const load = async () => {
      setIsLoadingData(true);
      setSyncError("");

      try {
        const [nextData, assignedBookIds] = await Promise.all([
          fetchLibraryData(supabase, ownerUserId),
          fetchAssignedBookIds(supabase, ownerUserId),
        ]);
        if (cancelled) return;
        setData((current) => ({
          ...current,
          books: nextData.books,
        }));
        setAssignHistoryBookIds(assignedBookIds);
        setIsAssignBookDataLoaded(true);
      } catch (error) {
        if (cancelled) return;
        setSyncError(error instanceof Error ? error.message : "배정할 자료를 불러오지 못했습니다.");
        showToast("배정할 자료를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [activeProfile, isAssignBookDataLoaded, ownerUserId, supabase, view]);

  useEffect(() => {
    if (activeProfile?.kind !== "parent" || view !== "assign" || !childId) return;

    let cancelled = false;
    const startDate = dateKey();

    const load = async () => {
      setIsLoadingData(true);
      setSyncError("");

      try {
        const nextData = await fetchUpcomingAssignmentData(supabase, ownerUserId, childId, startDate);
        if (cancelled) return;

        setData((current) => {
          const booksById = new Map(current.books.map((book) => [book.id, book]));
          nextData.books.forEach((book) => booksById.set(book.id, book));

          return {
            ...current,
            books: [...booksById.values()],
            assignments: [
              ...current.assignments.filter(
                (assignment) => assignment.childId !== childId || assignment.date < startDate,
              ),
              ...nextData.assignments,
            ],
          };
        });
      } catch (error) {
        if (cancelled) return;
        setSyncError(error instanceof Error ? error.message : "예정된 할 일을 불러오지 못했습니다.");
        showToast("예정된 할 일을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [activeProfile, childId, ownerUserId, supabase, view]);

  useEffect(() => {
    setAssignSelectedBookIds([]);
  }, [childId]);

  useEffect(() => {
    if (isLoadingData || profileLoadedRef.current) return;

    profileLoadedRef.current = true;
    try {
      const raw = window.sessionStorage.getItem(`ewd-profile:${ownerUserId}`);
      if (!raw) return;

      const parsed = JSON.parse(raw) as ActiveProfile;
      if (!parsed) return;
      if (parsed.kind === "parent") {
        setActiveProfile(parsed);
        return;
      }
      if (parsed.kind === "library") {
        setActiveProfile(parsed);
        return;
      }
      if (parsed.kind === "child" && data.children.some((item) => item.id === parsed.childId)) {
        setActiveProfile(parsed);
      }
    } catch {
      // Ignore invalid stored profile data.
    }
  }, [data.children, isLoadingData, ownerUserId]);

  useEffect(() => {
    if (isLoadingData) return;
    if (!activeProfile) {
      window.sessionStorage.removeItem(`ewd-profile:${ownerUserId}`);
      return;
    }

    if (activeProfile.kind === "child" && !data.children.some((item) => item.id === activeProfile.childId)) {
      setActiveProfile(null);
      return;
    }

    window.sessionStorage.setItem(`ewd-profile:${ownerUserId}`, JSON.stringify(activeProfile));
  }, [activeProfile, data.children, isLoadingData, ownerUserId]);

  useEffect(() => {
    if (!data.children.length) {
      setChildId("");
      return;
    }
    if (!childId || !data.children.some((item) => item.id === childId)) {
      setChildId(data.children[0].id);
    }
  }, [childId, data.children]);

  useEffect(() => {
    if (childDraftMode === "new") return;
    if (childDraft.id && data.children.some((item) => item.id === childDraft.id)) return;
    if (!data.children.length) {
      setChildDraft({ ...emptyChildDraft });
      return;
    }
    setChildDraft(childToDraft(data.children[0] ?? null));
    setChildDraftMode("edit");
  }, [childDraft.id, childDraftMode, data.children]);

  useEffect(() => {
    if (bookDraftMode === "new") return;
    if (bookDraft.id && data.books.some((item) => item.id === bookDraft.id)) return;
    if (!data.books.length) {
      setBookDraft(bookToDraft(null));
      return;
    }
    setBookDraft(bookToDraft(data.books[0] ?? null));
    setBookDraftMode("edit");
  }, [bookDraft.id, bookDraftMode, data.books]);

  useEffect(() => {
    if (!todayAssignments.length) {
      setSelectedAssignmentId("");
      return;
    }
    if (!selectedAssignmentId || !todayAssignments.some((assignment) => assignment.id === selectedAssignmentId)) {
      setSelectedAssignmentId(todayAssignments[0].id);
    }
  }, [selectedAssignmentId, todayAssignments]);

  useEffect(() => {
    if (toast) {
      const timer = window.setTimeout(() => setToast(""), 2600);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [toast]);

  useEffect(() => {
    if (
      !weeklyPrintRequested ||
      period !== "week" ||
      parentPanel !== "activity" ||
      loadedParentActivityRangeKey !== parentActivityRangeKey
    ) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      window.print();
      setWeeklyPrintRequested(false);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [loadedParentActivityRangeKey, parentActivityRangeKey, parentPanel, period, weeklyPrintRequested]);

  useEffect(() => {
    if (!activeProfile) return;
    if (activeProfile.kind === "parent") {
      if (view === "child") setView("parent");
      return;
    }
    if (activeProfile.kind === "library") return;
    if (view !== "child") setView("child");
    if (childId !== activeProfile.childId) {
      setChildId(activeProfile.childId);
      setSelectedAssignmentId("");
      setSelectedBookId("");
    }
  }, [activeProfile, childId, view]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || window.location.protocol === "file:") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      setToast("PWA 캐시 등록을 건너뛰었습니다.");
    });
  }, []);

  useEffect(() => {
    const markReturned = async () => {
      if (document.visibilityState !== "visible") return;

      const pendingLaunches = Object.entries(data.audioLaunches).filter(([, launch]) => !launch.returnedAt);
      if (!pendingLaunches.length) return;

      const returnedAt = new Date().toISOString();

      try {
        const updates = await Promise.all(
          pendingLaunches.map(([key, launch]) => {
            const [assignmentId, taskType] = key.split(":");
            return saveAudioLaunch(supabase, ownerUserId, {
              assignmentId,
              taskType: taskType as TaskType,
              openedAt: launch.openedAt,
              returnedAt,
            });
          }),
        );

        setData((current) => ({
          ...current,
          audioLaunches: {
            ...current.audioLaunches,
            ...Object.fromEntries(updates.map((update) => [update.key, update.value])),
          },
        }));
      } catch {
        showToast("오디오 복귀 시간을 저장하지 못했습니다.");
      }
    };

    document.addEventListener("visibilitychange", markReturned);
    window.addEventListener("focus", markReturned);
    return () => {
      document.removeEventListener("visibilitychange", markReturned);
      window.removeEventListener("focus", markReturned);
    };
  }, [data.audioLaunches, ownerUserId, supabase]);

  useEffect(() => {
    if (!qrState.open || !qrState.target) return undefined;
    let cancelled = false;
    const qrTarget = qrState.target;

    const stopQrScan = () => {
      if (qrTimerRef.current) window.clearInterval(qrTimerRef.current);
      qrTimerRef.current = null;
      if (qrStreamRef.current) qrStreamRef.current.getTracks().forEach((track) => track.stop());
      qrStreamRef.current = null;
      if (qrVideoRef.current) qrVideoRef.current.srcObject = null;
    };

    const applyQrValue = (rawValue: string) => {
      setBookDraft((current) => ({
        ...current,
        audio: { ...current.audio, [qrTarget]: rawValue },
      }));
      setToast("QR 링크를 입력했습니다.");
      setQrState({ open: false, target: null, status: "카메라 권한을 허용하면 QR 코드를 자동으로 읽습니다." });
    };

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        qrStreamRef.current = stream;
        if (!qrVideoRef.current) return;
        qrVideoRef.current.srcObject = stream;
        await qrVideoRef.current.play();
        setQrState((current) => ({
          ...current,
          status: "QR 코드를 화면 중앙에 맞춰 주세요. 안 되면 아래에서 QR 사진을 올리세요.",
        }));

        qrTimerRef.current = window.setInterval(async () => {
          if (!qrVideoRef.current) return;
          const rawValue = readQrValueFromSource(
            qrVideoRef.current,
            qrVideoRef.current.videoWidth,
            qrVideoRef.current.videoHeight,
          );
          if (!rawValue) return;
          applyQrValue(rawValue);
        }, 500);
      } catch {
        setQrState((current) => ({
          ...current,
          status: "카메라를 사용할 수 없습니다. 아래에서 QR 사진을 올리거나 링크를 직접 붙여넣어 주세요.",
        }));
      }
    };

    void start();
    return () => {
      cancelled = true;
      stopQrScan();
    };
  }, [qrState.open, qrState.target]);

  const completionLogs = useMemo<ActivityLog[]>(() => {
    return buildAssignmentActivityLogs(data);
  }, [data]);

  const allLogs = useMemo<ActivityLog[]>(() => [...data.manualLogs, ...completionLogs], [completionLogs, data.manualLogs]);
  const manualLogIds = useMemo(() => new Set(data.manualLogs.map((log) => log.id)), [data.manualLogs]);

  const periodDateKeys = useMemo(() => {
    const { startKey, endKey } = parentActivityRange;
    return datesInRange(startKey, endKey);
  }, [parentActivityRange]);

  const periodRangeLabel = useMemo(() => formatPeriodRangeLabel(period, periodDateKeys), [period, periodDateKeys]);

  const periodLogs = useMemo(() => {
    const startKey = periodDateKeys[0] ?? dateKey();
    const endKey = periodDateKeys[periodDateKeys.length - 1] ?? startKey;
    return allLogs.filter((log) => log.childId === childId && log.date >= startKey && log.date <= endKey);
  }, [allLogs, childId, periodDateKeys]);

  const groupedPeriodLogs = useMemo(() => {
    return periodLogs.reduce<Record<string, ActivityLog[]>>((groups, log) => {
      groups[log.date] ??= [];
      groups[log.date].push(log);
      return groups;
    }, {});
  }, [periodLogs]);

  const activityTableDates = periodDateKeys;

  const filteredLibraryBooks = useMemo(() => {
    const query = bookSearch.trim().toLowerCase();
    return activeBookItems.filter((book) => {
      const matchesSeries = seriesFilter === "all" || book.series === seriesFilter;
      const matchesSearch =
        !query ||
        book.title.toLowerCase().includes(query) ||
        book.series.toLowerCase().includes(query) ||
        book.volume.toLowerCase().includes(query);
      return matchesSeries && matchesSearch;
    });
  }, [activeBookItems, bookSearch, seriesFilter]);

  const bookAssignmentCounts = useMemo(
    () =>
      data.assignments.reduce<Record<string, number>>((counts, assignment) => {
        counts[assignment.bookId] = (counts[assignment.bookId] ?? 0) + 1;
        return counts;
      }, {}),
    [data.assignments],
  );
  const draftRequiredFields = useMemo(() => {
    const missing: string[] = [];
    if (!isWordReadingDraft && !bookDraft.series.trim()) missing.push("시리즈");
    if (!bookDraft.title.trim()) missing.push(isWordReadingDraft ? "단어 읽기 이름" : "책 제목");
    return missing;
  }, [bookDraft.series, bookDraft.title, isWordReadingDraft]);
  const draftSetupIssues = useMemo(() => getBookSetupIssues(bookDraft), [bookDraft]);
  const duplicateBook = useMemo(() => {
    if (!isBookManageDataLoaded) return null;
    const series = normalizeText(bookDraft.series);
    const title = normalizeText(bookDraft.title);
    const volume = normalizeText(bookDraft.volume);
    if (!title || (!isWordReadingDraft && !series)) return null;

    return (
      manageBookResults.find(
        (book) =>
          book.id !== bookDraft.id &&
          book.contentType === bookDraft.contentType &&
          normalizeText(book.series) === series &&
          normalizeText(book.title) === title &&
          normalizeText(book.volume) === volume,
      ) ?? null
    );
  }, [bookDraft.contentType, bookDraft.id, bookDraft.series, bookDraft.title, bookDraft.volume, isBookManageDataLoaded, isWordReadingDraft, manageBookResults]);
  const bookFormDirty = useMemo(
    () => JSON.stringify(bookToDraft(draftSourceBook)) !== JSON.stringify(bookDraft),
    [bookDraft, draftSourceBook],
  );
  const manageReadyCount = useMemo(
    () => activeManageBooks.filter((book) => getBookSetupIssues(book).length === 0).length,
    [activeManageBooks],
  );
  const manageAttentionCount = activeManageBooks.length - manageReadyCount;
  const filteredManageBooks = useMemo(() => {
    if (!isBookManageDataLoaded) return [];
    const query = manageBookSearch.trim().toLowerCase();
    return manageBooks
      .filter((book) => {
        const matchesSeries = manageSeriesFilter === "all" || book.series === manageSeriesFilter;
        const issues = getBookSetupIssues(book);
        const matchesFilter =
          bookListFilter === "inactive"
            ? book.active === false
            : book.active !== false &&
              (bookListFilter === "active" ||
                (bookListFilter === "attention" ? issues.length > 0 : issues.length === 0));
        const matchesQuery =
          !query ||
          [book.title, book.series, book.volume, book.level, book.note].some((field) =>
            field.toLowerCase().includes(query),
          );
        return matchesSeries && matchesFilter && matchesQuery;
      })
      .sort((a, b) => {
        if (a.id === bookDraft.id) return -1;
        if (b.id === bookDraft.id) return 1;
        return a.series.localeCompare(b.series) || a.title.localeCompare(b.title);
      });
  }, [bookDraft.id, bookListFilter, isBookManageDataLoaded, manageBooks, manageBookSearch, manageSeriesFilter]);
  const assignedBookIds = useMemo(() => new Set(assignHistoryBookIds), [assignHistoryBookIds]);
  const selectedAssignBooks = useMemo(
    () =>
      assignSelectedBookIds
        .map((bookId) => activeBooks.find((book) => book.id === bookId))
        .filter((book): book is Book => Boolean(book)),
    [activeBooks, assignSelectedBookIds],
  );
  const assignBookCandidates = useMemo(() => {
    return getAssignmentBookCandidates({
      books: activeBooks,
      selectedBookIds: assignSelectedBookIds,
      assignedBookIds,
      seriesFilter: assignSeriesFilter,
      search: assignBookSearch,
    });
  }, [activeBooks, assignBookSearch, assignSelectedBookIds, assignSeriesFilter, assignedBookIds]);
  const draftTotalAssignmentsCount = bookDraft.id ? bookAssignmentCounts[bookDraft.id] ?? 0 : 0;
  const draftUpcomingAssignmentsCount = useMemo(() => {
    if (!bookDraft.id) return 0;
    const todayKey = dateKey();
    return data.assignments.filter((assignment) => assignment.bookId === bookDraft.id && assignment.date >= todayKey).length;
  }, [bookDraft.id, data.assignments]);

  const selectedTaskLabels = formatAssignmentTaskLabels;

  const showToast = (message: string) => setToast(message);

  const loadBookManageData = async () => {
    setIsLoadingBookManageData(true);
    setSyncError("");

    try {
      const nextData = await fetchBookManageData(supabase, ownerUserId, {
        series: manageSeriesFilter,
        title: manageBookSearch.trim(),
      });
      setManageBookResults(nextData.books);
      setData((current) => {
        const booksById = new Map(current.books.map((book) => [book.id, book]));
        nextData.books.forEach((book) => booksById.set(book.id, book));
        return { ...current, books: [...booksById.values()] };
      });
      setManageSeriesNames((current) => {
        const seriesNames = nextData.books.map((book) => book.series.trim()).filter(Boolean);
        return [...new Set([...current, ...seriesNames])].sort();
      });
      setIsBookManageDataLoaded(true);
      showToast("자료를 조회했습니다.");
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "자료 목록을 불러오지 못했습니다.");
      showToast("자료 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingBookManageData(false);
    }
  };

  const startNewChildDraft = () => {
    setChildDraftMode("new");
    setChildDraft({ ...emptyChildDraft });
  };

  const resetChildDraft = () => {
    if (childDraftMode === "new") {
      setChildDraft({ ...emptyChildDraft });
      return;
    }
    setChildDraft(childToDraft(child));
  };

  const saveChildDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = childDraft.name.trim();
    if (!name) {
      showToast("아동 이름을 먼저 입력하세요.");
      return;
    }

    try {
      const savedChild = await saveChild(supabase, ownerUserId, {
        id: childDraft.id || undefined,
        name,
        level: childDraft.level.trim(),
        goal: childDraft.goal.trim(),
      });

      setData((current) => {
        const existingIndex = current.children.findIndex((item) => item.id === savedChild.id);
        const children = [...current.children];
        if (existingIndex >= 0) children[existingIndex] = savedChild;
        else children.push(savedChild);
        return { ...current, children };
      });
      setChildDraft(childToDraft(savedChild));
      setChildDraftMode("edit");
      setChildId(savedChild.id);
      showToast(childDraft.id ? "아동 정보를 저장했습니다." : "아동을 추가했습니다.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "아동 정보를 저장하지 못했습니다.");
    }
  };

  const startNewBookDraft = (contentType: BookContentType = "book") => {
    setBookDraftMode("new");
    setBookDraft({
      ...bookToDraft(null),
      contentType,
      series: contentType === "wordReading" ? "기타학습" : manageSeriesFilter !== "all" ? manageSeriesFilter : "",
    });
  };

  const resetBookDraft = () => {
    if (bookDraftMode === "new") {
      setBookDraft({
        ...bookToDraft(null),
        contentType: bookDraft.contentType,
        series: isWordReadingDraft ? "기타학습" : manageSeriesFilter !== "all" ? manageSeriesFilter : "",
      });
      return;
    }
    setBookDraft(bookToDraft(draftSourceBook));
  };

  const copyListenToShadow = () => {
    if (!bookDraft.audio.listen.trim()) {
      showToast("읽기 링크를 먼저 입력하세요.");
      return;
    }

    setBookDraft((current) => ({
      ...current,
      audio: {
        ...current.audio,
        shadow: current.audio.listen,
      },
    }));
    showToast("읽기 링크를 정따 링크에 복사했습니다.");
  };

  const readCoverFile = async (file: File | undefined) => {
    if (!file) return;

    try {
      const cover = await compressCoverImage(file);
      setBookDraft((current) => ({ ...current, cover }));
    } catch {
      showToast("표지를 처리하지 못했습니다.");
    }
  };

  const readQrFile = async (file: File | undefined) => {
    if (!file || !qrState.target) return;
    const qrTarget = qrState.target;

    try {
      const bitmap = await createImageBitmap(file);
      const rawValue = readQrValueFromSource(bitmap, bitmap.width, bitmap.height);
      bitmap.close();

      if (!rawValue) {
        showToast("업로드한 이미지에서 QR 코드를 찾지 못했습니다.");
        return;
      }

      setBookDraft((current) => ({
        ...current,
        audio: { ...current.audio, [qrTarget]: rawValue },
      }));
      setQrState({ open: false, target: null, status: "카메라 권한을 허용하면 QR 코드를 자동으로 읽습니다." });
      showToast("QR 사진에서 링크를 읽었습니다.");
    } catch {
      showToast("QR 이미지를 읽지 못했습니다.");
    }
  };

  const saveBookDb = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bookDraft.title.trim() || (!isWordReadingDraft && !bookDraft.series.trim())) return;
    if (isWordReadingDraft && !bookDraft.audio.listen.trim()) {
      showToast("단어 읽기 QR 또는 URL을 먼저 입력하세요.");
      return;
    }
    if (!isValidExternalUrl(bookDraft.audio.listen) || (!isWordReadingDraft && !isValidExternalUrl(bookDraft.audio.shadow))) {
      showToast("링크는 http 또는 https 주소만 저장할 수 있습니다.");
      return;
    }

    const nextBook: Book = {
      id: bookDraft.id,
      active: draftSourceBook?.active ?? true,
      contentType: bookDraft.contentType,
      series: isWordReadingDraft ? bookDraft.series.trim() || "기타학습" : bookDraft.series.trim(),
      title: bookDraft.title.trim(),
      volume: bookDraft.volume.trim(),
      level: bookDraft.level.trim(),
      cover: isWordReadingDraft ? "/assets/app-icon.svg" : bookDraft.cover || "/assets/app-icon.svg",
      audio: {
        listen: bookDraft.audio.listen.trim(),
        shadow: isWordReadingDraft ? "" : bookDraft.audio.shadow.trim(),
      },
      note: bookDraft.note.trim(),
    };

    try {
      const savedBook = await saveBookRecord(supabase, ownerUserId, nextBook);
      setData((current) => {
        const existingIndex = current.books.findIndex((book) => book.id === savedBook.id);
        const books = [...current.books];
        if (existingIndex >= 0) books[existingIndex] = savedBook;
        else books.push(savedBook);
        return { ...current, books };
      });
      setManageBookResults((current) => {
        const existingIndex = current.findIndex((book) => book.id === savedBook.id);
        const books = [...current];
        if (existingIndex >= 0) books[existingIndex] = savedBook;
        else if (isBookManageDataLoaded) books.unshift(savedBook);
        return books;
      });
      setManageSeriesNames((current) =>
        savedBook.series && !current.includes(savedBook.series) ? [...current, savedBook.series].sort() : current,
      );
      setBookDraft(bookToDraft(savedBook));
      setBookDraftMode("edit");
      setBookListFilter(savedBook.active === false ? "inactive" : "active");
      showToast(bookDraft.id ? `${bookContentTypeLabels[savedBook.contentType]} 정보를 저장했습니다.` : `새 ${bookContentTypeLabels[savedBook.contentType]} 자료를 추가했습니다.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "자료 정보를 저장하지 못했습니다.");
    }
  };

  const deactivateBookDb = async () => {
    if (!bookDraft.id) {
      showToast("비활성화할 자료를 먼저 선택하세요.");
      return;
    }
    if (draftUpcomingAssignmentsCount > 0) {
      showToast(`앞으로 예정된 ${draftUpcomingAssignmentsCount}개의 할 일이 있어 먼저 정리해야 합니다.`);
      return;
    }

    try {
      const savedBook = await setBookActive(supabase, ownerUserId, bookDraft.id, false);
      setData((current) => ({
        ...current,
        books: current.books.map((book) => (book.id === savedBook.id ? savedBook : book)),
      }));
      setManageBookResults((current) => current.map((book) => (book.id === savedBook.id ? savedBook : book)));
      setBookDraft(bookToDraft(savedBook));
      setBookListFilter("inactive");
      showToast("자료를 비활성 목록으로 옮겼습니다.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "자료 상태를 바꾸지 못했습니다.");
    }
  };

  const reactivateBookDb = async () => {
    if (!bookDraft.id) {
      showToast("활성화할 자료를 먼저 선택하세요.");
      return;
    }

    try {
      const savedBook = await setBookActive(supabase, ownerUserId, bookDraft.id, true);
      setData((current) => ({
        ...current,
        books: current.books.map((book) => (book.id === savedBook.id ? savedBook : book)),
      }));
      setManageBookResults((current) => current.map((book) => (book.id === savedBook.id ? savedBook : book)));
      setBookDraft(bookToDraft(savedBook));
      setBookListFilter("active");
      showToast("자료를 다시 활성화했습니다.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "자료 상태를 바꾸지 못했습니다.");
    }
  };

  const completeTaskDb = async (taskType: TaskType) => {
    if (!selectedAssignment) return;

    const key = `${selectedAssignment.id}:${taskType}`;
    const launch = data.audioLaunches[key];
    const existingCompletion = data.completions[key];
    const targetCount = getAssignmentTaskCount(selectedAssignment, taskType);
    const currentCount = getCompletionCount(data, selectedAssignment.id, taskType);

    if (currentCount >= targetCount) {
      showToast(`${taskDefinitions[taskType].label}는 이미 ${targetCount}회 완료했습니다.`);
      return;
    }

    try {
      const addedMinutes = taskDefinitions[taskType].needsAudio
        ? getLaunchMinutes(launch, taskDefinitions[taskType].minutes)
        : taskDefinitions[taskType].minutes;
      const savedCompletion = await saveCompletion(supabase, ownerUserId, {
        assignmentId: selectedAssignment.id,
        taskType,
        completedAt: new Date().toISOString(),
        minutes: (existingCompletion?.minutes ?? 0) + addedMinutes,
        audioOpenedAt: launch?.openedAt ?? null,
        count: currentCount + 1,
      });

      setData((current) => ({
        ...current,
        completions: {
          ...current.completions,
          [savedCompletion.key]: savedCompletion.value,
        },
      }));
      showToast(`${taskDefinitions[taskType].label} ${currentCount + 1}회 완료를 저장했습니다.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "완료 기록을 저장하지 못했습니다.");
    }
  };

  const openAudioDb = async (taskType: TaskType) => {
    if (!selectedBook) return;

    const audioUrl = getTaskAudioUrl(selectedBook, taskType);
    if (!audioUrl) {
      showToast(`${taskDefinitions[taskType].label} 링크가 등록되지 않았습니다.`);
      return;
    }

    if (selectedAssignment) {
      try {
        const savedLaunch = await saveAudioLaunch(supabase, ownerUserId, {
          assignmentId: selectedAssignment.id,
          taskType,
          openedAt: new Date().toISOString(),
          returnedAt: null,
        });

        setData((current) => ({
          ...current,
          audioLaunches: {
            ...current.audioLaunches,
            [savedLaunch.key]: savedLaunch.value,
          },
        }));
      } catch (error) {
        showToast(error instanceof Error ? error.message : "오디오 실행 기록을 저장하지 못했습니다.");
        return;
      }
    }

    const audioWindow = window.open(audioUrl, "ewd-naver-audio");
    if (audioWindow) {
      try {
        audioWindow.opener = null;
      } catch {
        // Cross-origin navigation can block opener changes.
      }
      const openedMessage = taskType === "wordRead" ? "단어 읽기 링크를 열었습니다." : "오디오 링크를 열었습니다.";
      showToast(selectedAssignment ? `${openedMessage} 돌아와서 완료를 눌러 주세요.` : openedMessage);
    } else {
      showToast("브라우저가 새 창 열기를 막았습니다. 링크를 직접 열어 주세요.");
    }
  };

  const addManualLogDb = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!childId) {
      showToast("먼저 아동을 추가하세요.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("manualTitle") ?? "").trim();
    if (!title) return;

    try {
      const manualLog = await saveManualLog(supabase, ownerUserId, {
        childId,
        date: String(formData.get("manualDate") ?? dateKey()),
        type: String(formData.get("manualType") ?? "dvd") as ManualLogType,
        title,
        minutes: Number(formData.get("manualMinutes") ?? 0),
        note: String(formData.get("manualNote") ?? "").trim(),
      });

      setData((current) => ({ ...current, manualLogs: [...current.manualLogs, manualLog] }));
      form.reset();
      showToast("수기 기록을 추가했습니다.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "수기 기록을 저장하지 못했습니다.");
    }
  };

  const createAssignmentsDb = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const targetChildId = childId;

    if (!targetChildId) {
      showToast("먼저 아동을 추가하세요.");
      return;
    }

    const startDate = String(formData.get("assignStart") ?? dateKey());
    const endDate = String(formData.get("assignEnd") ?? dateKey());
    const dates = datesInRange(startDate, endDate);
    const selections = selectedAssignBooks.reduce<
      Array<{
        bookId: string;
        activityCategory: ActivityCategory;
        taskCounts: TaskCountMap;
        tasks: TaskType[];
        quizEnabled: boolean;
      }>
    >((acc, book) => {
      const activityCategory = String(formData.get(`assignCategory:${book.id}`) ?? "") as ActivityCategory | "";
      if (!activityCategory) return acc;
      const quizEnabled = String(formData.get(`assignQuiz:${book.id}`) ?? "N") === "Y";

      if (activityCategory === "englishPicture") {
        acc.push({
          bookId: book.id,
          activityCategory,
          taskCounts: { listen: 1 },
          tasks: ["listen"],
          quizEnabled,
        });
        return acc;
      }

      const { tasks, taskCounts } = buildAssignmentTaskCounts(
        activityCategory,
        activityCategoryDefinitions[activityCategory].tasks.reduce<TaskCountMap>((taskAcc, taskType) => {
          taskAcc[taskType] = Number(formData.get(`assignCount:${book.id}:${taskType}`) ?? 0);
          return taskAcc;
        }, {}),
      );

      acc.push({
        bookId: book.id,
        activityCategory,
        taskCounts,
        tasks,
        quizEnabled,
      });
      return acc;
    }, []);

    if (startDate > endDate) {
      showToast("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    if (!dates.length || !selections.length) {
      showToast("책/자료별 활동 구분을 선택하세요.");
      return;
    }

    const invalidSelection = selections.find((selection) => !selection.tasks.length && !selection.quizEnabled);
    if (invalidSelection) {
      const book = getBook(invalidSelection.bookId);
      showToast(`${book?.title ?? "선택한 자료"}의 상세 활동 횟수 또는 퀴즈 Y를 설정하세요.`);
      return;
    }

    const payloads = dates.flatMap((date) =>
      selections.map((selection) => ({
          childId: targetChildId,
          date,
          bookId: selection.bookId,
          activityCategory: selection.activityCategory,
          tasks: [...selection.tasks],
          taskCounts: { ...selection.taskCounts },
          quizEnabled: selection.quizEnabled,
        })),
    );

    try {
      const savedAssignments = await saveAssignments(supabase, ownerUserId, payloads);
      const previousKeys = new Set(
        data.assignments
          .filter((assignment) => assignment.childId === targetChildId)
          .map((assignment) => `${assignment.childId}:${assignment.date}:${assignment.bookId}:${assignment.activityCategory}`),
      );
      const createdCount = savedAssignments.filter(
        (assignment) => !previousKeys.has(`${assignment.childId}:${assignment.date}:${assignment.bookId}:${assignment.activityCategory}`),
      ).length;

      setData((current) => {
        const assignmentMap = new Map(current.assignments.map((assignment) => [assignment.id, assignment]));

        savedAssignments.forEach((assignment) => {
          const existing = current.assignments.find(
            (item) =>
              item.childId === assignment.childId &&
              item.date === assignment.date &&
              item.bookId === assignment.bookId &&
              item.activityCategory === assignment.activityCategory,
          );
          if (existing && existing.id !== assignment.id) {
            assignmentMap.delete(existing.id);
          }
          assignmentMap.set(assignment.id, assignment);
        });

        return {
          ...current,
          assignments: Array.from(assignmentMap.values()),
        };
      });
      setChildId(targetChildId);
      setAssignHistoryBookIds((current) => [
        ...new Set([...current, ...selectedAssignBooks.map((book) => book.id)]),
      ]);
      setAssignSelectedBookIds([]);
      showToast(`${createdCount}개의 할 일을 생성했습니다. 기존 같은 날짜와 자료는 최신 설정으로 갱신했습니다.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "할 일을 저장하지 못했습니다.");
    }
  };

  const deleteAssignmentDb = async (assignmentId: string) => {
    try {
      await deleteAssignmentRecord(supabase, ownerUserId, assignmentId);
      const assignedBookIds = await fetchAssignedBookIds(supabase, ownerUserId);
      setData((current) => {
        const completions = { ...current.completions };
        const audioLaunches = { ...current.audioLaunches };

        Object.keys(completions)
          .filter((key) => key.startsWith(`${assignmentId}:`))
          .forEach((key) => delete completions[key]);
        Object.keys(audioLaunches)
          .filter((key) => key.startsWith(`${assignmentId}:`))
          .forEach((key) => delete audioLaunches[key]);

        return {
          ...current,
          completions,
          audioLaunches,
          assignments: current.assignments.filter((assignment) => assignment.id !== assignmentId),
        };
      });
      setEditingAssignmentId((current) => (current === assignmentId ? null : current));
      setAssignHistoryBookIds(assignedBookIds);
      showToast("할 일을 삭제했습니다.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "할 일을 삭제하지 못했습니다.");
    }
  };

  const updateAssignmentCountsDb = async (assignment: Assignment, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const counts = activityCategoryDefinitions[assignment.activityCategory].tasks.reduce<TaskCountMap>((acc, taskType) => {
      acc[taskType] = Number(formData.get(`assignmentCount:${assignment.id}:${taskType}`) ?? 0);
      return acc;
    }, {});
    const quizEnabled = String(formData.get(`assignmentQuiz:${assignment.id}`) ?? "N") === "Y";
    const { tasks, taskCounts } = buildAssignmentTaskCounts(assignment.activityCategory, counts);

    if (!tasks.length && !quizEnabled) {
      showToast("활동 횟수나 퀴즈 Y를 설정하세요.");
      return;
    }

    try {
      const savedAssignment = await saveAssignmentTaskCounts(supabase, ownerUserId, assignment.id, {
        tasks,
        taskCounts,
        quizEnabled,
      });
      setData((current) => ({
        ...current,
        assignments: current.assignments.map((item) =>
          item.id === savedAssignment.id ? savedAssignment : item,
        ),
      }));
      setEditingAssignmentId(null);
      showToast("할 일을 수정했습니다.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "할 일 횟수를 수정하지 못했습니다.");
    }
  };

  const saveQuizScoreDb = async (quizScore: QuizResult) => {
    if (!selectedAssignment?.quizEnabled) return;

    if (quizScore !== "PASS" && quizScore !== "FAIL") {
      showToast("PASS 또는 FAIL을 선택하세요.");
      return;
    }

    try {
      const savedAssignment = await saveAssignmentQuizScore(
        supabase,
        ownerUserId,
        selectedAssignment.id,
        quizScore,
      );
      setData((current) => ({
        ...current,
        assignments: current.assignments.map((assignment) =>
          assignment.id === savedAssignment.id ? savedAssignment : assignment,
        ),
      }));
      showToast(`퀴즈 ${quizScore} 저장했습니다.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "퀴즈 결과를 저장하지 못했습니다.");
    }
  };

  const deleteManualLogDb = async (manualLog: ManualLog) => {
    const confirmed = window.confirm(`${manualLog.title} 수기 기록을 삭제할까요?`);
    if (!confirmed) return;

    try {
      const deletedId = await deleteManualLog(supabase, ownerUserId, manualLog.id);
      setData((current) => ({
        ...current,
        manualLogs: current.manualLogs.filter((log) => log.id !== deletedId),
      }));
      showToast("수기 기록을 삭제했습니다.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "수기 기록을 삭제하지 못했습니다.");
    }
  };

  const renderCell = (
    logs: ActivityLog[],
    matcher: {
      types?: ActivityLog["type"] | ActivityLog["type"][];
      activityCategories?: ActivityCategory | ActivityCategory[];
      bookSummary?: boolean;
    },
  ) => (
    <ActivityLogCell
      logs={logs}
      matcher={matcher}
      manualLogIds={manualLogIds}
      getBook={getBook}
      onDeleteManualLog={deleteManualLogDb}
    />
  );

  const addChildManualLogDb = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!childId) {
      showToast("먼저 아동을 선택하세요.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("childManualTitle") ?? "").trim();
    const type = String(formData.get("childManualType") ?? "korean") as ChildManualLogType;
    if (!title) return;
    if (type !== "korean" && type !== "englishPicture") {
      showToast("기록 구분을 다시 선택하세요.");
      return;
    }

    try {
      const manualLog = await saveManualLog(supabase, ownerUserId, {
        childId,
        date: dateKey(),
        type,
        title,
        minutes: Number(formData.get("childManualMinutes") ?? 10),
        note: "",
      });

      setData((current) => ({ ...current, manualLogs: [...current.manualLogs, manualLog] }));
      form.reset();
      setIsChildManualLogOpen(false);
      showToast("읽은 책 기록을 추가했습니다.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "읽은 책 기록을 저장하지 못했습니다.");
    }
  };

  const printWeeklyActivityReport = () => {
    if (!childId) {
      showToast("PDF로 출력할 아동을 먼저 선택하세요.");
      return;
    }

    setPeriod("week");
    setParentPanel("activity");
    setWeeklyPrintRequested(true);
  };

  const doneTaskCount = todayAssignments.reduce(
    (sum, assignment) => sum + countAssignmentProgress(data, assignment).done,
    0,
  );
  const totalTaskCount = todayAssignments.reduce((sum, assignment) => sum + countAssignmentProgress(data, assignment).total, 0);
  const totalMinutes = periodLogs.reduce((sum, log) => sum + Number(log.minutes || 0), 0);
  const readBookCount = new Set(
    periodLogs
      .filter((log) => {
        const book = log.bookId ? getBook(log.bookId) : undefined;
        return Boolean(book && !isWordReadingMaterial(book));
      })
      .map((log) => log.bookId),
  ).size;
  const childAssignments = getUpcomingAssignments(data.assignments, childId, dateKey());
  const hasChildren = data.children.length > 0;
  const isParentProfile = activeProfile?.kind === "parent";
  const isChildProfile = activeProfile?.kind === "child";
  const isLibraryProfile = activeProfile?.kind === "library";
  const activeProfileChild = isChildProfile ? data.children.find((item) => item.id === activeProfile.childId) ?? null : null;
  const profileChoices = [
    { id: "parent", label: "부모 관리", description: "기록, 책 관리, 할 일 배정까지 모두 사용합니다." },
    { id: "library", label: "도서관", description: "책을 검색하고 필요할 때 오디오를 엽니다." },
    ...data.children.map((item) => ({
      id: item.id,
      label: item.name,
      description: item.goal || item.level || "아동 읽기 화면만 사용합니다.",
    })),
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            EwD
          </div>
          <div>
            <p>English with Dad</p>
            <h1>책 읽기 관리</h1>
          </div>
        </div>

        {isParentProfile ? (
          <nav className="mode-switch" aria-label="화면 선택">
            {[
              ["parent", "부모"],
              ["books", "자료 관리"],
              ["assign", "할 일 배정"],
            ].map(([target, label]) => (
              <button
                className={view === target ? "is-active" : ""}
                type="button"
                data-view-target={target}
                key={target}
                onClick={() => setView(target as ViewName)}
              >
                {label}
              </button>
            ))}
          </nav>
        ) : (
          <div className="profile-summary" aria-live="polite">
            <span className="summary-pill">
              <strong>{isLibraryProfile ? "도서관" : activeProfileChild?.name ?? "프로필 선택"}</strong>
              {!isLibraryProfile && activeProfileChild?.level ? ` · ${activeProfileChild.level}` : ""}
            </span>
          </div>
        )}

        <div className="topbar-actions">
          {isParentProfile && (
            <label className="child-picker">
              <span>아동</span>
              <select
                disabled={!hasChildren}
                value={childId}
                onChange={(event) => {
                  setChildId(event.target.value);
                  setSelectedAssignmentId("");
                  setSelectedBookId("");
                }}
              >
                {!hasChildren && <option value="">아동을 먼저 추가하세요</option>}
                {data.children.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name} · {item.level}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="ghost-button" type="button" onClick={() => setActiveProfile(null)}>
            {activeProfile ? "프로필 관리" : "프로필 선택"}
          </button>
          {isParentProfile && (
            <button className="secondary-button" type="button" onClick={onSignOut} disabled={isSigningOut}>
              {isSigningOut ? "로그아웃 중..." : "로그아웃"}
            </button>
          )}
        </div>
      </header>

      <main>
        {isLoadingProfileData ? (
          <section className="inline-banner">프로필을 불러오는 중입니다.</section>
        ) : (
          isLoadingData && <section className="inline-banner">선택한 화면 데이터를 불러오는 중입니다.</section>
        )}
        {syncError && <section className="inline-banner is-error">{syncError}</section>}

        {!isLoadingProfileData && !activeProfile && (
          <section className="profile-gate" aria-labelledby="profileGateTitle">
            <div className="section-heading">
              <div>
                <p className="eyebrow">프로필 관리</p>
                <h2 id="profileGateTitle">사용할 프로필을 고르세요</h2>
              </div>
            </div>
            <div className="profile-grid">
              {profileChoices.map((profile) => (
                <button
                  className="profile-card"
                  type="button"
                  key={profile.id}
                  onClick={() => {
                    if (profile.id === "parent") {
                      setActiveProfile({ kind: "parent" });
                      setView("parent");
                      return;
                    }
                    if (profile.id === "library") {
                      setActiveProfile({ kind: "library" });
                      setSelectedAssignmentId("");
                      setSelectedBookId("");
                      return;
                    }
                    setActiveProfile({ kind: "child", childId: profile.id });
                    setView("child");
                    setChildId(profile.id);
                    setSelectedAssignmentId("");
                    setSelectedBookId("");
                  }}
                >
                  <span className="profile-tag">{profile.id === "parent" ? "관리" : profile.id === "library" ? "도서" : "아동"}</span>
                  <strong>{profile.label}</strong>
                  <p>{profile.description}</p>
                </button>
              ))}
            </div>

            <div className="management-grid profile-management-grid">
              <section className="parent-section" aria-labelledby="childManageTitle">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">아동 정보</p>
                    <h2 id="childManageTitle">{childDraft.id ? "아동 정보 수정" : "새 아동 추가"}</h2>
                  </div>
                  <div className="form-actions">
                    <button className="ghost-button" type="button" onClick={startNewChildDraft}>
                      새 아동
                    </button>
                    <button className="secondary-button" type="button" onClick={resetChildDraft}>
                      선택값 불러오기
                    </button>
                  </div>
                </div>

                <form className="form-grid" onSubmit={saveChildDraft}>
                  <label>
                    이름
                    <input
                      value={childDraft.name}
                      type="text"
                      required
                      onChange={(event) => setChildDraft((current) => ({ ...current, name: event.target.value }))}
                    />
                  </label>
                  <label>
                    레벨
                    <input
                      value={childDraft.level}
                      type="text"
                      onChange={(event) => setChildDraft((current) => ({ ...current, level: event.target.value }))}
                    />
                  </label>
                  <label className="wide">
                    목표
                    <input
                      value={childDraft.goal}
                      type="text"
                      placeholder="예: 오늘 3개 활동"
                      onChange={(event) => setChildDraft((current) => ({ ...current, goal: event.target.value }))}
                    />
                  </label>
                  <div className="form-actions wide">
                    <button className="primary-button" type="submit">
                      {childDraft.id ? "아동 저장" : "아동 추가"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="parent-section" aria-labelledby="childListTitle">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">아동 목록</p>
                    <h2 id="childListTitle">등록된 아동</h2>
                  </div>
                </div>

                <div className="manage-list">
                  {hasChildren ? (
                    data.children.map((item) => (
                      <article className={`child-item ${item.id === childDraft.id ? "is-selected" : ""}`} key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setChildDraftMode("edit");
                            setChildDraft(childToDraft(item));
                            setChildId(item.id);
                          }}
                        >
                          <h3>{item.name}</h3>
                          <p>{item.level || "레벨 미입력"}</p>
                          <span className="status-row">
                            <span className="status-badge done">{item.goal || "목표 미입력"}</span>
                          </span>
                        </button>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state">먼저 아동을 추가하세요. 추가한 즉시 과제와 기록에 연결됩니다.</div>
                  )}
                </div>
              </section>
            </div>
          </section>
        )}

        {isChildProfile && view === "child" && (
          <section className="view is-active" aria-labelledby="childTitle">
            <div className="section-heading">
              <div>
                <p className="eyebrow">오늘의 학습</p>
                <h2 id="childTitle">해야 할 활동을 바로 확인</h2>
              </div>
              <div className="summary-strip">
                <span className="summary-pill">
                  <strong>{child.name}</strong> · {child.goal}
                </span>
                <span className="summary-pill">
                  <strong>{doneTaskCount}</strong>/{totalTaskCount} 완료
                </span>
                <span className="summary-pill">
                  <strong>{todayAssignments.length}</strong>건 예정
                </span>
                <button className="secondary-button child-quick-log-button" type="button" onClick={() => setIsChildManualLogOpen(true)}>
                  읽은 책 기록
                </button>
              </div>
            </div>

            <div className="child-grid">
              <section aria-label="오늘 해야 할 학습">
                <div className="assignment-list">
                  {todayAssignments.length ? (
                    todayAssignments.map((assignment) => {
                      const book = getBook(assignment.bookId);
                      if (!book) return null;
                      const progress = countAssignmentProgress(data, assignment);
                      return (
                        <button
                          className={`assignment-card ${assignment.id === selectedAssignmentId ? "is-active" : ""} ${progress.done === progress.total ? "is-complete" : ""}`}
                          type="button"
                          key={assignment.id}
                          onClick={() => {
                            setSelectedAssignmentId(assignment.id);
                            setSelectedBookId("");
                          }}
                        >
                          <MaterialThumb book={book} />
                          <div className="assignment-card-copy">
                            <div className="assignment-card-header">
                              <div className="assignment-card-heading">
                                <h3>{book.title}</h3>
                                <span className="assignment-meta">
                                  {book.series}
                                </span>
                              </div>
                              <span className={`assignment-state-badge ${progress.done === progress.total ? "is-complete" : ""}`}>
                                {progress.done === progress.total ? "완료" : "진행 중"}
                              </span>
                            </div>
                            <div className="assignment-progress-row">
                              <span className="progress-bar" aria-label={`${progress.done}/${progress.total} 완료`}>
                                <span style={{ "--value": `${progress.percent}%` } as CSSProperties} />
                              </span>
                              <span className="assignment-progress-count">
                                {progress.done}/{progress.total} 완료
                              </span>
                            </div>
                            <span className="assignment-progress-note">
                              {selectedTaskLabels(assignment)}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="empty-state">오늘 등록된 할 일이 없습니다.</div>
                  )}
                </div>
              </section>

              <section className="task-panel" aria-label="선택한 학습 활동">
                {selectedBook ? (
                  <>
                    <div className="selected-book-header">
                      <MaterialThumb book={selectedBook} className="book-cover" />
                      <div>
                        <p className="eyebrow">{selectedBook.series}</p>
                        <h3>{selectedBook.title}</h3>
                        {selectedAssignment && (
                          <p className="task-meta">{activityCategoryDefinitions[selectedAssignment.activityCategory].label}</p>
                        )}
                        <p className="book-meta">
                          {formatMaterialMeta(selectedBook) ? (
                            <>
                              {formatMaterialMeta(selectedBook)}
                              <br />
                            </>
                          ) : null}
                          {selectedBook.note}
                        </p>
                        <div className="status-row">
                          {sortTasks(selectedMaterialTasks).map((taskType) => {
                            const completedCount = selectedAssignment
                              ? getCompletionCount(data, selectedAssignment.id, taskType)
                              : 0;
                            const targetCount = selectedAssignment ? getAssignmentTaskCount(selectedAssignment, taskType) : 1;
                            const done = completedCount >= targetCount;
                            return (
                              <span className={`status-badge ${done ? "done" : "todo"}`} key={taskType}>
                                {taskDefinitions[taskType].label} {completedCount}/{targetCount}회
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="task-list">
                      {sortTasks(selectedMaterialTasks).map((taskType) => {
                        const completion = selectedAssignment
                          ? data.completions[`${selectedAssignment.id}:${taskType}`]
                          : null;
                        const completedCount = selectedAssignment ? getCompletionCount(data, selectedAssignment.id, taskType) : 0;
                        const targetCount = selectedAssignment ? getAssignmentTaskCount(selectedAssignment, taskType) : 1;
                        const done = completedCount >= targetCount;
                        const launch = selectedAssignment ? data.audioLaunches[`${selectedAssignment.id}:${taskType}`] : null;
                        const audioUrl = getTaskAudioUrl(selectedBook, taskType);
                        const launchLabel = taskType === "wordRead" ? "링크" : "오디오";
                        return (
                          <div key={taskType}>
                            <div className={`task-row ${done ? "is-done" : ""}`}>
                              <div>
                                <h4>{taskDefinitions[taskType].label}</h4>
                                <p className="task-meta">
                                  {completion
                                    ? `${formatTime(completion.completedAt)} 기준 ${completedCount}/${targetCount}회 · ${completion.minutes}분`
                                    : `${taskDefinitions[taskType].minutes}분씩 ${targetCount}회`}
                                </p>
                              </div>
                              <div className="task-actions">
                                {taskDefinitions[taskType].needsAudio && (
                                  <button
                                    className="secondary-button"
                                    type="button"
                                    disabled={!audioUrl}
                                    onClick={() => openAudioDb(taskType)}
                                  >
                                    {launchLabel} 열기
                                  </button>
                                )}
                                {selectedAssignment && !taskDefinitions[taskType].needsAudio ? (
                                  <button className="primary-button" type="button" onClick={() => completeTaskDb(taskType)} disabled={done}>
                                    {done ? "완료됨" : `${completedCount + 1}회 완료`}
                                  </button>
                                ) : (
                                  !selectedAssignment && (
                                    <button
                                      className="secondary-button"
                                      type="button"
                                      onClick={() => showToast("부모의 할 일 배정 화면에서 날짜별로 등록할 수 있습니다.")}
                                    >
                                      할 일 배정에서 등록
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                            {selectedAssignment && taskDefinitions[taskType].needsAudio && launch && !done && (
                              <div className="return-box">
                                <h4>{taskDefinitions[taskType].label} {launchLabel} 실행 기록</h4>
                                <p className="task-meta">
                                  {launchLabel} 열기 {formatTime(launch.openedAt)} ·{" "}
                                  {launch.returnedAt
                                    ? `앱으로 돌아온 시간 ${formatTime(launch.returnedAt)}`
                                    : `${launchLabel} 탭을 열어두었습니다.`}
                                </p>
                                <div className="audio-actions">
                                  <button className="primary-button" type="button" onClick={() => completeTaskDb(taskType)}>
                                    {completedCount + 1}회 완료
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {selectedAssignment?.quizEnabled && (
                        <AssignmentQuizScore
                          assignmentId={selectedAssignment.id}
                          score={selectedAssignment.quizScore}
                          onSave={saveQuizScoreDb}
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <div className="empty-state">학습 항목을 선택하세요.</div>
                )}
              </section>
            </div>

          </section>
        )}

        {isLibraryProfile && (
          <section className="view is-active" aria-labelledby="libraryTitle">
            <div className="section-heading">
              <div>
                <p className="eyebrow">도서관</p>
                <h2 id="libraryTitle">책을 검색해서 듣기</h2>
              </div>
              <div className="library-tools">
                <select value={seriesFilter} aria-label="시리즈 선택" onChange={(event) => setSeriesFilter(event.target.value)}>
                  <option value="all">전체 시리즈</option>
                  {seriesNames.map((series) => (
                    <option value={series} key={series}>
                      {series}
                    </option>
                  ))}
                </select>
                <input
                  value={bookSearch}
                  type="search"
                  placeholder="책 제목 검색"
                  onChange={(event) => setBookSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="child-grid library-view-grid">
              <section className="library-section" aria-label="도서관 책 목록">
                <div className="library-grid">
                  {filteredLibraryBooks.length ? (
                    filteredLibraryBooks.map((book) => (
                      <article className="book-card" key={book.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBookId(book.id);
                            setSelectedAssignmentId("");
                          }}
                        >
                          <MaterialThumb book={book} className="book-cover" />
                          <span>
                            <p className="eyebrow">{book.series}</p>
                            <h3>{book.title}</h3>
                            <span className="book-meta">
                              {book.level} · {book.volume}
                            </span>
                          </span>
                        </button>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state">검색 결과가 없습니다.</div>
                  )}
                </div>
              </section>

              <section className="task-panel" aria-label="선택한 책 듣기">
                {selectedBook ? (
                  <>
                    <div className="selected-book-header">
                      <MaterialThumb book={selectedBook} className="book-cover" />
                      <div>
                        <p className="eyebrow">{selectedBook.series}</p>
                        <h3>{selectedBook.title}</h3>
                        <p className="book-meta">
                          {formatMaterialMeta(selectedBook) ? (
                            <>
                              {formatMaterialMeta(selectedBook)}
                              <br />
                            </>
                          ) : null}
                          {selectedBook.note}
                        </p>
                      </div>
                    </div>

                    <div className="task-list">
                      {sortTasks(selectedMaterialTasks).map((taskType) => {
                        const audioUrl = getTaskAudioUrl(selectedBook, taskType);
                        const launchLabel = taskType === "wordRead" ? "링크" : "오디오";
                        return (
                          <div className="task-row" key={taskType}>
                            <div>
                              <h4>{taskDefinitions[taskType].label}</h4>
                              <p className="task-meta">
                                {audioUrl ? `${launchLabel}를 열 수 있습니다.` : `${taskDefinitions[taskType].label} 링크가 없습니다.`}
                              </p>
                            </div>
                            <div className="task-actions">
                              <button
                                className="secondary-button"
                                type="button"
                                disabled={!audioUrl}
                                onClick={() => openAudioDb(taskType)}
                              >
                                {launchLabel} 열기
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {selectedAssignment?.quizEnabled && (
                        <AssignmentQuizScore
                          assignmentId={selectedAssignment.id}
                          score={selectedAssignment.quizScore}
                          onSave={saveQuizScoreDb}
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <div className="empty-state">도서관에서 책을 선택하세요.</div>
                )}
              </section>
            </div>
          </section>
        )}

        {isParentProfile && view === "parent" && (
          <section className="view is-active" aria-labelledby="parentTitle">
            <div className="section-heading">
              <div>
                <p className="eyebrow">부모 관리</p>
                <h2 id="parentTitle">{parentPanel === "activity" ? "활동 기록" : "수기 입력"}</h2>
              </div>
              <div className="period-toolbar">
                <div className="parent-panel-switch" aria-label="부모 관리 화면 선택">
                  {([
                    ["activity", "활동 기록"],
                    ["manual", "수기 입력"],
                  ] as Array<[ParentPanel, string]>).map(([panel, label]) => (
                    <button
                      className={parentPanel === panel ? "is-active" : ""}
                      type="button"
                      key={panel}
                      onClick={() => setParentPanel(panel)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {parentPanel === "activity" ? (
              <>
                <div className="activity-control-panel" aria-label="활동 기록 조회 도구">
                  <div className="period-switch" aria-label="기간 선택">
                    {(["week", "month"] as Period[]).map((item) => (
                      <button
                        className={period === item ? "is-active" : ""}
                        type="button"
                        key={item}
                        onClick={() => setPeriod(item)}
                      >
                        {{ week: "주", month: "월" }[item]}
                      </button>
                    ))}
                  </div>
                  <div className="period-navigation" aria-label="활동 기록 기간 이동">
                    <button
                      className="period-nav-button"
                      type="button"
                      aria-label="이전 기간"
                      onClick={() => setSelectedDateKey((value) => shiftSelectedDateKey(value, period, -1))}
                    >
                      ‹
                    </button>
                    <label className="period-date-picker">
                      <span>{periodRangeLabel}</span>
                      <input
                        type="date"
                        aria-label="활동 기록 기준 날짜 선택"
                        value={selectedDateKey}
                        onChange={(event) => setSelectedDateKey(event.target.value || dateKey())}
                      />
                    </label>
                    <button className="period-today-button" type="button" onClick={() => setSelectedDateKey(dateKey())}>
                      오늘
                    </button>
                    <button
                      className="period-nav-button"
                      type="button"
                      aria-label="다음 기간"
                      onClick={() => setSelectedDateKey((value) => shiftSelectedDateKey(value, period, 1))}
                    >
                      ›
                    </button>
                  </div>
                  <button className="secondary-button print-action" type="button" onClick={printWeeklyActivityReport}>
                    주간 PDF 출력
                  </button>
                </div>

                <div className="stats-grid">
                  {[
                    ["선택 아동", childSummary.name],
                    ["기간 활동", `${periodLogs.length}건`],
                    ["읽기 시간", `${totalMinutes}분`],
                    ["읽은 책", `${readBookCount}권`],
                  ].map(([label, value]) => (
                    <article className="stat" key={label}>
                      <p>{label}</p>
                      <strong>{value}</strong>
                    </article>
                  ))}
                </div>

                <section className="parent-section print-report" aria-labelledby="logTitle">
                  <div className="section-heading compact">
                    <div>
                      <p className="eyebrow">진행표</p>
                      <h2 id="logTitle">활동 기록</h2>
                      <p className="print-only report-subtitle">
                        {childSummary.name} · {periodRangeLabel} · 활동 {periodLogs.length}건 · 읽기 {totalMinutes}분 · 읽은 책 {readBookCount}권
                      </p>
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table className="activity-table">
                      <thead>
                        <tr>
                          <th>날짜</th>
                          <th>DVD</th>
                          <th>흘려듣기</th>
                          <th>집중듣기</th>
                          <th>소리내어 읽기</th>
                          <th>한글책</th>
                          <th>영어 그림책</th>
                          <th>기타학습</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityTableDates.length ? (
                          activityTableDates.map((date) => {
                            const logs = groupedPeriodLogs[date] ?? [];
                            return (
                              <tr key={date}>
                                <td>
                                  <strong>{formatDate(date, { includeWeekday: true })}</strong>
                                </td>
                                <td>{renderCell(logs, { types: "dvd" })}</td>
                                <td>{renderCell(logs, { types: "passiveListen" })}</td>
                                <td>{renderCell(logs, { activityCategories: "focusListen", bookSummary: true })}</td>
                                <td>{renderCell(logs, { activityCategories: "readAloud", bookSummary: true })}</td>
                                <td>{renderCell(logs, { types: "korean" })}</td>
                                <td>{renderCell(logs, { types: "englishPicture", activityCategories: "englishPicture", bookSummary: true })}</td>
                                <td>{renderCell(logs, { types: "extraStudy", activityCategories: "extraStudy" })}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8}>
                              <div className="empty-state">선택한 기간에 기록이 없습니다.</div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : (
              <section className="parent-section" aria-labelledby="manualLogTitle">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">수기 입력</p>
                    <h2 id="manualLogTitle">부모 직접 입력</h2>
                  </div>
                </div>
                <form className="form-grid" onSubmit={addManualLogDb}>
                  <label>
                    날짜
                    <input name="manualDate" type="date" required defaultValue={dateKey()} />
                  </label>
                  <label>
                    구분
                    <select name="manualType" defaultValue="dvd">
                      <option value="dvd">DVD</option>
                      <option value="passiveListen">흘려듣기</option>
                      <option value="korean">한글책</option>
                      <option value="englishPicture">영어 그림책</option>
                      <option value="extraStudy">기타학습</option>
                    </select>
                  </label>
                  <label>
                    제목/내용
                    <input name="manualTitle" type="text" placeholder="Arthur DVD, 영어 단어장 2쪽" required />
                  </label>
                  <label>
                    시간
                    <input name="manualMinutes" type="number" min="0" step="5" defaultValue="20" />
                  </label>
                  <label className="wide">
                    특이사항
                    <input name="manualNote" type="text" placeholder="선택 입력" />
                  </label>
                  <button className="primary-button" type="submit">
                    기록 추가
                  </button>
                </form>
              </section>
            )}

          </section>
        )}

        {isParentProfile && view === "books" && (
          <section className="view is-active" aria-labelledby="bookManageTitle">
            <div className="section-heading">
              <div>
                <p className="eyebrow">자료 관리</p>
                <h2 id="bookManageTitle">책과 단어 읽기 자료 입력</h2>
              </div>
              <div className="summary-strip">
                <span className="summary-pill">
                  조회 결과 <strong>{isBookManageDataLoaded ? activeManageBooks.length : "-"}</strong>건 운영 중
                </span>
                <span className="summary-pill">
                  <strong>{isBookManageDataLoaded ? manageAttentionCount : "-"}</strong>건 입력 필요
                </span>
                <span className="summary-pill">
                  <strong>{isBookManageDataLoaded ? inactiveManageBooks.length : "-"}</strong>건 비활성
                </span>
              </div>
            </div>

            <div className="management-grid">
              <section className="parent-section" aria-label="자료 입력 양식">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">
                      {draftSourceBook
                        ? draftSourceBook.active === false
                          ? `비활성 ${bookContentTypeLabels[draftSourceBook.contentType]} 수정`
                          : `${bookContentTypeLabels[draftSourceBook.contentType]} 수정`
                        : `새 ${draftContentTypeLabel} 입력`}
                    </p>
                    <h2>{draftSourceBook ? draftSourceBook.title : `새 ${draftContentTypeLabel} 등록`}</h2>
                  </div>
                  <div className="form-actions">
                    <button className="ghost-button" type="button" onClick={() => startNewBookDraft("book")}>
                      새 책 입력
                    </button>
                    <button className="ghost-button" type="button" onClick={() => startNewBookDraft("wordReading")}>
                      새 단어 읽기
                    </button>
                    <button className="secondary-button" type="button" onClick={resetBookDraft} disabled={!bookFormDirty}>
                      변경 취소
                    </button>
                  </div>
                </div>

                <div className="book-editor-meta">
                  <span className={`status-badge ${draftSourceBook?.active === false ? "" : "done"}`}>
                    {draftSourceBook ? (draftSourceBook.active === false ? `비활성 ${draftContentTypeLabel}` : "수정 중") : "신규 입력"}
                  </span>
                  <span className="status-badge">{draftContentTypeLabel}</span>
                  <span className={`status-badge ${bookFormDirty ? "todo" : "done"}`}>
                    {bookFormDirty ? "저장 전 변경 있음" : "저장 완료 상태"}
                  </span>
                  <span className={`status-badge ${draftSetupIssues.length ? "todo" : "done"}`}>
                    {draftSetupIssues.length ? `보완 ${draftSetupIssues.length}개` : "배정 준비 완료"}
                  </span>
                </div>

                {(draftRequiredFields.length > 0 ||
                  draftSetupIssues.length > 0 ||
                  duplicateBook ||
                  draftTotalAssignmentsCount > 0) && (
                  <div className="book-alert-stack">
                    {draftRequiredFields.length > 0 && (
                      <div className="book-alert">
                        필수 항목을 먼저 채워 주세요: {draftRequiredFields.join(", ")}
                      </div>
                    )}
                    {draftSetupIssues.length > 0 && (
                      <div className="book-alert warning">
                        배정 전에 보완하면 좋은 항목: {draftSetupIssues.join(", ")}
                      </div>
                    )}
                    {duplicateBook && (
                      <div className="book-alert warning">
                        같은 자료 후보가 있습니다: {duplicateBook.series} · {duplicateBook.title}
                        {duplicateBook.volume ? ` · ${duplicateBook.volume}` : ""}
                      </div>
                    )}
                    {draftTotalAssignmentsCount > 0 && (
                      <div className="book-alert info">
                        이 자료는 현재 할 일 {draftTotalAssignmentsCount}건에 연결되어 있습니다.
                        {draftUpcomingAssignmentsCount > 0
                          ? ` 예정된 ${draftUpcomingAssignmentsCount}건이 남아 있어 바로 비활성화할 수 없습니다.`
                          : " 예정된 할 일이 없어서 비활성화할 수 있습니다."}
                      </div>
                    )}
                  </div>
                )}

                <form className="book-form" onSubmit={saveBookDb}>
                  <label>
                    자료 종류
                    <select
                      value={bookDraft.contentType}
                      disabled={draftTotalAssignmentsCount > 0}
                      onChange={(event) => {
                        const contentType = event.target.value as BookContentType;
                        setBookDraft((current) => ({
                          ...current,
                          contentType,
                          series:
                            contentType === "wordReading"
                              ? current.series.trim() || "기타학습"
                              : current.contentType === "wordReading" && current.series === "기타학습"
                                ? ""
                                : current.series,
                          cover: contentType === "wordReading" ? "" : current.cover,
                          audio: {
                            listen: current.audio.listen,
                            shadow: contentType === "wordReading" ? "" : current.audio.shadow,
                          },
                        }));
                      }}
                    >
                      <option value="book">책</option>
                      <option value="wordReading">단어 읽기</option>
                    </select>
                  </label>
                  <label>
                    {isWordReadingDraft ? "분류" : "시리즈"}
                    <input
                      value={bookDraft.series}
                      type="text"
                      list="seriesList"
                      required={!isWordReadingDraft}
                      placeholder={isWordReadingDraft ? "기타학습" : ""}
                      onChange={(event) => setBookDraft((current) => ({ ...current, series: event.target.value }))}
                    />
                    <datalist id="seriesList">
                      {allSeriesNames.map((series) => (
                        <option value={series} key={series} />
                      ))}
                    </datalist>
                  </label>
                  <label>
                    {isWordReadingDraft ? "단어 읽기 이름" : "책 제목"}
                    <input
                      value={bookDraft.title}
                      type="text"
                      required
                      onChange={(event) => setBookDraft((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>
                  <label>
                    {isWordReadingDraft ? "세트/쪽" : "권수/구분"}
                    <input
                      value={bookDraft.volume}
                      type="text"
                      placeholder={isWordReadingDraft ? "Sight Word 350-12" : "First Time Books, G1 Science 4"}
                      onChange={(event) => setBookDraft((current) => ({ ...current, volume: event.target.value }))}
                    />
                  </label>
                  <label>
                    레벨
                    <input
                      value={bookDraft.level}
                      type="text"
                      placeholder="English w.M 29"
                      onChange={(event) => setBookDraft((current) => ({ ...current, level: event.target.value }))}
                    />
                  </label>
                  {!isWordReadingDraft && (
                    <>
                      <label>표지 사진</label>
                      <div className="wide upload-action-row">
                        <label className="secondary-button file-action">
                          카메라로 찍기
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(event) => readCoverFile(event.target.files?.[0])}
                          />
                        </label>
                        <label className="ghost-button file-action">
                          사진첩에서 선택
                          <input type="file" accept="image/*" onChange={(event) => readCoverFile(event.target.files?.[0])} />
                        </label>
                      </div>
                      <div className="cover-preview">
                        {bookDraft.cover ? <img src={bookDraft.cover} alt="표지 미리보기" /> : <span className="task-meta">표지 사진을 찍거나 업로드하세요.</span>}
                        {!hasCustomCover(bookDraft.cover) && (
                          <p className="task-meta">표지가 없으면 기본 아이콘으로 저장됩니다. 사진첩 이미지를 올리면 테두리를 정리한 표지도 쓸 수 있습니다.</p>
                        )}
                      </div>
                    </>
                  )}
                  <label className="wide">
                    {isWordReadingDraft ? "단어 읽기 QR/URL" : "읽기 네이버 링크"}
                    <span className="inline-field">
                      <input
                        value={bookDraft.audio.listen}
                        type="url"
                        placeholder="QR 스캔 또는 링크 붙여넣기"
                        onChange={(event) =>
                          setBookDraft((current) => ({
                            ...current,
                            audio: { ...current.audio, listen: event.target.value },
                          }))
                        }
                      />
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() =>
                          setQrState({
                            open: true,
                            target: "listen",
                            status: "카메라 권한을 허용하면 QR 코드를 자동으로 읽습니다.",
                          })
                        }
                      >
                        QR 스캔
                      </button>
                    </span>
                  </label>
                  {!isWordReadingDraft && (
                    <label className="wide">
                      정따 네이버 링크
                      <span className="inline-field">
                        <input
                          value={bookDraft.audio.shadow}
                          type="url"
                          placeholder="QR 스캔 또는 링크 붙여넣기"
                          onChange={(event) =>
                            setBookDraft((current) => ({
                              ...current,
                              audio: { ...current.audio, shadow: event.target.value },
                            }))
                          }
                        />
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() =>
                            setQrState({
                              open: true,
                              target: "shadow",
                              status: "카메라 권한을 허용하면 QR 코드를 자동으로 읽습니다.",
                            })
                          }
                        >
                          QR 스캔
                        </button>
                      </span>
                    </label>
                  )}
                  <div className="wide quick-link-actions">
                    {!isWordReadingDraft && (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={copyListenToShadow}
                        disabled={!bookDraft.audio.listen.trim() || bookDraft.audio.shadow.trim() === bookDraft.audio.listen.trim()}
                      >
                        읽기 링크를 정따에 복사
                      </button>
                    )}
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        setBookDraft((current) => ({
                          ...current,
                          audio: { listen: "", shadow: "" },
                        }))
                      }
                      disabled={!bookDraft.audio.listen.trim() && !bookDraft.audio.shadow.trim()}
                    >
                      링크 비우기
                    </button>
                  </div>
                  <label className="wide">
                    메모
                    <textarea
                      value={bookDraft.note}
                      rows={3}
                      placeholder={isWordReadingDraft ? "단어 범위, 주의사항" : "책 내용, 난이도, 주의사항"}
                      onChange={(event) => setBookDraft((current) => ({ ...current, note: event.target.value }))}
                    />
                  </label>
                  <div className="book-checklist wide" aria-label="자료 입력 체크리스트">
                    {([
                      ...(isWordReadingDraft ? [] : [["시리즈", Boolean(bookDraft.series.trim())]]),
                      [isWordReadingDraft ? "단어 읽기 이름" : "책 제목", Boolean(bookDraft.title.trim())],
                      ...(isWordReadingDraft
                        ? [["단어 읽기 링크", Boolean(bookDraft.audio.listen.trim())]]
                        : [
                            ["표지", hasCustomCover(bookDraft.cover)],
                            ["읽기 링크", Boolean(bookDraft.audio.listen.trim())],
                            ["정따 링크", Boolean(bookDraft.audio.shadow.trim())],
                          ]),
                    ] as Array<[string, boolean]>).map(([label, done]) => (
                      <span className={`check-pill ${done ? "is-done" : ""}`} key={label}>
                        {done ? "완료" : "대기"} · {label}
                      </span>
                    ))}
                  </div>
                  <div className="form-actions">
                    <button className="primary-button" type="submit">
                      {draftSourceBook ? `${draftContentTypeLabel} 저장` : `${draftContentTypeLabel} 추가`}
                    </button>
                    {draftSourceBook?.active === false ? (
                      <button className="secondary-button" type="button" onClick={reactivateBookDb}>
                        다시 활성화
                      </button>
                    ) : draftSourceBook ? (
                      <button className="danger-button" type="button" onClick={deactivateBookDb}>
                        {draftContentTypeLabel} 비활성화
                      </button>
                    ) : null}
                  </div>
                </form>
              </section>

              <section className="parent-section" aria-labelledby="bookListTitle">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">목록</p>
                    <h2 id="bookListTitle">등록된 자료</h2>
                  </div>
                  <div className="library-tools manage-tools">
                    <select
                      value={manageSeriesFilter}
                      aria-label="자료 관리 시리즈 선택"
                      disabled={isLoadingBookSeries}
                      onChange={(event) => setManageSeriesFilter(event.target.value)}
                    >
                      <option value="all">전체 시리즈</option>
                      {allSeriesNames.map((series) => (
                        <option value={series} key={series}>
                          {series}
                        </option>
                      ))}
                    </select>
                    <input
                      value={manageBookSearch}
                      type="search"
                      placeholder="자료 제목 검색"
                      onChange={(event) => setManageBookSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void loadBookManageData();
                        }
                      }}
                    />
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={loadBookManageData}
                      disabled={isLoadingBookManageData}
                    >
                      {isLoadingBookManageData ? "조회 중..." : "조회"}
                    </button>
                  </div>
                </div>

                {isBookManageDataLoaded && (
                  <div className="book-filter-row" role="tablist" aria-label="자료 목록 상태 필터">
                    {([
                      ["active", `운영 중 ${activeManageBooks.length}`],
                      ["attention", `입력 필요 ${manageAttentionCount}`],
                      ["ready", `준비 완료 ${manageReadyCount}`],
                      ["inactive", `비활성 ${inactiveManageBooks.length}`],
                    ] as Array<[BookListFilter, string]>).map(([filter, label]) => (
                      <button
                        className={bookListFilter === filter ? "is-active" : ""}
                        type="button"
                        key={filter}
                        onClick={() => setBookListFilter(filter)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="manage-list">
                  {!isBookManageDataLoaded ? (
                    <div className="empty-state">시리즈를 선택하거나 제목을 입력한 뒤 조회하세요.</div>
                  ) : filteredManageBooks.length ? (
                    filteredManageBooks.map((book) => {
                      const issues = getBookSetupIssues(book);
                      const assignmentCount = bookAssignmentCounts[book.id] ?? 0;
                      return (
                        <article className={`manage-item ${book.id === bookDraft.id ? "is-selected" : ""}`} key={book.id}>
                          <MaterialThumb book={book} />
                          <button
                            type="button"
                            onClick={() => {
                              setBookDraftMode("edit");
                              setBookDraft(bookToDraft(book));
                            }}
                          >
                            <h3>{book.title}</h3>
                            <p>
                              {book.series}
                              {book.volume ? ` · ${book.volume}` : ""}
                              {book.level ? ` · ${book.level}` : ""}
                            </p>
                            <span className="status-row">
                              <span className="status-badge">{bookContentTypeLabels[book.contentType]}</span>
                              <span className={`status-badge ${book.active === false ? "" : "done"}`}>
                                {book.active === false ? "비활성" : "운영 중"}
                              </span>
                              {issues.length ? (
                                issues.map((issue) => (
                                  <span className="status-badge todo" key={`${book.id}-${issue}`}>
                                    {issue} 필요
                                  </span>
                                ))
                              ) : (
                                <span className="status-badge done">배정 준비</span>
                              )}
                              {assignmentCount > 0 && <span className="status-badge">할 일 {assignmentCount}건</span>}
                            </span>
                          </button>
                        </article>
                      );
                    })
                  ) : (
                    <div className="empty-state">조건에 맞는 자료가 없습니다.</div>
                  )}
                </div>
              </section>
            </div>
          </section>
        )}

        {isParentProfile && view === "assign" && (
          <section className="view is-active" aria-labelledby="assignTitle">
            <div className="section-heading">
              <div>
                <p className="eyebrow">할 일 배정</p>
                <h2 id="assignTitle">날짜별 읽기 목록 만들기</h2>
              </div>
            </div>

            <div className="management-grid">
              <section className="parent-section" aria-label="할 일 입력 양식">
                <form className="book-form" onSubmit={createAssignmentsDb}>
                  <div className="wide">
                    <p className="task-meta">아동은 상단 선택값으로 배정됩니다.</p>
                    <div className="summary-strip">
                      <span className="summary-pill">
                        <strong>{childSummary.name}</strong>
                        {childSummary.level ? ` · ${childSummary.level}` : ""}
                      </span>
                    </div>
                  </div>
                  <label>
                    시작일
                    <input name="assignStart" type="date" required defaultValue={dateKey()} />
                  </label>
                  <label>
                    종료일
                    <input name="assignEnd" type="date" required defaultValue={dateKey()} />
                  </label>
                  <AssignmentBookPicker
                    candidates={assignBookCandidates}
                    selectedBooks={selectedAssignBooks}
                    assignedBookIds={assignedBookIds}
                    seriesNames={assignSeriesNames}
                    seriesFilter={assignSeriesFilter}
                    search={assignBookSearch}
                    childName={childSummary.name}
                    onSeriesFilterChange={setAssignSeriesFilter}
                    onSearchChange={setAssignBookSearch}
                    onAdd={(bookId) => setAssignSelectedBookIds((current) => [...current, bookId])}
                    onRemove={(bookId) =>
                      setAssignSelectedBookIds((current) => current.filter((selectedBookId) => selectedBookId !== bookId))
                    }
                  />
                  <button className="primary-button" type="submit" disabled={!selectedAssignBooks.length}>
                    날짜별 할 일 생성
                  </button>
                </form>
              </section>

              <section className="parent-section" aria-labelledby="assignmentPreviewTitle">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">예정표</p>
                    <h2 id="assignmentPreviewTitle">오늘 이후 예정된 할 일</h2>
                  </div>
                </div>
                <div className="manage-list">
                  {childAssignments.length ? (
                    childAssignments.map((assignment) => {
                      const book = getBook(assignment.bookId);
                      if (!book) return null;
                      const isEditing = editingAssignmentId === assignment.id;
                      return (
                        <article className={`manage-item assignment-manage-item ${isEditing ? "is-selected" : ""}`} key={assignment.id}>
                          <MaterialThumb book={book} />
                          <div>
                            <h3>
                              {formatDate(assignment.date)} · {book.title}
                            </h3>
                            <p>
                              {book.series}
                              <br />
                              {selectedTaskLabels(assignment)}
                            </p>
                            <div className="status-row">
                              <button
                                className="secondary-button assignment-action-button"
                                type="button"
                                onClick={() => setEditingAssignmentId(isEditing ? null : assignment.id)}
                              >
                                {isEditing ? "수정 닫기" : "수정"}
                              </button>
                              <button
                                className="secondary-button assignment-action-button"
                                type="button"
                                onClick={() => deleteAssignmentDb(assignment.id)}
                              >
                                삭제
                              </button>
                            </div>
                            {isEditing && (
                              <AssignmentEditForm
                                assignment={assignment}
                                onCancel={() => setEditingAssignmentId(null)}
                                onSubmit={updateAssignmentCountsDb}
                              />
                            )}
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="empty-state">오늘 이후 예정된 할 일이 없습니다.</div>
                  )}
                </div>
              </section>
            </div>
          </section>
        )}
      </main>

      {qrState.open && (
        <dialog className="qr-dialog" open>
          <button
            className="icon-button"
            type="button"
            aria-label="닫기"
            onClick={() => setQrState({ open: false, target: null, status: "카메라 권한을 허용하면 QR 코드를 자동으로 읽습니다." })}
          >
            ×
          </button>
          <div>
            <p className="eyebrow">QR 스캔</p>
            <h2>네이버 오디오 링크 입력</h2>
            <p className="task-meta">{qrState.status}</p>
          </div>
          <video ref={qrVideoRef} playsInline muted />
          <div className="qr-dialog-actions">
            <button className="secondary-button" type="button" onClick={() => qrFileInputRef.current?.click()}>
              QR 사진 업로드
            </button>
            <input
              ref={qrFileInputRef}
              className="visually-hidden"
              type="file"
              accept="image/*"
              onChange={(event) => {
                void readQrFile(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <p className="task-meta">카메라 인식이 안 되면 저장된 QR 사진이나 스크린샷을 올려서 읽을 수 있습니다.</p>
          </div>
        </dialog>
      )}

      {isChildManualLogOpen && (
        <dialog className="qr-dialog quick-log-dialog" open>
          <button
            className="icon-button"
            type="button"
            aria-label="닫기"
            onClick={() => setIsChildManualLogOpen(false)}
          >
            ×
          </button>
          <div>
            <p className="eyebrow">빠른 기록</p>
            <h2>읽은 책 추가</h2>
            <p className="task-meta">오늘 날짜로 저장됩니다.</p>
          </div>
          <form className="book-form quick-log-form" onSubmit={addChildManualLogDb}>
            <label>
              구분
              <select name="childManualType" defaultValue="korean">
                <option value="korean">한글책</option>
                <option value="englishPicture">영어 그림책</option>
              </select>
            </label>
            <label className="wide">
              제목
              <input name="childManualTitle" type="text" placeholder="책 제목" required autoFocus />
            </label>
            <label>
              시간
              <input name="childManualMinutes" type="number" min="0" step="5" defaultValue="10" />
            </label>
            <div className="form-actions wide">
              <button className="secondary-button" type="button" onClick={() => setIsChildManualLogOpen(false)}>
                취소
              </button>
              <button className="primary-button" type="submit">
                기록 추가
              </button>
            </div>
          </form>
        </dialog>
      )}

      <div className={`toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}

