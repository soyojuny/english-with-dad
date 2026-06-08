import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">로그인 오류</p>
        <h1>인증 링크를 다시 확인해 주세요</h1>
        <p className="auth-copy">
          Google OAuth redirect URL이 아직 맞지 않거나 인증 코드 교환이 실패했을 수 있습니다.
        </p>
        <div className="auth-actions">
          <Link className="primary-button" href="/">
            로그인 화면으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}
