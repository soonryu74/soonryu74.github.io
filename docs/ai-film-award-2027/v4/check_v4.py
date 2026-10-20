# -*- coding: utf-8 -*-
"""v4 자동검증: CSV 합계·연속성·AI 비율·시나리오 장면 시각 대조·프롬프트 존재. 결과를 10_자동검증_결과.md로."""
import csv, re, collections, pathlib
rows=list(csv.DictReader(open("02_입구_샷리스트_v4.csv",encoding="utf-8-sig")))
def sec(s): m,s2=s.split(":"); return int(m)*60+int(s2)
out=[]; ok=True
def chk(cond,msg):
    global ok; out.append(("✅ " if cond else "❌ ")+msg); ok = ok and cond
total=sum(int(r["최종사용길이초"]) for r in rows)
chk(total==360, f"최종 사용 길이 합계 = {total}s (목표 360s)")
# 연속성
prev=0; gaps=[]
for r in rows:
    if int(r["시작초"])!=prev: gaps.append(r["샷ID"])
    prev=int(r["종료초"])
chk(not gaps and prev==360, f"시작·종료 연속성: 공백/중복 {len(gaps)}건 {gaps}, 마지막 종료 {prev}s")
ai=[r for r in rows if r["방식"]!="NONE"]; non=[r for r in rows if r["방식"]=="NONE"]
ai_sec=sum(int(r["최종사용길이초"]) for r in ai); non_sec=sum(int(r["최종사용길이초"]) for r in non)
intro=sum(int(r["최종사용길이초"]) for r in non if r["샷ID"]=="INTRO")
out.append(f"ℹ️ AI 생성 샷 {len(ai)}개 / 비생성 블록 {len(non)}개 ({', '.join(r['샷ID'] for r in non)})")
out.append(f"ℹ️ AI 사용 {ai_sec}s · 비생성 {non_sec}s (인트로 {intro}s 포함)")
r1=ai_sec/360; r2=ai_sec/(360-intro); r3=ai_sec/(ai_sec+ (non_sec-intro))
out.append(f"ℹ️ Seedance 비율 — 분모 전체 360s: **{r1:.1%}** · 인트로 제외 340s: **{r2:.1%}** · 인트로 제외·검정/크레딧 포함: {r3:.1%}")
chk(r1>=0.70, "70% 요건: 가장 보수적인 분모(전체 360s)로도 충족 (규정상 분모 정의는 미확인)")
req=sum(int(r["생성요청길이초"]) for r in ai)
out.append(f"ℹ️ 생성 요청 길이 합계 {req}s (5/10초 옵션 가정) · 평균 4회 시도 시 {req*4}s ≈ 10초 클립 {req*4/10:.0f}편 상당")
miss=[r["샷ID"] for r in ai if len(r["프롬프트"].strip())<60]
chk(not miss, f"모든 AI 샷에 프롬프트 존재 (누락 {miss})")
multi=[r["샷ID"] for r in ai if r["카메라"] and len([k for k in ["push","pull","pan","tilt","track","orbit","handheld"] if k in r["카메라"]])>1 and "then" not in r["카메라"]]
chk(not multi, f"샷당 카메라 이동 하나 (복수 {multi})")
pr=collections.Counter(r["우선순위"] for r in ai); out.append(f"ℹ️ 우선순위 P0 {pr['P0']} · P1 {pr['P1']} · P2 {pr['P2']}")
# 장면 범위
sc=collections.OrderedDict()
for r in rows: sc.setdefault(r["장면"],[int(r["시작초"]),int(r["종료초"])]); sc[r["장면"]][1]=int(r["종료초"])
md=open("01_입구_시나리오_v4.md",encoding="utf-8").read()
hdr=re.findall(r"### (S\d+)\..*?\((\d+:\d\d)[–-](\d+:\d\d)\)", md)
mism=[]
for s,a,b in hdr:
    if s not in sc or sc[s]!=[sec(a),sec(b)]: mism.append(f"{s}: 시나리오 {a}–{b} vs CSV {sc.get(s)}")
chk(hdr and not mism, f"시나리오 장면 시각 = CSV 장면 범위 ({len(hdr)}개 장면 대조, 불일치 {mism})")
# 프롬프트 MD 샷 수 대조
pm=open("03_Seedance_프롬프트_v4.md",encoding="utf-8").read()
cnt=len(re.findall(r"^### [\w-]+ · ", pm, re.M))
chk(cnt==len(rows), f"03 프롬프트 문서 샷 수 {cnt} = CSV 행 수 {len(rows)}")
dial=len(re.findall(r"^\*\*(동수|해인|팀장)\*\*:", md, re.M)); out.append(f"ℹ️ 시나리오 대사 {dial}줄")
res=["# v4 자동검증 결과","",f"검사 스크립트 `check_v4.py` · 대상 `01/02/03` · 결과: **{'전부 통과' if ok else '실패 항목 있음'}**",""]+["- "+l for l in out]+["","## 장면 범위 (CSV 기준)","","| 장면 | 시작 | 종료 | 길이 |","|---|---|---|---|"]
for s,(a,b) in sc.items(): res.append(f"| {s} | {a//60}:{a%60:02d} | {b//60}:{b%60:02d} | {b-a}s |")
res+=["","## 미확인·가정","- 대회 규정의 70% 분모(인트로·크레딧 포함 여부)는 공식 페이지에 정의 없음 → 세 분모 모두 산출.","- Dreamina 생성 길이 옵션을 5/10초로 가정. 제작 당일 UI 확인 후 gen_v4.py의 req_len 수정.","- 영어 자막 SRT는 편집 단계 산출물로 본 검증 범위 밖."]
pathlib.Path("10_자동검증_결과.md").write_text("\n".join(res),encoding="utf-8"); print("\n".join(out)); print("OK" if ok else "FAIL")
