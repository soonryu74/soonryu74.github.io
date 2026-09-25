"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "btn btn-primary", pendingText = "저장 중…", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || rest.disabled} aria-busy={pending} {...rest}>
      {pending ? pendingText : children}
    </button>
  );
}
