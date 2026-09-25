"use client";
import { useEffect, useState } from "react";
import type { RescueAnimal } from "@/lib/rescue/normalize";
import { daysLeft, detailUrl, isNewSince, NEUTER_LABEL, SEX_LABEL } from "@/lib/rescue/normalize";
import { telHref } from "@/lib/contacts";

const ICON = { dog: "🐶", cat: "🐱", other: "🐾" } as const;

function DDay({ end, today }: { end: string | null; today: string }) {
  const d = daysLeft(end, today);
  if (d === null) return null;
  if (d < 0) return <span className="badge badge-muted">공고 기간 끝남</span>;
  if (d <= 2) return <span className="badge badge-danger">공고 {d === 0 ? "오늘 끝" : `D-${d}`}</span>;
  return <span className="badge badge-info">공고 D-{d}</span>;
}

export function RescueResults({ animals, today, storageKey, serverSince }: { animals: RescueAnimal[]; today: string; storageKey: string; serverSince: string | null }) {
  // 로그인 관심 조건은 서버 기준일, 그 외에는 이 기기에서 마지막으로 본 날짜 기준으로 '새 공고' 표시
  const [since, setSince] = useState<string | null>(serverSince);
  useEffect(() => {
    if (serverSince) return;
    try {
      const prev = localStorage.getItem(storageKey);
      queueMicrotask(() => setSince(prev));
      localStorage.setItem(storageKey, today);
    } catch { /* 저장소 사용 불가 */ }
  }, [storageKey, today, serverSince]);

  const newCount = animals.filter((a) => isNewSince(a, since)).length;

  if (animals.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="h3">조건에 맞는 공고가 없어요</p>
        <p className="text-muted mt-1">기간을 늘리거나 키워드를 줄여 보세요. 공고는 매일 새로 올라와요.</p>
      </div>
    );
  }
  return (
    <section aria-labelledby="res-h">
      <h2 id="res-h" className="h2 mb-2">공고 {animals.length}건{since && newCount > 0 && <span className="badge badge-danger ml-2 align-middle">새 공고 {newCount}</span>}</h2>
      <ul className="grid sm:grid-cols-2 gap-3">
        {animals.map((a) => {
          const fresh = isNewSince(a, since);
          return (
            <li key={a.id} className={`card flex flex-col ${fresh ? "border-danger border-2" : ""}`}>
              <div className="flex gap-3">
                {a.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.photo} alt={`${a.speciesLabel} ${a.breed} ${a.color} 사진`} loading="lazy" referrerPolicy="no-referrer" className="size-24 shrink-0 rounded-xl object-cover bg-slate-100" />
                ) : (
                  <div className="size-24 shrink-0 rounded-xl bg-slate-100 grid place-items-center text-4xl" aria-hidden="true">{ICON[a.species]}</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1">
                    {fresh && <span className="badge badge-danger">새 공고</span>}
                    <DDay end={a.noticeEnd} today={today} />
                    <span className="badge badge-muted">{a.state}</span>
                    {a.isExample && <span className="badge badge-warn">예시</span>}
                  </div>
                  <h3 className="h3 mt-1 break-words">{a.speciesLabel} · {a.breed}</h3>
                  <p className="text-sm">{[a.color, SEX_LABEL[a.sex], NEUTER_LABEL[a.neuter], a.age, a.weight].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
              <dl className="text-sm mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <dt className="text-muted">발견</dt><dd className="break-words">{a.foundDate ?? "날짜 미상"} · {a.foundPlace || "장소 미상"}</dd>
                {a.feature && (<><dt className="text-muted">특징</dt><dd className="break-words">{a.feature}</dd></>)}
                <dt className="text-muted">보호</dt><dd className="break-words">{a.shelterName}{a.orgName ? ` (${a.orgName})` : ""}</dd>
                <dt className="text-muted">공고</dt><dd>{a.noticeStart ?? "?"} ~ {a.noticeEnd ?? "?"}</dd>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {a.shelterTel ? <a className="btn btn-primary btn-sm" href={telHref(a.shelterTel)}>📞 보호소 전화</a> : <span className="btn btn-outline btn-sm" aria-disabled="true">전화번호 없음</span>}
                {!a.isExample && <a className="btn btn-outline btn-sm" href={detailUrl(a)} target="_blank" rel="noopener noreferrer">원문 공고<span className="sr-only"> (국가동물보호정보시스템 새 창)</span></a>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted mt-2">공고 기간이 끝나면 보호소가 입양 등 다음 절차를 진행할 수 있어요. 비슷하면 먼저 전화로 확인하세요.</p>
    </section>
  );
}
