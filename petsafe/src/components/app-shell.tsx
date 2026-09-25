import Link from "next/link";
import { getStore } from "@/lib/session";
import { BottomNav, DesktopNav } from "./nav";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const store = await getStore();
  const user = store.user;
  const isStaff = user?.role === "admin" || user?.role === "reviewer";
  return (
    <div className="min-h-dvh flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 btn btn-primary">본문 바로가기</a>
      {store.mode === "demo" && (
        <div role="note" className="bg-[#FEF3C7] text-[#78350F] text-sm px-4 py-2 text-center border-b border-[#FCD34D]">
          <strong>예시 모드</strong> · Supabase 키가 설정되지 않아 이 서버의 로컬 파일에만 저장됩니다. 실제 서비스 데이터가 아닙니다.
        </div>
      )}
      <header className="bg-white border-b border-line sticky top-0 z-30">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-primary text-lg shrink-0" aria-label="펫안심365 홈">
            <svg aria-hidden="true" width="28" height="28" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0F766E"/><path d="M32 50s-14-8.6-14-19.5A8 8 0 0 1 32 26a8 8 0 0 1 14 4.5C46 41.4 32 50 32 50z" fill="#fff"/></svg>
            펫안심365
          </Link>
          <DesktopNav isStaff={isStaff} />
          <div className="ml-auto flex items-center gap-2">
            <Link href="/emergency" className="btn btn-danger btn-sm" aria-label="긴급 도움">
              <span aria-hidden="true">🚨</span> 긴급
            </Link>
            {user ? (
              <Link href="/account" className="btn btn-outline btn-sm">내 계정</Link>
            ) : (
              <Link href="/login" className="btn btn-outline btn-sm">로그인</Link>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="flex-1 mx-auto w-full max-w-5xl px-4 pt-4 pb-28 md:pb-12">{children}</main>
      <footer className="border-t border-line bg-white pb-24 md:pb-6">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted space-y-2">
          <p>펫안심365는 진단·처방·치료 결정을 제공하지 않으며, 보험상품 가입을 권유하지 않습니다. 위급하면 즉시 동물병원에 연락하세요.</p>
          <nav aria-label="법무 문서" className="flex flex-wrap gap-x-4 gap-y-1">
            <Link className="link" href="/legal/terms">이용약관</Link>
            <Link className="link" href="/legal/privacy">개인정보 처리방침</Link>
            <Link className="link" href="/legal/location">위치정보 안내</Link>
            <Link className="link" href="/legal/copyright">저작권 정책</Link>
            <Link className="link" href="/legal">법무·신뢰센터</Link>
          </nav>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
