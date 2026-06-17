import type { Book, BookContentType, Child } from "./reading-types";

export type BookDraft = {
  id: string;
  contentType: BookContentType;
  series: string;
  title: string;
  volume: string;
  level: string;
  cover: string;
  audio: {
    listen: string;
    shadow: string;
  };
  note: string;
};

export type ChildDraft = {
  id: string;
  name: string;
  level: string;
  goal: string;
};

export const emptyBookDraft: BookDraft = {
  id: "",
  contentType: "book",
  series: "",
  title: "",
  volume: "",
  level: "",
  cover: "",
  audio: { listen: "", shadow: "" },
  note: "",
};

export const emptyChildDraft: ChildDraft = {
  id: "",
  name: "",
  level: "",
  goal: "",
};

export function bookToDraft(book: Book | null): BookDraft {
  if (!book) return { ...emptyBookDraft, audio: { ...emptyBookDraft.audio } };
  return {
    id: book.id,
    contentType: book.contentType,
    series: book.series,
    title: book.title,
    volume: book.volume,
    level: book.level,
    cover: book.cover,
    audio: { ...book.audio },
    note: book.note,
  };
}

export function childToDraft(child: Child | null): ChildDraft {
  if (!child) return { ...emptyChildDraft };
  return {
    id: child.id,
    name: child.name,
    level: child.level,
    goal: child.goal,
  };
}
