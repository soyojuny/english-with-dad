"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReadingManagerClient from "./reading-manager-client";
import { createClient } from "../lib/supabase/client";

type SignedInShellProps = {
  userId: string;
  email: string;
};

export default function SignedInShell({ userId, email }: SignedInShellProps) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();
  const [supabase] = useState(() => createClient());

  const signOut = async () => {
    setStatus("");
    const { error } = await supabase.auth.signOut();

    if (error) {
      setStatus(error.message);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <>
      <section className="session-bar">
        <div>
          <p className="eyebrow">Supabase 연결됨</p>
          <strong>{email}</strong>
          <p className="session-copy">
            부모 인증은 Supabase 쿠키 세션으로 관리합니다. 읽기 데이터는 다음 단계에서 DB CRUD로 옮길 준비가
            끝난 상태이며, 현재 캐시는 로그인한 부모 기준으로만 분리됩니다.
          </p>
        </div>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={signOut} disabled={isPending}>
            {isPending ? "로그아웃 중..." : "로그아웃"}
          </button>
        </div>
      </section>
      {status ? <div className="auth-inline-status">{status}</div> : null}
      <ReadingManagerClient ownerUserId={userId} />
    </>
  );
}
