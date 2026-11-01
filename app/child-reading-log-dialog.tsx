"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, RefObject } from "react";
import { CHILD_RECORD_DEFAULT_MINUTES, CHILD_RECORD_MINUTE_OPTIONS } from "../lib/reading-data";
import type { Dvd } from "../lib/reading-types";
import { useChildDvdCatalog } from "./use-child-dvd-catalog";

type ChildReadingLogDialogProps = {
  error: string;
  supabase: Parameters<typeof useChildDvdCatalog>[0]["supabase"];
  ownerUserId: string;
  childId: string;
  saving: boolean;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, tab: "book" | "dvd", dvd?: Dvd) => void;
};

export function ChildReadingLogDialog({ error, supabase, ownerUserId, childId, saving, returnFocusRef, onClose, onSubmit }: ChildReadingLogDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"book" | "dvd">("book");
  const [dvdId, setDvdId] = useState("");
  const catalog = useChildDvdCatalog({ supabase, ownerUserId, childId });

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
        if (!saving) onClose();
      }}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <button className="icon-button" type="button" aria-label="닫기" onClick={onClose} disabled={saving}>
        ×
      </button>
      <div>
        <p className="eyebrow">빠른 기록</p>
        <h2 id="childReadingLogTitle">읽기·DVD 기록</h2>
        <p className="task-meta">오늘 날짜로 저장됩니다.</p>
      </div>
      <div role="tablist" aria-label="기록 종류">
        <button type="button" role="tab" id="childBookTab" aria-selected={tab === "book"} aria-controls="childBookPanel" disabled={saving} onClick={() => setTab("book")}>책 읽기</button>
        <button type="button" role="tab" id="childDvdTab" aria-selected={tab === "dvd"} aria-controls="childDvdPanel" disabled={saving} onClick={() => setTab("dvd")}>DVD 시청</button>
      </div>
      <form id={tab === "book" ? "childBookPanel" : "childDvdPanel"} role="tabpanel" aria-labelledby={tab === "book" ? "childBookTab" : "childDvdTab"} className="book-form quick-log-form" onSubmit={(event) => onSubmit(event, tab, tab === "dvd" ? catalog.dvds.find((dvd) => dvd.id === dvdId) : undefined)}>
        <fieldset disabled={saving} style={{ display: "contents" }}>
        <label hidden={tab !== "book"}>
          구분
          <select name="childManualType" defaultValue="korean" disabled={tab !== "book"}>
            <option value="korean">한글책</option>
            <option value="englishPicture">영어 그림책</option>
          </select>
        </label>
        <label className="wide" hidden={tab !== "book"}>
          제목
          <input ref={titleRef} name="childManualTitle" type="text" placeholder="책 제목" required disabled={tab !== "book"} />
        </label>
        <label className="wide" hidden={tab !== "dvd"}>
          DVD
          <select name="childDvd" value={dvdId} onChange={(event) => setDvdId(event.target.value)} required disabled={tab !== "dvd"}>
            <option value="">DVD를 선택하세요</option>
            {catalog.dvds.map((dvd) => <option key={dvd.id} value={dvd.id}>{dvd.title}</option>)}
          </select>
        </label>
        <label>
          시간
          <select name="childManualMinutes" defaultValue={CHILD_RECORD_DEFAULT_MINUTES}>
            {CHILD_RECORD_MINUTE_OPTIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes}분</option>)}
          </select>
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
        </fieldset>
      </form>
    </dialog>
  );
}
