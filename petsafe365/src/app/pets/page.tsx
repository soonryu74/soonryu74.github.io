"use client";
import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, LinkButton, Loading, LoginRequired, PageHeader } from "@/components/ui";
import { usePets, useSession } from "@/lib/hooks";
import { SPECIES_LABEL, ageLabel } from "./pet-shared";

export default function PetsPage() {
  const { user, loading } = useSession();
  return (
    <>
      <PageHeader title="우리 아이" description="함께 사는 아이들을 한곳에서 챙겨요." action={user ? <LinkButton href="/onboarding">추가하기</LinkButton> : undefined} />
      {loading ? <Loading /> : user ? <PetList /> : <LoginRequired what="우리 아이 정보" />}
    </>
  );
}

function PetList() {
  const { pets, current, select, loading, error, reload } = usePets();
  const [now] = useState(() => new Date());
  if (loading) return <Loading />;
  if (error) return <ErrorState onRetry={reload} />;
  if (pets.length === 0) {
    return <EmptyState title="아직 등록한 아이가 없어요" description="아이를 등록하면 오늘 할 일과 기록을 함께 챙길 수 있어요." action={<LinkButton href="/onboarding">우리 아이 등록하기</LinkButton>} />;
  }
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {pets.map((p) => {
          const on = current?.id === p.id;
          return (
            <Card as="li" key={p.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 break-words text-lg font-bold">{p.name}</h2>
                {on ? <Badge tone="brand">지금 보는 아이</Badge> : null}
              </div>
              <p className="text-muted">
                {SPECIES_LABEL[p.species]} · {ageLabel(p, now)}
                {p.weight_kg !== null ? ` · ${p.weight_kg}kg` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <LinkButton href={`/pets/${p.id}`} variant="ghost">
                  자세히 보기
                </LinkButton>
                {on ? null : (
                  <Button variant="ghost" onClick={() => select(p.id)} aria-label={`${p.name} 선택하기`}>
                    이 아이로 보기
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </ul>
      <p className="text-sm text-muted">
        체중·진료·비용은{" "}
        <Link href="/records" className="text-brand underline">
          건강 기록
        </Link>
        에서 남길 수 있어요.
      </p>
    </>
  );
}
