import { Badge, Card, LinkButton, Notice, PageHeader, SourceMeta } from "@/components/ui";

const EASYLAW = { org: "찾기쉬운 생활법령정보", url: "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=2&cnpClsNo=1&csmSeq=1809&popMenu=ov" };

type Guide = { category: string; title: string; dos: string[]; donts: string[]; action?: { href: string; label: string }; sources?: { org: string; url: string }[] };

// 인수인계서 7장 표를 그대로 옮긴 생활 수칙. 진단·약·치료 내용은 넣지 않는다.
const GUIDES: Guide[] = [
  {
    category: "건강",
    title: "매일 조금씩 살펴봐요",
    dos: ["식욕, 물 마시는 양, 배변을 살펴보기", "체중을 재고 기록하기", "행동이 평소와 달라지면 적어 두기"],
    donts: ["사람 약을 마음대로 주지 않기"],
    action: { href: "/records", label: "건강 기록하기" },
  },
  {
    category: "중독",
    title: "먹으면 안 되는 것을 먹었을 때",
    dos: ["제품명, 성분, 먹은 양, 시간을 기록하기", "기록한 뒤 바로 동물병원에 문의하기"],
    donts: ["토하게 하지 않기", "민간요법을 쓰지 않기"],
    action: { href: "/emergency", label: "긴급 도움 열기" },
  },
  {
    category: "외출",
    title: "나가기 전에 확인해요",
    dos: ["기온과 바닥(노면) 온도 확인하기", "목줄, 물, 배변봉투 챙기기"],
    donts: ["더운 차 안에 두지 않기", "무리하게 운동시키지 않기"],
  },
  {
    category: "행동",
    title: "칭찬으로 가르쳐요",
    dos: ["잘한 행동을 바로 칭찬하고 보상하기", "스트레스 신호를 살펴보고 적어 두기"],
    donts: ["체벌하지 않기", "겁을 주어 가르치지 않기"],
  },
  {
    category: "고양이 환경",
    title: "집안을 고양이 눈높이로 점검해요",
    dos: ["올라갈 수 있는 수직 공간 마련하기", "숨을 곳 만들어 주기", "화장실 상태 점검하기", "위험한 식물이 있는지 점검하기"],
    donts: ["끈·실을 꺼내 두지 않기", "사람 약을 손 닿는 곳에 두지 않기", "백합류를 집에 두지 않기"],
  },
  {
    category: "법정 의무",
    title: "법으로 정해진 것을 지켜요",
    dos: ["동물등록 여부 확인하기", "인식표 달기", "외출할 때 목줄 등 안전조치 하기", "배설물 바로 치우기"],
    donts: ["등록하지 않은 채로 두지 않기", "돌보지 않고 방치하지 않기", "통제 없이 돌아다니게 하지 않기"],
    sources: [EASYLAW],
  },
];

export default function HealthPage() {
  return (
    <>
      <PageHeader title="건강·예방" description="매일 할 수 있는 돌봄 수칙이에요. 진단이나 치료 안내는 하지 않아요." />

      <Notice tone="warn">아래 글은 전문가 검수 전 초안이에요. 아이 상태가 걱정되면 동물병원에 전화해 주세요.</Notice>

      <div className="grid gap-3 sm:grid-cols-2">
        <LinkButton href="/emergency" variant="danger">
          지금 위급해요 · 긴급 도움
        </LinkButton>
        <LinkButton href="/health/zoonoses" variant="ghost">
          사람과 동물 모두의 건강 (인수공통감염병)
        </LinkButton>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {GUIDES.map((g) => (
          <Card as="li" key={g.category} className="flex flex-col gap-3">
            <div>
              <Badge tone="brand">{g.category}</Badge>
              <h2 className="mt-2 text-lg font-bold">{g.title}</h2>
            </div>
            <div>
              <h3 className="font-semibold text-safe">해야 할 것</h3>
              <ul className="mt-1 list-disc pl-5">
                {g.dos.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-danger">하지 말아야 할 것</h3>
              <ul className="mt-1 list-disc pl-5">
                {g.donts.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            {g.action ? (
              <LinkButton href={g.action.href} variant="ghost">
                {g.action.label}
              </LinkButton>
            ) : null}
            <div className="mt-auto">
              <SourceMeta sources={g.sources} reviewedAt={null} statusLabel="검수 전 초안" />
            </div>
          </Card>
        ))}
      </ul>
    </>
  );
}
