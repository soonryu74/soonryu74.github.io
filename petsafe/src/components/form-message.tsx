export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-xl p-3 text-sm ${state.ok ? "bg-[#DCFCE7] text-[#14532D]" : "bg-[#FEF2F2] text-[#7F1D1D]"}`}>
      {state.message}
    </p>
  );
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return <p id={id} className="err">{error}</p>;
}
