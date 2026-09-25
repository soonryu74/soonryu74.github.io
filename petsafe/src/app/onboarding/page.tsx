import type { Metadata } from "next";
import { requireMember } from "@/lib/guard";
import { AuthRequired } from "@/components/ui";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "시작하기" };

export default async function OnboardingPage() {
  const m = await requireMember("/onboarding");
  if (!m) return <AuthRequired what="반려동물 등록" next="/onboarding" />;
  const pets = await m.store.listPets();
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="h1">{pets.length ? "한 마리 더 등록하기" : "우리 아이를 소개해 주세요"}</h1>
      <p className="text-muted mt-1">이름과 종류만 필수예요. 나머지는 나중에 채워도 돼요. 중간에 나가도 이 기기에 입력 내용이 남아요.</p>
      <OnboardingForm />
    </div>
  );
}
