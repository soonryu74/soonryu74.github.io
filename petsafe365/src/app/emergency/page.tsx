"use client";
import { useRef, useState } from "react";
import { Button, Card, Field, LinkButton, Notice, PageHeader, TextareaField } from "@/components/ui";

type Flag = { key: string; label: string; record: string[]; extraDoNot?: string[]; prepare?: string[] };

// 관찰할 수 있는 신호만 적는다. 진단명·약·용량·치료법은 넣지 않는다.
const FLAGS: Flag[] = [
  {
    key: "breathing",
    label: "호흡이 힘들어 보여요",
    record: ["언제부터 그랬는지", "입을 벌리고 숨 쉬는지, 숨소리가 어떤지", "잇몸·혀 색이 평소와 다른지", "가능하면 짧은 영상"],
    prepare: ["목을 조이는 것(목줄·옷)이 있으면 느슨하게 해 주세요", "안거나 눌러서 가슴을 압박하지 않게 옮겨 주세요"],
    extraDoNot: ["억지로 눕히거나 자세를 바꾸지 않기"],
  },
  {
    key: "seizure",
    label: "경련·발작을 해요",
    record: ["시작한 시각과 이어진 시간", "몇 번 반복했는지", "직전에 먹거나 접촉한 것", "가능하면 짧은 영상"],
    prepare: ["주변의 부딪힐 만한 물건을 치워 주세요", "떨어질 수 있는 높은 곳이면 바닥으로 옮겨 주세요"],
    extraDoNot: ["입안에 손이나 물건을 넣지 않기", "몸을 세게 붙잡거나 흔들지 않기"],
  },
  {
    key: "consciousness",
    label: "의식이 흐리거나 일어나지 못해요",
    record: ["언제부터 그랬는지", "이름을 불렀을 때 반응이 있는지", "직전에 있었던 일(사고, 먹은 것, 더운 곳에 있었는지)"],
    prepare: ["몸이 흔들리지 않게 담요나 판판한 것에 눕혀 옮겨 주세요"],
    extraDoNot: ["깨우려고 흔들거나 물을 뿌리지 않기"],
  },
  {
    key: "ingestion",
    label: "먹으면 안 되는 것을 먹었어요",
    record: ["제품명과 성분 (포장지를 그대로 챙겨 주세요)", "먹은 양과 남은 양", "먹은 시각", "지금 보이는 모습"],
    prepare: ["포장지·남은 물건·토한 것이 있으면 사진을 찍거나 봉투에 담아 가져가세요"],
    extraDoNot: ["우유·소금물·기름 같은 것을 먹이지 않기"],
  },
  {
    key: "trauma",
    label: "큰 사고를 당했거나 피가 많이 나요",
    record: ["사고가 난 시각과 상황", "피가 나는 부위", "걷거나 설 수 있는지"],
    prepare: ["아파서 물 수 있어요. 얼굴 가까이 손을 대지 않게 조심해 주세요", "몸이 꺾이지 않게 담요나 판판한 것에 눕혀 옮겨 주세요", "전화로 이동 중에 어떻게 하면 되는지 물어보세요"],
    extraDoNot: ["다친 부위를 당기거나 맞추려 하지 않기"],
  },
  {
    key: "urination",
    label: "소변을 못 봐요",
    record: ["마지막으로 소변을 본 시각", "화장실에 자주 가는지, 힘을 주는지, 우는지", "물을 마시는 양과 식욕"],
    extraDoNot: ["배를 누르거나 주무르지 않기", "내일까지 지켜보자고 미루지 않기"],
  },
  {
    key: "vomit",
    label: "계속 토하거나 설사를 해요",
    record: ["시작한 시각과 횟수", "색과 모양 (사진을 찍어 두세요)", "최근에 먹은 것과 바뀐 것"],
    extraDoNot: ["억지로 물이나 음식을 먹이지 않기"],
  },
  {
    key: "other",
    label: "평소와 너무 달라 걱정돼요",
    record: ["평소와 다른 점", "언제부터 그랬는지", "식욕·음수·배변의 변화"],
  },
];

const COMMON_PREPARE = ["이동장이나 담요를 준비해 주세요", "병원에 도착 예정 시간을 미리 알려 주세요", "가능하면 한 사람은 운전하고 한 사람은 아이를 살펴 주세요"];
const COMMON_DO_NOT = ["토하게 하지 않기", "사람 약을 주지 않기", "인터넷에서 본 민간요법을 쓰지 않기"];

function FlagGuide({ flag }: { flag: Flag }) {
  return (
    <Card as="section" className="flex flex-col gap-4 border-danger">
      <h3 className="text-lg font-bold">{flag.label}</h3>
      <div>
        <h4 className="font-semibold">1. 즉시 동물병원에 전화하세요</h4>
        <p className="mt-1 text-muted">지금 보이는 모습을 그대로 말하고, 병원의 안내를 따라 주세요.</p>
        <LinkButton href="/map?type=animal_hospital" variant="danger" className="mt-2 w-full">
          가까운 동물병원 찾기
        </LinkButton>
      </div>
      <div>
        <h4 className="font-semibold">2. 이동을 준비하세요</h4>
        <ul className="mt-1 list-disc pl-5">
          {[...(flag.prepare ?? []), ...COMMON_PREPARE].map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="font-semibold">3. 이것을 기록해 두세요</h4>
        <ul className="mt-1 list-disc pl-5">
          {flag.record.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-danger">하지 말아야 할 것</h4>
        <ul className="mt-1 list-disc pl-5">
          {[...COMMON_DO_NOT, ...(flag.extraDoNot ?? [])].map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-muted">이 안내는 진단이 아니에요. 무엇이 문제인지는 동물병원에서 확인해요.</p>
    </Card>
  );
}

function MemoBuilder() {
  const [startedAt, setStartedAt] = useState("");
  const [substance, setSubstance] = useState("");
  const [amount, setAmount] = useState("");
  const [observed, setObserved] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const outRef = useRef<HTMLTextAreaElement>(null);

  const memo = [
    "[병원에 전할 메모]",
    `증상 시작 시간: ${startedAt.trim() || "모름"}`,
    `먹은 물질·제품명: ${substance.trim() || "없음 또는 모름"}`,
    `먹은 양: ${amount.trim() || "모름"}`,
    `관찰한 것: ${observed.trim() || "-"}`,
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(memo);
      setCopyState("copied");
    } catch {
      // 복사 권한이 없으면 글자를 선택해 직접 복사할 수 있게 한다.
      outRef.current?.focus();
      outRef.current?.select();
      setCopyState("manual");
    }
  };
  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    setCopyState("idle");
  };

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold">병원에 전할 메모</h2>
        <p className="mt-1 text-sm text-muted">전화하거나 도착했을 때 그대로 읽어 주면 돼요. 이 메모는 어디에도 저장되지 않아요. 화면을 닫으면 사라져요.</p>
      </div>
      <Field id="memo-start" label="증상 시작 시간" optional placeholder="예: 오늘 오후 3시쯤" value={startedAt} onChange={(e) => edit(setStartedAt)(e.target.value)} />
      <Field id="memo-substance" label="먹은 물질·제품명" optional hint="포장지에 적힌 이름 그대로 적어 주세요." value={substance} onChange={(e) => edit(setSubstance)(e.target.value)} />
      <Field id="memo-amount" label="먹은 양" optional placeholder="예: 한 조각, 반 봉지" value={amount} onChange={(e) => edit(setAmount)(e.target.value)} />
      <TextareaField id="memo-observed" label="관찰한 것" optional placeholder="예: 3번 토했어요. 축 늘어져 있어요." value={observed} onChange={(e) => edit(setObserved)(e.target.value)} />
      <div className="flex flex-col gap-1">
        <label htmlFor="memo-out" className="font-medium">
          정리된 메모
        </label>
        <textarea id="memo-out" ref={outRef} readOnly rows={6} value={memo} className="w-full rounded-[12px] border border-line bg-tint px-3 py-2 text-base text-ink" />
      </div>
      <Button onClick={copy}>복사</Button>
      <p role="status" aria-live="polite" className="text-sm text-muted">
        {copyState === "copied" ? "복사했어요. 문자나 메신저에 붙여 넣을 수 있어요." : copyState === "manual" ? "자동 복사가 안 돼서 글자를 선택해 두었어요. 길게 눌러 복사해 주세요." : ""}
      </p>
    </Card>
  );
}

export default function EmergencyPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const flag = FLAGS.find((f) => f.key === selected) ?? null;

  return (
    <>
      <section aria-label="가장 먼저 할 일" className="flex flex-col gap-3">
        <LinkButton href="/map?type=animal_hospital" variant="danger" className="min-h-16 w-full text-lg">
          가까운 동물병원 찾기
        </LinkButton>
        <Card className="flex flex-col gap-2 border-danger">
          <p className="text-lg font-bold">다니는 동물병원에 바로 전화</p>
          <p>휴대폰에 저장해 둔 병원 번호가 있으면 지금 바로 전화하세요.</p>
          <p className="text-sm text-muted">저장된 병원 번호가 없으면 지도에서 찾아 전화하세요. 펫안심365는 확인되지 않은 전화번호를 보여 주지 않아요.</p>
          <LinkButton href="/map?type=animal_hospital" variant="ghost" className="w-full">
            지도에서 병원 찾아 전화하기
          </LinkButton>
        </Card>
      </section>

      <PageHeader title="긴급 도움" description="지금 보이는 모습을 골라 주세요. 무엇을 하면 되는지만 알려 드려요." />

      <section aria-label="지금 보이는 모습" className="flex flex-col gap-3">
        <ul className="grid gap-2 sm:grid-cols-2">
          {FLAGS.map((f) => (
            <li key={f.key}>
              <button
                type="button"
                aria-pressed={selected === f.key}
                onClick={() => setSelected(selected === f.key ? null : f.key)}
                className={`min-h-14 w-full rounded-[14px] border px-4 py-2 text-left text-base font-semibold ${selected === f.key ? "border-danger bg-danger text-white" : "border-line bg-card text-ink hover:bg-tint"}`}
              >
                {f.label}
              </button>
            </li>
          ))}
        </ul>
        <div aria-live="polite">{flag ? <FlagGuide flag={flag} /> : <p className="text-sm text-muted">하나를 고르면 지금 할 일과 하지 말아야 할 것을 보여 드려요.</p>}</div>
      </section>

      <MemoBuilder />

      <Notice tone="warn">
        펫안심365는 진단하거나 약·치료를 알려 주지 않아요. 걱정되면 망설이지 말고 동물병원에 전화하세요. 24시간·응급 진료 여부는 병원에 직접 확인해 주세요.
      </Notice>
    </>
  );
}
