export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">불러오는 중…</span>
      <div className="h-8 w-1/2 rounded-lg bg-slate-200 animate-pulse" />
      <div className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
      <div className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
    </div>
  );
}
