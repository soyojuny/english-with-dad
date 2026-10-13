import type { ReadingData } from "../../lib/reading-types";

export function readingFixture(): ReadingData {
  return {
    children: [{ id: "child-1", name: "테스트 아동", level: "1", goal: "오늘 읽기" }],
    books: [{
      id: "book-1", active: true, contentType: "book", title: "테스트 책", series: "테스트 시리즈",
      volume: "1", level: "1", cover: "/assets/covers/bones.jpg",
      audio: { listen: "https://example.com/listen", shadow: "https://example.com/shadow" }, note: "",
    }],
    assignments: [{
      id: "assignment-1", childId: "child-1", bookId: "book-1", date: "2026-10-12",
      activityCategory: "focusListen", tasks: ["listen"], taskCounts: { listen: 1 },
      quizEnabled: false, quizScore: null,
    }],
    completions: {}, audioLaunches: {}, manualLogs: [],
  };
}
