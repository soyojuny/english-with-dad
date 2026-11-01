"use client";

import { useEffect, useState } from "react";
import type { Dvd } from "../lib/reading-types";
import { fetchDvdCatalogData } from "../lib/supabase/reading-store";

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

  useEffect(() => {
    let cancelled = false;
    setCatalog({ status: "loading" });
    fetchDvdCatalogData(supabase, ownerUserId).then(
      ({ dvds }) => { if (!cancelled) setCatalog({ status: "loaded", dvds }); },
      () => { if (!cancelled) setCatalog({ status: "error" }); },
    );
    return () => { cancelled = true; };
  }, [supabase, ownerUserId]);

  return (
    <section className="view is-active" aria-labelledby="dvdCatalogTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">부모 관리</p>
          <h2 id="dvdCatalogTitle">DVD 관리</h2>
        </div>
      </div>
      <section className="parent-section" aria-label="DVD 목록">
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
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
