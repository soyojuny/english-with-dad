"use client";

import { useLayoutEffect, useRef } from "react";
import type { FormEvent, RefObject } from "react";

type ChildReadingLogDialogProps = {
  error: string;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ChildReadingLogDialog({ error, returnFocusRef, onClose, onSubmit }: ChildReadingLogDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const trigger = returnFocusRef.current;
    const { scrollX, scrollY } = window;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;

    if (!dialog.open) dialog.showModal();
    root.style.overflow = "hidden";
    titleRef.current?.focus({ preventScroll: true });
    window.scrollTo(scrollX, scrollY);

    return () => {
      if (dialog.open) dialog.close();
      root.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      window.scrollTo(scrollX, scrollY);
    };
  }, [returnFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      className="qr-dialog quick-log-dialog"
      aria-labelledby="childReadingLogTitle"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <button className="icon-button" type="button" aria-label="닫기" onClick={onClose}>
        ×
      </button>
      <div>
        <p className="eyebrow">빠른 기록</p>
        <h2 id="childReadingLogTitle">읽은 책 추가</h2>
        <p className="task-meta">오늘 날짜로 저장됩니다.</p>
      </div>
      <form className="book-form quick-log-form" onSubmit={onSubmit}>
        <label>
          구분
          <select name="childManualType" defaultValue="korean">
            <option value="korean">한글책</option>
            <option value="englishPicture">영어 그림책</option>
          </select>
        </label>
        <label className="wide">
          제목
          <input ref={titleRef} name="childManualTitle" type="text" placeholder="책 제목" required />
        </label>
        <label>
          시간
          <input name="childManualMinutes" type="number" min="0" step="5" defaultValue="10" />
        </label>
        {error && <p className="inline-banner is-error wide" role="alert">{error}</p>}
        <div className="form-actions wide">
          <button className="secondary-button" type="button" onClick={onClose}>
            취소
          </button>
          <button className="primary-button" type="submit">
            기록 추가
          </button>
        </div>
      </form>
    </dialog>
  );
}
