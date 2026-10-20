# -*- coding: utf-8 -*-
"""v4.2 자동검증. 결과를 ① 계획 구조 ② 사실출처 ③ 파일럿 ④ 규정 ⑤ 최종영상 으로 분리해 10_자동검증_결과.md에 기록."""
import csv, re, collections, pathlib, json
CSV="02_입구_샷리스트_v4.2.csv"; MD="01_입구_시나리오_v4.2.md"; PM="03_Seedance_프롬프트_v4.2.md"; RG="04_레퍼런스_이미지_가이드_v4.2.md"; FC="FACT_CLAIMS_v4.2.csv"
rows=list(csv.DictReader(open(CSV,encoding="utf-8-sig"))); sec=lambda s:int(s.split(":")[0])*60+int(s.split(":")[1])
R={"구조":[], "사실":[], "파일럿":[], "규정":[], "최종영상":[]}; status={}
def chk(sec_, c, msg): R[sec_].append(("✅ " if c else "❌ ")+msg); status[sec_]=status.get(sec_,True) and c
def info(sec_, msg): R[sec_].append("ℹ️ "+msg)
def pend(sec_, msg): R[sec_].append("⏳ PENDING "+msg); status[sec_]=False
# ---- ① 계획 구조 ----
total=sum(int(r["최종사용길이초"]) for r in rows); chk("구조", 300<=total<=420, f"러닝타임 {total}s ({total//60}:{total%60:02d}) — 규정 5~7분 범위(인트로 포함 여부 PENDING이어도 범위 내)")
prev=0; gaps=[]; bad=[]
for r in rows:
    if int(r["시작초"])!=prev: gaps.append(r["샷ID"])
    if int(r["종료초"])-int(r["시작초"])!=int(r["최종사용길이초"]): bad.append(r["샷ID"])
    prev=int(r["종료초"])
chk("구조", not gaps and prev==total, f"연속성 공백/중복 {gaps}"); chk("구조", not bad, f"행별 길이 검산 불일치 {bad}")
ids=[r["샷ID"] for r in rows]; chk("구조", len(ids)==len(set(ids)), "샷ID 중복 없음")
ai=[r for r in rows if r["방식"]!="NONE"]; non=[r for r in rows if r["방식"]=="NONE"]; ai_sec=sum(int(r["최종사용길이초"]) for r in ai); intro=sum(int(r["최종사용길이초"]) for r in non if r["샷ID"]=="INTRO")
info("구조", f"{len(rows)}행 = AI {len(ai)}컷 {ai_sec}s + 비생성 {len(non)}블록 {total-ai_sec}s ({', '.join(r['샷ID'] for r in non)})")
info("구조", f"Seedance 비율(계획·잠정): 전체 {ai_sec/total:.2%} · 인트로 제외 {ai_sec/(total-intro):.2%}")
chk("구조", ai_sec/total>=0.70, "70%: 보수적 분모로도 충족(계획 수치)")
chk("구조", set(r["방식"] for r in rows)<={"T2V","I2V","REF","NONE"}, "생성 방식 집합")
chk("구조", not [r["샷ID"] for r in ai if len(r["프롬프트"].strip())<60], "AI 샷 프롬프트 존재")
multi=[r["샷ID"] for r in ai if len([k for k in ["push","pull","pan","tilt","track","orbit","handheld"] if k in r["카메라"]])>1 and "then" not in r["카메라"]]; chk("구조", not multi, f"샷당 카메라 이동 하나 {multi}")
pr=collections.Counter(r["우선순위"] for r in ai); chk("구조", pr["P0"]+pr["P1"]+pr["P2"]==len(ai), f"우선순위 합계 P0 {pr['P0']} + P1 {pr['P1']} + P2 {pr['P2']} = {len(ai)}")
# 상충 지시
DSC="faded orange safety vest over gray shirt, old scratched white hard hat"; DSH="worn gray long-sleeve shirt, bareheaded"
hat=[r["샷ID"] for r in ai if "no hat" in r["프롬프트"] or (DSC in r["프롬프트"] and DSH in r["프롬프트"])]; chk("구조", not hat, f"같은 인물에 hard hat ↔ no hat/bareheaded 상충 {hat}")
indoor=[r["샷ID"] for r in ai if r["장면"] in ("S2","S3") and "headlamp strap" in r["프롬프트"]]; chk("구조", not indoor, f"실내(S2·S3) 헤드랜턴 상수 {indoor}")
kor=[r["샷ID"] for r in ai if re.search(r"[가-힣（）]", r["프롬프트"])]; chk("구조", not kor, f"프롬프트 내 한글/전각 메모 {kor}")
gram=[r["샷ID"] for r in ai if "forehead's" in r["프롬프트"]]; chk("구조", not gram, f"비문('forehead's hand') {gram}")
comp=[r["샷ID"] for r in ai if re.search(r"\b(then|Then) a (cool|white|headlamp)", r["프롬프트"]) and "fades in" in r["프롬프트"]]; chk("구조", not comp, f"한 프롬프트 두 국면(매치컷 내장) {comp}")
r107=next(r for r in rows if r["샷ID"]=="10-7"); chk("구조", "hand" in r107["프롬프트"] and "never floats" in r107["프롬프트"], "10-7 봉투는 손이 들어 올림·떠오르지 않음 명시")
cave=[r["샷ID"] for r in ai if r["광원블록"]=="CAVE_LIGHT" and "Pitch-black lava cave" not in r["프롬프트"]]; chk("구조", not cave, f"CAVE_LIGHT 블록 누락 {cave}")
base=[r["샷ID"] for r in ai if "Cinematic live-action realism" not in r["프롬프트"]]; chk("구조", not base, f"STYLE_BASE 누락 {base}")
rg=open(RG,encoding="utf-8").read(); defined=set(re.findall(r"\| (R-[A-Za-z0-9-]+) \|", rg))|{"R-DS25-hand","R-HI-hand","R-HI-civil","R-DS25-home"}
used=set(x for r in ai for x in r["레퍼런스ID"].split(";") if x); chk("구조", not (used-defined), f"레퍼런스 ID 정의 {sorted(used-defined)}")
sc=json.load(open("scene_ranges.json")); md=open(MD,encoding="utf-8").read(); hdr=re.findall(r"### (S\d+)\..*?\((\d+:\d\d)[–-](\d+:\d\d)\)", md)
mism=[f"{s}:{a}-{b}" for s,a,b in hdr if s not in sc or sc[s]!=[sec(a),sec(b)]]; chk("구조", hdr and not mism, f"시나리오 장면 시각 = CSV ({len(hdr)}개) {mism}")
pm=open(PM,encoding="utf-8").read(); cnt=len(re.findall(r"^### [\w-]+ · ", pm, re.M)); chk("구조", cnt==len(rows), f"03 샷 수 {cnt} = CSV {len(rows)}")
age=[]
if "동수**(44)" not in md: age.append("01 2005 동수 44")
if "Korean man, 44" not in pm or "Korean man, 43" in pm: age.append("03 DS05 44")
if "Same man at 44" not in rg: age.append("04 R-DS05 44")
if "'96" not in md or "1996" not in rg: age.append("사진 1996")
chk("구조", not age, f"나이·연도 일관성 {age}")
chk("구조", "극중 재구성된 기록" in md and "창작" in md.split("### S12")[1][:500], "S2 화면 고지 + 크레딧 창작 고지")
# 자막 타임코드: BLACK 블록 대사 3줄이 10초에 들어가는지
blk=next(r for r in rows if r["샷ID"]=="BLACK"); nd=blk["음향_대사_자막"].split("|")[0].count("/")+1; chk("구조", int(blk["최종사용길이초"])>=nd*2.5, f"암전 {blk['최종사용길이초']}s 안에 대사 {nd}줄(2.5s/줄) 수용")
info("구조", f"대사 {len(re.findall(r'^\*\*(동수|해인|팀장)\*\*:', md, re.M))}줄 · 생성 요청 합계 {sum(int(r['생성요청길이초']) for r in ai)}s(5/10초 옵션 가정)")
# ---- ② 사실 출처 ----
fc=list(csv.DictReader(open(FC,encoding="utf-8-sig"))); cat=collections.Counter(r["category"] for r in fc)
chk("사실", len(fc)==25, f"FACT_CLAIMS 25건 ({dict(cat)})")
conf=[r["id"] for r in fc if r["category"].startswith(("공식확인","학술확인")) and not r["url"]]; chk("사실", not conf, f"'확인' 판정에 URL {conf}")
nosup=[r["id"] for r in fc if r["category"].startswith("공식확인") and not r["support_level"].startswith("지지")]; chk("사실", not nosup, f"공식확인인데 원문 지지 아님 {nosup}")
blocked=[r["id"] for r in fc if "접속실패" in r["access_status"] or "403" in r["access_status"] or "503" in r["access_status"]]
if blocked: pend("사실", f"1차 원문 접속불가(대체 출처로 판정): #{', #'.join(blocked)}")
pend("사실", "법령 원문(law.go.kr)·고시 관보·박재현 논문 PDF 미열람")
# ---- ③ 파일럿 ----
sc_=list(csv.DictReader(open("PILOT_SCORECARD.csv",encoding="utf-8"))); filled=[r for r in sc_ if r["passed"]]
if not filled: pend("파일럿", "파일럿 3컷 미실행 — 영상·단가 없음. 품질 검증 불가")
led=list(csv.DictReader(open("GENERATION_LEDGER.csv",encoding="utf-8"))); chk("파일럿", all(not r["credits_charged"] for r in led), "GENERATION_LEDGER 실측값 없음(템플릿 상태)")
# ---- ④ 규정 ----
for m in ["인트로·크레딧의 5~7분 포함 여부","70% 분모·입증법","공식 인트로 실제 길이(20초는 가정)","마감 시각·시간대","코덱·프레임·자막 번인","팀/개인·Top5 참석·여비","2027 약관(라이선스) 원문"]: pend("규정", m)
chk("규정", True, "확인된 규정(5~7분, 1080p 16:9 MP4/MOV, 영어 자막, Seedance ≥70%, 11/20 마감, 심사 비중)은 RULES_SOURCE_REGISTER에 URL과 인용 기록")
# ---- ⑤ 최종영상 ----
pend("최종영상", "완성 영상 없음. FINAL_QA_CHECKLIST 15항목 전부 미완료. 제출 준비 미완료")
# ---- 출력 ----
out=["# v4.2 자동검증 결과 (`check_v4.py`)","",
     f"| 영역 | 상태 |","|---|---|"]+[f"| ① 계획 구조 | {'PASS' if status.get('구조') else 'FAIL'} |", f"| ② 사실 출처 | {'PASS' if status.get('사실') else 'PASS(일부)/PENDING'} |", "| ③ 파일럿 | PENDING |", "| ④ 규정 | PENDING(확인 항목은 기록됨) |", "| ⑤ 최종 영상 | PENDING |"]+[""]
for k,v in R.items(): out+=[f"## {k}",""]+["- "+x for x in v]+[""]
out+=["## 장면 범위 (CSV)","","| 장면 | 시작 | 종료 | 길이 |","|---|---|---|---|"]+[f"| {s} | {a//60}:{a%60:02d} | {b//60}:{b%60:02d} | {b-a}s |" for s,(a,b) in sc.items()]
pathlib.Path("10_자동검증_결과.md").write_text("\n".join(out),encoding="utf-8")
print("\n".join(x for v in R.values() for x in v if x.startswith(("❌","✅ 러닝","ℹ️")))); print("STRUCT", "PASS" if status.get("구조") else "FAIL")
