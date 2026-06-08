import AuthPanel from "./auth-panel";
import SignedInShell from "./signed-in-shell";
import { isSupabaseConfigured } from "../lib/supabase/config";
import { createClient } from "../lib/supabase/server";

export const dynamic = "force-dynamic";

function SetupRequired() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Supabase 설정 필요</p>
        <h1>환경 변수를 먼저 채워 주세요</h1>
        <p className="auth-copy">
          `.env.example`을 `.env.local`로 복사한 뒤 Supabase Project URL과 Publishable Key를 넣으면 부모
          Google 로그인을 시작할 수 있습니다.
        </p>
        <div className="book-alert info">
          필요한 값:
          <br />
          `NEXT_PUBLIC_SUPABASE_URL`
          <br />
          `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
        </div>
      </section>
    </main>
  );
}

export default async function Page() {
  if (!isSupabaseConfigured()) {
    return <SetupRequired />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AuthPanel />;
  }

  return <SignedInShell userId={user.id} email={user.email ?? "로그인된 부모"} />;
}
