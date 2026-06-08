"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";

export default function AuthPanel() {
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [supabase] = useState(() => createClient());

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

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">부모 로그인</p>
        <h1>Google로 로그인</h1>
        <p className="auth-copy">
          부모만 Google 계정으로 로그인합니다. 아이들은 별도 계정 없이 같은 부모 계정 아래 프로필 데이터로
          관리합니다.
        </p>

        <div className="auth-actions">
          <button className="primary-button" type="button" onClick={signInWithGoogle} disabled={submitting}>
            {submitting ? "Google로 이동 중..." : "Google로 계속하기"}
          </button>
        </div>

        <div className="auth-note">
          <strong>필수 설정:</strong> Supabase Dashboard에서 Google provider를 켜고, 앱 Redirect URL에
          `http://localhost:3000/auth/callback`을 추가해야 합니다.
        </div>

        {status ? (
          <div className="book-alert info" role="status">
            {status}
          </div>
        ) : null}
      </section>
    </main>
  );
}
