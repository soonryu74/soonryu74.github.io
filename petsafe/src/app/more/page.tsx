import type { Metadata } from "next";
import Link from "next/link";
import { getStore } from "@/lib/session";

export const metadata: Metadata = { title: "더보기" };

export default async function MorePage() {
  const store = await getStore();
  const staff = store.user?.role === "admin" || store.user?.role === "reviewer";
  const items = [
    { href: "/emergency", label: "🚨 긴급 도움", desc: "위급할 때 행동·전화·병원 찾기" },
    { href: "/health", label: "🩺 건강·예방", desc: "해야 할 것·하지 말 것" },
    { href: "/health/zoonoses", label: "🦠 사람과 동물 모두의 건강", desc: "인수공통감염병 예방" },
    { href: "/insurance", label: "🧾 보험·비용", desc: "내 약관 정리·청구 준비" },
    { href: "/reports", label: "📣 분실·발견·신고", desc: "공식 기관 연결" },
    { href: "/lost", label: "🔎 실종·구조동물 찾기", desc: "보호소 새 공고 모아보기·알림" },
    { href: "/partner", label: "🤝 파트너", desc: "업체 입점 안내" },
    { href: "/legal", label: "⚖️ 법무·신뢰센터", desc: "약관·개인정보·위치·저작권" },
    { href: store.user ? "/account" : "/login", label: store.user ? "👤 내 계정" : "🔑 로그인", desc: store.user ? "동의 기록·내려받기·탈퇴" : "이메일로 시작하기" },
    ...(staff ? [{ href: "/admin", label: "🛠️ 운영 관리", desc: "콘텐츠 검수·시설·감사로그" }] : []),
  ];
  return (
    <div>
      <h1 className="h1 mb-3">더보기</h1>
      <ul className="grid sm:grid-cols-2 gap-2">
        {items.map((i) => (
          <li key={i.href}><Link href={i.href} className="card block hover:border-primary"><span className="h3">{i.label}</span><span className="block text-sm text-muted">{i.desc}</span></Link></li>
        ))}
      </ul>
    </div>
  );
}
