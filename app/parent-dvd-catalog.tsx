"use client";

import { useEffect, useRef, useState } from "react";
import type { Dvd } from "../lib/reading-types";
import { addDvd, fetchDvdCatalogData, setDvdActive } from "../lib/supabase/reading-store";

type Props = {
  supabase: Parameters<typeof fetchDvdCatalogData>[0];
  ownerUserId: string;
};

type CatalogState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; dvds: Dvd[] };

export function ParentDvdCatalog({ supabase, ownerUserId }: Props) {
  const [catalog, setCatalog] = useState<CatalogState>({ status: "loading" });
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const savingRef = useRef(false);
  const updatingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setCatalog({ status: "loading" });
    fetchDvdCatalogData(supabase, ownerUserId).then(
      ({ dvds }) => { if (!cancelled) setCatalog({ status: "loaded", dvds }); },
      () => { if (!cancelled) setCatalog({ status: "error" }); },
    );
    return () => { cancelled = true; };
  }, [supabase, ownerUserId]);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    if (!title.trim()) {
      setSaveError("DVD 제목을 입력하세요.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const dvd = await addDvd(supabase, ownerUserId, title);
      setCatalog((current) => current.status === "loaded"
        ? { status: "loaded", dvds: [...current.dvds, dvd] }
        : current);
      setTitle("");
    } catch {
      setSaveError("DVD 저장에 실패했습니다.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function handleToggle(dvd: Dvd) {
    if (updatingRef.current) return;
    updatingRef.current = true;
    setUpdating(true);
    setUpdateError("");
    try {
      const updated = await setDvdActive(supabase, ownerUserId, dvd.id, !dvd.active);
      setCatalog((current) => current.status === "loaded"
        ? { status: "loaded", dvds: current.dvds.map((item) => item.id === updated.id ? updated : item) }
        : current);
    } catch {
      setUpdateError("DVD 상태 변경에 실패했습니다.");
    } finally {
      updatingRef.current = false;
      setUpdating(false);
    }
  }

  return (
    <section className="view is-active" aria-labelledby="dvdCatalogTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">부모 관리</p>
          <h2 id="dvdCatalogTitle">DVD 관리</h2>
        </div>
      </div>
      {catalog.status === "loaded" && (
        <form onSubmit={handleAdd}>
          <label htmlFor="dvdTitle">DVD 제목</label>
          <input id="dvdTitle" value={title} onChange={(event) => setTitle(event.target.value)} disabled={saving} />
          <button type="submit" disabled={saving}>DVD 추가</button>
          {saveError && <div role="alert">{saveError}</div>}
        </form>
      )}
      <section className="parent-section" aria-label="DVD 목록">
        {updateError && <div role="alert">{updateError}</div>}
        {catalog.status === "loading" ? (
          <div className="empty-state" role="status">DVD 목록을 불러오는 중입니다.</div>
        ) : catalog.status === "error" ? (
          <div className="empty-state" role="alert">DVD 목록을 불러오지 못했습니다. 조회에 실패했습니다.</div>
        ) : catalog.dvds.length === 0 ? (
          <div className="empty-state">DVD 목록이 비어 있습니다.</div>
        ) : (
          <div className="book-list">
            {catalog.dvds.map((dvd) => (
              <article className="book-card" role="group" aria-label={dvd.title} key={dvd.id}>
                <strong>{dvd.title}</strong>
                <span>{dvd.active ? "보는 중" : "안 보는 중"}</span>
                <button type="button" disabled={updating} onClick={() => handleToggle(dvd)}>
                  {dvd.active ? "안 보는 중으로 변경" : "보는 중으로 변경"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
