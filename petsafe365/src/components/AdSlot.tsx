"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { getFlags } from "@/lib/domain";
import { useAsync } from "@/lib/hooks";
import { commerceAllowedOn } from "@/lib/rules";

/** 광고 자리. 관리자 승인(adsEnabled)과 광고 허용 화면이 모두 맞을 때만 보이고, 항상 "광고" 표시를 붙인다. */
export function AdSlot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const flags = useAsync(getFlags, []);
  if (!flags.data?.adsEnabled || !pathname || !commerceAllowedOn(pathname)) return null;
  return (
    <aside aria-label="광고" className="rounded-[16px] border border-line bg-card p-4">
      <p className="mb-2 inline-flex rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted">광고</p>
      <div className="min-w-0 text-sm">{children}</div>
    </aside>
  );
}
