import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { MaterialThumb, formatMaterialMeta } from "../../app/material-thumb";
import type { Book } from "../../lib/reading-types";

const regularBook: Book = {
  id: "book-1", active: true, contentType: "book", title: "The Moon", series: "Oxford", volume: "3", level: "A",
  cover: "/assets/moon.jpg", audio: { listen: "", shadow: "" }, note: "",
};

test("C04-N03: 일반 자료는 cover src·표지 alt·전달 class의 image를 표시한다", () => {
  // Given
  const props = { book: regularBook, className: "book-cover" };

  // When
  render(<MaterialThumb {...props} />);

  // Then
  const image = screen.getByRole("img", { name: "The Moon 표지" });
  expect(image.getAttribute("src")).toBe("/assets/moon.jpg");
  expect(image.getAttribute("alt")).toBe("The Moon 표지");
  expect(image.classList.contains("book-cover")).toBe(true);
});

test("C04-E03: 단어 읽기 자료는 ABC text와 접근 가능한 대체 image 역할을 표시한다", () => {
  // Given
  const props = { book: { ...regularBook, contentType: "wordReading" as const, title: "Sight Words" }, className: "thumb" };

  // When
  render(<MaterialThumb {...props} />);

  // Then
  const fallback = screen.getByRole("img", { name: "Sight Words 단어 읽기 자료" });
  expect(fallback.classList.contains("material-thumb")).toBe(true);
  expect(fallback.classList.contains("thumb")).toBe(true);
  expect(fallback.textContent).toBe("ABC");
});

test("C04-N04: 권과 레벨이 모두 있으면 가운데 점으로 연결한 메타를 반환한다", () => {
  // Given
  const book = { volume: "3", level: "A" };

  // When
  const meta = formatMaterialMeta(book);

  // Then
  expect(meta).toBe("3 · A");
});

test("C04-E04: 레벨만 있으면 레벨 메타를 반환한다", () => {
  // Given
  const book = { volume: "", level: "A" };

  // When
  const meta = formatMaterialMeta(book);

  // Then
  expect(meta).toBe("A");
});

test("C04-E05: 권만 있으면 권 메타를 반환한다", () => {
  // Given
  const book = { volume: "3", level: "" };

  // When
  const meta = formatMaterialMeta(book);

  // Then
  expect(meta).toBe("3");
});

test("C04-E06: 권과 레벨이 모두 없으면 빈 메타를 반환한다", () => {
  // Given
  const book = { volume: "", level: "" };

  // When
  const meta = formatMaterialMeta(book);

  // Then
  expect(meta).toBe("");
});
