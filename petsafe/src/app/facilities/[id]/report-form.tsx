"use client";
import { useActionState } from "react";
import { reportFacilityAction } from "@/app/actions/facilities";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage, type FormState } from "@/components/form-message";

export function ReportForm({ facilityId }: { facilityId: string }) {
  const [state, action] = useActionState<FormState, FormData>(reportFacilityAction, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="facility_id" value={facilityId} />
      <div className="field">
        <label htmlFor="rep-type" className="label">무엇이 다른가요?</label>
        <select id="rep-type" name="report_type" className="input" defaultValue="closed">
          <option value="closed">폐업·휴업했어요</option><option value="wrong_phone">전화번호가 달라요</option><option value="wrong_hours">운영시간이 달라요</option>
          <option value="wrong_location">위치가 달라요</option><option value="pet_policy">동반 조건이 달라요</option><option value="other">기타</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="rep-details" className="label">자세히<span className="opt">선택</span></label>
        <textarea id="rep-details" name="details" rows={2} maxLength={1000} className="input" placeholder="다른 사람의 개인정보는 적지 말아 주세요." />
      </div>
      <SubmitButton>오류 신고</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
