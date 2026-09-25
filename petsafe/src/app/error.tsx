"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card py-8 text-center" role="alert">
      <p className="h2">문제가 생겼어요</p>
      <p className="text-muted mt-1">잠시 후 다시 시도해 주세요. 위급하면 바로 동물병원에 전화하세요.</p>
      <div className="mt-4 flex justify-center gap-2 flex-wrap">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>다시 시도</button>
        <Link href="/emergency" className="btn btn-danger">긴급 도움</Link>
      </div>
    </div>
  );
}
