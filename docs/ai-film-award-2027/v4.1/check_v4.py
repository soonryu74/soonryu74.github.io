# -*- coding: utf-8 -*-
"""v4.1 자동검증: 타임라인·AI 비율·장면 대조·프롬프트·레퍼런스 정의·방식·중복·나이/연도·사실주장 URL. 결과 → 10_자동검증_결과.md"""
import csv, re, collections, pathlib
CSV="02_입구_샷리스트_v4.1.csv"; MD="01_입구_시나리오_v4.1.md"; PM="03_Seedance_프롬프트_v4.1.md"; RG="04_레퍼런스_이미지_가이드_v4.1.md"
rows=list(csv.DictReader(open(CSV,encoding="utf-8-sig")))
def sec(s): m,s2=s.split(":"); return int(m)*60+int(s2)
out=[]; ok=True
def chk(c,msg):
    global ok; out.append(("✅ " if c else "❌ ")+msg); ok=ok and c
total=sum(int(r["최종사용길이초"]) for r in rows); chk(total==360, f"최종 사용 길이 합계 = {total}s (목표 360s)")
prev=0; gaps=[]; badlen=[]
for r in rows:
    if int(r["시작초"])!=prev: gaps.append(r["샷ID"])
    if int(r["종료초"])-int(r["시작초"])!=int(r["최종사용길이초"]): badlen.append(r["샷ID"])
    prev=int(r["종료초"])
chk(not gaps and prev==360, f"연속성: 공백/중복 {gaps}, 마지막 종료 {prev}s"); chk(not badlen, f"행별 종료-시작=길이 (불일치 {badlen})")
ids=[r["샷ID"] for r in rows]; dup=[i for i,c in collections.Counter(ids).items() if c>1]; chk(not dup, f"샷ID 중복 {dup}")
ai=[r for r in rows if r["방식"]!="NONE"]; non=[r for r in rows if r["방식"]=="NONE"]
ai_sec=sum(int(r["최종사용길이초"]) for r in ai); non_sec=360-ai_sec; intro=sum(int(r["최종사용길이초"]) for r in non if r["샷ID"]=="INTRO")
out.append(f"ℹ️ AI 샷 {len(ai)} / 비생성 블록 {len(non)} ({', '.join(r['샷ID'] for r in non)}) · AI {ai_sec}s · 비생성 {non_sec}s")
out.append(f"ℹ️ Seedance 비율(잠정, 분모 미확인): 전체 360s **{ai_sec/360:.2%}** · 인트로 제외 340s **{ai_sec/(360-intro):.2%}**")
chk(ai_sec/360>=0.70, "70% 요건: 가장 보수적 분모로도 충족 (계획 수치. 완성 영상 기준 재검증 필요)")
chk(set(r["방식"] for r in rows)<= {"T2V","I2V","REF","NONE"}, f"생성 방식 집합 {sorted(set(r['방식'] for r in rows))}")
miss=[r["샷ID"] for r in ai if len(r["프롬프트"].strip())<60]; chk(not miss, f"AI 샷 프롬프트 존재 (누락 {miss})")
multi=[r["샷ID"] for r in ai if len([k for k in ["push","pull","pan","tilt","track","orbit","handheld"] if k in r["카메라"]])>1 and "then" not in r["카메라"]]; chk(not multi, f"샷당 카메라 이동 하나 (복수 {multi})")
req=sum(int(r["생성요청길이초"]) for r in ai); out.append(f"ℹ️ 생성 요청 합계 {req}s (5/10초 옵션 가정)")
pr=collections.Counter(r["우선순위"] for r in ai); out.append(f"ℹ️ 우선순위 P0 {pr['P0']} · P1 {pr['P1']} · P2 {pr['P2']}")
p0=[r["샷ID"] for r in ai if r["우선순위"]=="P0"]; chk(len(p0)==len(set(p0)), "P0 샷ID 중복 없음")
# 레퍼런스 ID 정의 여부
rg=open(RG,encoding="utf-8").read(); defined=set(re.findall(r"\| (R-[A-Za-z0-9-]+) \|", rg))|{"R-DS25-hand","R-HI-hand"}
used=set(x for r in ai for x in r["레퍼런스ID"].split(";") if x); undef=sorted(used-defined); chk(not undef, f"CSV 레퍼런스 ID가 04에 정의됨 (미정의 {undef})")
# 장면 대조
sc=collections.OrderedDict()
for r in rows: sc.setdefault(r["장면"],[int(r["시작초"]),int(r["종료초"])]); sc[r["장면"]][1]=int(r["종료초"])
md=open(MD,encoding="utf-8").read(); hdr=re.findall(r"### (S\d+)\..*?\((\d+:\d\d)[–-](\d+:\d\d)\)", md)
mism=[f"{s}: {a}-{b} vs {sc.get(s)}" for s,a,b in hdr if s not in sc or sc[s]!=[sec(a),sec(b)]]; chk(hdr and not mism, f"시나리오 장면 시각 = CSV ({len(hdr)}개, 불일치 {mism})")
pm=open(PM,encoding="utf-8").read(); cnt=len(re.findall(r"^### [\w-]+ · ", pm, re.M)); chk(cnt==len(rows), f"03 샷 수 {cnt} = CSV {len(rows)}")
# 나이·연도 일관성
age_err=[]
if "동수**(44)" not in md: age_err.append("01: 2005년 동수 44 미표기")
if "Korean man, 44" not in pm or "Korean man, 43" in pm: age_err.append("03: 2005 동수 44 아님")
if "Korean man, 64" not in pm: age_err.append("03: 2025 동수 64 없음")
if "Korean woman, 34" not in pm: age_err.append("03: 해인 34 없음")
if "Same man at 44" not in rg: age_err.append("04: R-DS05 44 아님")
if "'96" not in md or "'96" not in rg or "1996" not in pm: age_err.append("사진 연도 1996 미동기화")
if re.search(r"5-year-old|5살|다섯 살", md+rg) and "1996" not in rg: age_err.append("5세 사진 연도 불명")
chk(not age_err, f"나이·연도 일관성 (동수 44→64, 해인 34, 사진 1996) {age_err}")
# 사실주장: 확인 판정에 URL 필수
fc=list(csv.DictReader(open("FACT_CLAIMS.csv",encoding="utf-8-sig"))); nourl=[r["id"] for r in fc if r["category"] in ("공식확인","학술확인(일반)") and not r["url"]]
chk(not nourl, f"FACT_CLAIMS {len(fc)}건: '확인' 판정에 URL 존재 (누락 {nourl})"); out.append("ℹ️ 분류: "+", ".join(f"{k} {v}" for k,v in collections.Counter(r['category'] for r in fc).items()))
chk("극중 재구성된 기록" in md and "창작" in md.split("### S12")[1][:400], "화면 고지(S2) + 크레딧 첫 화면 창작 고지 존재")
dial=len(re.findall(r"^\*\*(동수|해인|팀장)\*\*:", md, re.M)); out.append(f"ℹ️ 대사 {dial}줄")
res=["# v4.1 자동검증 결과","",f"`check_v4.py` · 대상 01/02/03/04/FACT_CLAIMS · 결과: **{'전부 통과' if ok else '실패 항목 있음'}**",""]+["- "+l for l in out]+["","## 장면 범위","","| 장면 | 시작 | 종료 | 길이 |","|---|---|---|---|"]+[f"| {s} | {a//60}:{a%60:02d} | {b//60}:{b%60:02d} | {b-a}s |" for s,(a,b) in sc.items()]
res+=["","## 미확인·가정","- 70% 분모·인트로 포함 여부: 공식 정의 없음 → 잠정 비율.","- 위 비율은 계획표 산술. 완성 영상의 Seedance 출처는 GENERATION_LEDGER.csv와 타임코드로 재검증.","- 생성 길이 옵션 5/10초 가정. 파일럿 후 gen_v4.py req_len 수정.","- 파일럿 3컷 미실행(Dreamina 계정 필요)."]
pathlib.Path("10_자동검증_결과.md").write_text("\n".join(res),encoding="utf-8"); print("\n".join(out)); print("OK" if ok else "FAIL")
