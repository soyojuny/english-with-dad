"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { isLocalTestLoginEnabled } from "../lib/supabase/config";

export default function AuthPanel() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [supabase] = useState(() => createClient());
  const localTestLoginEnabled = isLocalTestLoginEnabled();

  const signInWithGoogle = async () => {
    setSubmitting(true);
    setStatus("");

    const redirectTo = `${window.location.origin}/auth/callback?next=/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setStatus(error.message);
      setSubmitting(false);
    }
  };

  const signInForLocalTest = async () => {
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    if (!localTestLoginEnabled || !isLocalHost) {
      setStatus("로컬 테스트 로그인은 localhost 개발 서버에서만 사용할 수 있습니다.");
      return;
    }

    setSubmitting(true);
    setStatus("");

    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setStatus(
        error.message.includes("Anonymous sign-ins are disabled")
          ? "Supabase Dashboard에서 Anonymous Sign-Ins를 활성화해 주세요."
          : error.message,
      );
      setSubmitting(false);
      return;
    }

    router.refresh();
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">부모 로그인</p>
        <h1>Google로 로그인</h1>
        <p className="auth-copy">부모 계정으로 로그인해 아이들의 읽기 기록과 책 관리를 이어서 사용합니다.</p>

        <div className="auth-actions">
          <button className="primary-button" type="button" onClick={signInWithGoogle} disabled={submitting}>
            {submitting ? "Google로 이동 중..." : "Google로 계속하기"}
          </button>
          {localTestLoginEnabled ? (
            <button className="secondary-button" type="button" onClick={signInForLocalTest} disabled={submitting}>
              로컬 테스트로 시작
            </button>
          ) : null}
        </div>

        {localTestLoginEnabled ? (
          <p className="auth-copy">
            로컬 테스트 계정은 이 브라우저에만 유지됩니다. 로그아웃하거나 브라우저 데이터를 지우면 다시 접근할 수
            없습니다.
          </p>
        ) : null}

        {status ? (
          <div className="book-alert info" role="status">
            {status}
          </div>
        ) : null}
      </section>
    </main>
  );
}
