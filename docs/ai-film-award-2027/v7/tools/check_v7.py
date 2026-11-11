#!/usr/bin/env python3
"""《입구》 v7 정적 검증. 실행: python3 tools/check_v7.py  -> 10_validation_report_v7.md 의 '자동 검증' 블록을 출력."""
import csv, os, re, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
rows = list(csv.DictReader(open(f"{D}/02_shotlist_v7.csv", encoding="utf-8-sig")))
res = []
def chk(name, ok, detail=""):
    res.append((name, "PASS" if ok else "FAIL", detail))

for r in rows: r["start_sec"] = float(r["start_sec"]); r["duration_sec"] = float(r["duration_sec"])
ids = [r["shot_id"] for r in rows]
chk("shot_id 고유", len(ids) == len(set(ids)), f"{len(ids)}행")
gaps = [r["shot_id"] for a, r in zip(rows, rows[1:]) if abs(a["start_sec"] + a["duration_sec"] - r["start_sec"]) > 1e-6]
chk("타임코드 중복/빈틈 0", not gaps and rows[0]["start_sec"] == 0, f"문제 샷: {gaps or '없음'}")
total = sum(r["duration_sec"] for r in rows)
chk("총 길이 = 컷 합계", abs(total - (rows[-1]["start_sec"] + rows[-1]["duration_sec"])) < 1e-6, f"{total:.0f}s")
ai = [r for r in rows if r["ai_tool"] == "Seedance"]
chk("AI 샷 프롬프트 누락 0", all(len(r["prompt"]) > 30 and r["negative_prompt"] for r in ai), f"AI {len(ai)}샷")
chk("연속성 키 누락 0", all(r["continuity_id"] for r in rows))
chk("등장인물 샷의 인물 연속성 키", all(("CH_" in r["continuity_id"]) for r in ai if r["characters"] not in ("-", "")),
    str([r["shot_id"] for r in ai if r["characters"] not in ("-", "") and "CH_" not in r["continuity_id"]] or "없음"))
chk("Seedance 프롬프트에 글자 생성 지시 없음", not [r["shot_id"] for r in ai if re.search(r"[가-힣]", r["prompt"])])
chk("AI 샷 편집 길이 2~15초", all(2 <= r["duration_sec"] <= 15 for r in ai))

# 장면 길이 = 시나리오 목표
target = dict(S1=30, S2=26, S3=16, S4=38, S5=18, S6=24, S7=36, S8=48, S9=48, S10=28, S11=14)
sc = {}
for r in rows: sc[r["scene_id"]] = sc.get(r["scene_id"], 0) + r["duration_sec"]
bad = {k: (sc.get(k), v) for k, v in target.items() if sc.get(k) != v}
chk("장면별 길이 = 시나리오 v7 목표", not bad, str(bad or "S1~S11 일치"))

# 자막
def sec(t): h, m, s = t.replace(",", ".").split(":"); return int(h) * 3600 + int(m) * 60 + float(s)
blocks = [b.strip().split("\n") for b in open(f"{D}/05b_subtitles_en_burnin_v7.srt", encoding="utf-8").read().strip().split("\n\n")]
cues = [(sec(b[1].split(" --> ")[0]), sec(b[1].split(" --> ")[1]), b[2:]) for b in blocks]
chk("자막 시간 겹침 0", all(a[1] <= b[0] for a, b in zip(cues, cues[1:])))
chk("영어 자막 2줄 이내", all(len(c[2]) <= 2 for c in cues))
chk("영어 자막 줄당 42자 이내", all(len(l) <= 42 for c in cues for l in c[2]), str(max(len(l) for c in cues for l in c[2])) + "자 최대")
cps = max(sum(len(l) for l in c[2]) / (c[1] - c[0]) for c in cues)
chk("자막 읽기속도 17자/초 이하", cps <= 17, f"최대 {cps:.1f}cps")
chk("자막 최소 체류 1.0초", all(c[1] - c[0] >= 1.0 for c in cues))
def inshot(c):
    return any(r["start_sec"] - 1e-6 <= c[0] and c[1] <= r["start_sec"] + r["duration_sec"] + 1e-6 for r in rows)
chk("자막이 샷 경계를 넘지 않음", all(inshot(c) for c in cues))
film_rows = [r for r in rows if r["scene_id"] not in ("S0", "S12")]
# 사실 등록부
reg = list(csv.DictReader(open(f"{D}/06_fact_fiction_register_v7.csv", encoding="utf-8-sig")))
regids = {r["claim_id"] for r in reg}
used = {c for r in rows for c in r["source_claim_id"].split(";") if c}
chk("샷의 source_claim_id가 등록부에 존재", used <= regids, str(sorted(used - regids) or "없음"))
chk("출처 URL 없는 FACT 0", not [r["claim_id"] for r in reg if r["status"] == "FACT" and not r["source_url"].startswith("http")])

film = sum(r["duration_sec"] for r in film_rows)
intro = sc.get("S0", 0); cred = sc.get("S12", 0)
ai_sec = sum(r["duration_sec"] for r in ai)
txt = sum(r["duration_sec"] for r in ai if "insert" in r["shot_type"] and "TXT_" in r["continuity_id"])
chk("본편(인트로·크레딧 제외) 5~7분 [T&C 5.3(a)]", 300 <= film <= 420, f"{film:.0f}s = {int(film//60)}:{int(film%60):02d}")

print("| 항목 | 결과 | 상세 |\n|---|---|---|")
for n, s, d in res: print(f"| {n} | {s} | {d} |")
print(f"\n- 전체 행 {len(rows)} / 본편 샷 {len(film_rows)} / Seedance 샷 {len(ai)} / 비AI 본편 샷 {len(film_rows)-len(ai)}")
print(f"- 인트로(가정) {intro:.0f}s + 본편 {film:.0f}s + 크레딧 {cred:.0f}s = 파일 {total:.0f}s ({int(total//60)}:{int(total%60):02d})")
print(f"- Seedance 영상 길이 {ai_sec:.0f}s. **공식 산식 미공개(PENDING)** 이므로 판정 없이 시나리오별 수치만 제시:")
for label, den, num in (("A. 본편만", film, ai_sec), ("B. 본편+크레딧", film + cred, ai_sec), ("C. 인트로+본편+크레딧", total, ai_sec),
                        ("D. C에서 텍스트 합성 인서트도 비AI로 볼 때(최악)", total, ai_sec - txt)):
    print(f"  - {label}: {num:.0f}/{den:.0f} = {num/den*100:.1f}%")
print("- 오디오 70% 기준(T&C 5.4 'visual and audio content')은 음성·음악 도구 미확정이라 산출 불가: PENDING")
print("- 판정: 최종 영상 없음 → '제작 완료/제출 가능' 판정 불가")
sys.exit(1 if any(s == "FAIL" for _, s, _ in res) else 0)
