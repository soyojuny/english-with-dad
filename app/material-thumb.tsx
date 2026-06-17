import { isWordReadingMaterial } from "../lib/reading-calculations";
import type { Book } from "../lib/reading-types";

export function MaterialThumb({ book, className = "" }: { book: Book; className?: string }) {
  if (!isWordReadingMaterial(book)) {
    return <img className={className || undefined} src={book.cover} alt={`${book.title} 표지`} />;
  }

  const classNames = ["material-thumb", className].filter(Boolean).join(" ");
  return (
    <div className={classNames} role="img" aria-label={`${book.title} 단어 읽기 자료`}>
      ABC
    </div>
  );
}

export function formatMaterialMeta(book: Pick<Book, "volume" | "level">) {
  return [book.volume, book.level].filter(Boolean).join(" · ");
}
