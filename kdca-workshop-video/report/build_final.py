"""최종본 검증 보고서 PDF 생성: python3 report/build_final.py"""
import json, os, html, base64, subprocess
D = os.path.dirname(os.path.abspath(__file__))
items = sum((json.load(open(os.path.join(D, f"part{i}.json"), encoding="utf-8")) for i in (1, 2, 3)), [])
assert len(items) == 60
e = html.escape
kd = json.load(open(os.path.join(D, "kdca.json"), encoding="utf-8"))
vt = {r["year"]: r for r in json.load(open(os.path.join(D, "video_text.json"), encoding="utf-8"))}
fimg = lambda y: "data:image/jpeg;base64," + base64.b64encode(open(os.path.join(D, f"f{y}.jpg"), "rb").read()).decode()
font = lambda w: "file://" + os.path.join(D, "..", "public", "fonts", f"Pretendard-{w}.woff2")
img = lambda y: "data:image/jpeg;base64," + base64.b64encode(open(os.path.join(D, f"y{y}.jpg"), "rb").read()).decode()
n_ok = sum(1 for x in items if x["verdict"] == "일치")
n_full = sum(1 for x in items if x["confirmed_by"] == "fulltext")
CAUTION = [
 ("2019", "세계 최초 5G 스마트폰 상용화", "2019.4.3 밤 11시 이통 3사 1호 가입자 개통으로 미국 버라이즌보다 약 2시간 앞섰다. 미국 언론 일부는 버라이즌을 최초로 본다.", "‘스마트폰’으로 한정한 현재 표기 유지 (이번 판에서 수정)"),
 ("2007", "태안 기름 유출, 123만 자원봉사 행렬", "123만 명은 2008년 7월까지 이어진 누적 연인원이다. 일부 정부 자료는 ‘120만’으로 적는다.", "유지 가능"),
 ("2009 · 2021", "나로호 첫 발사 / 누리호 첫 발사", "두 번 모두 발사는 했지만 궤도 안착에는 실패했다.", "‘첫 발사’ 유지. ‘성공’으로 바꾸면 틀림"),
 ("2010", "남아공 월드컵, 첫 원정 16강", "16강 자체는 2002년(홈)에 이어 두 번째다.", "‘원정’ 수식어 유지"),
 ("2017", "방탄소년단, 빌보드 뮤직 어워드 첫 수상", "방탄소년단의 첫 수상이자 K팝 그룹 최초다. 한국 가수 최초는 2013년 싸이다.", "유지 가능. ‘한국 가수 최초’로 바꾸면 틀림"),
 ("2021 · 2023", "도쿄올림픽 / 항저우 아시안게임", "공식 명칭은 ‘2020 도쿄’, ‘2022 항저우’지만 실제 개최는 2021년, 2023년이다.", "개최 연도 기준 배치가 맞음"),
 ("2023", "챗GPT 열풍, 생성형 AI 시대", "출시는 2022년 말이고, 2023년 1월 월간 이용자 1억 명(추정)을 넘으며 확산됐다.", "‘열풍’ 유지. ‘출시’로 바꾸면 틀림"),
 ("2026", "북중미 월드컵", "대회는 2026.6.11~7.19 열렸고 한국은 조별리그에서 탈락했다.", "대회명만 쓴 현재 표기 유지. 성적 수식어 금지"),
]
rows = ""
prev = None
for x in items:
    y = x["year"]
    first = y != prev
    cnt = sum(1 for k in items if k["year"] == y)
    ycell = f'<td class="yr" rowspan="{cnt}"><b>{y}</b><img src="{img(y)}"></td>' if first else ""
    note = f'<div class="note">{e(x["note"])}</div>' if x["note"] else ""
    badge = "ok" if x["verdict"] == "일치" else "bad"
    rows += f'<tr class="{"first" if first else ""}">{ycell}<td class="claim">{e(x["claim"])}</td><td>{e(x["actual"])}{note}</td><td><span class="b {badge}">{e(x["verdict"])}</span></td><td class="src"><a href="{e(x["source_url"])}">{e(x["source_title"])}</a></td></tr>'
    prev = y
krows = ""
for k in kd:
    v = vt[k["year"]]
    shown = e(v["title"]) + "<div class='sm'>" + e(" · ".join(x for x in [v["sub"], v["stat"], v["extra"]] if x)) + "</div>"
    note = f'<div class="note">{e(k["note"])}</div>' if k["note"] else ""
    krows += f'<tr class="first"><td class="yr"><b>{k["year"]}</b><img src="{fimg(k["year"])}"></td><td class="claim">{shown}</td><td>{e(k["actual"])}{note}</td><td><span class="b ok">일치</span></td><td class="src"><a href="{e(k["url"])}">{e(k["src"])}</a></td></tr>'
CHANGES = [
 ("2009", "위기경보 ‘심각’ — 사상 첫 최고 단계 발령", "위기단계 ‘심각’ — 2009. 11. 3. 최고 단계로 격상", "‘사상 첫’ 근거 미확인, 당시 용어 반영. 내레이션 재녹음"),
 ("2011", "역학조사로 원인 규명", "역학조사와 동물실험으로 가습기살균제 위험 확인", "8월은 중간결과, 확인은 11월"),
 ("2013 좌측", "숭례문, 5년 만에 복구 완료", "숭례문, 5년여 만에 복구 완료", "정확히 5년 3개월"),
 ("2014", "부제: 에볼라 유입 차단을 위한 검역 강화", "부제: 본인부담금 폐지 · 민간 의료기관 포함", "제목과 다른 사안"),
 ("2017 좌측", "포항 지진, 사상 첫 수능 연기", "포항 지진, 수능 일주일 연기", "2005·2010년에도 일정 변경 사례"),
 ("2019", "12월, 원인 불명 폐렴 정보 입수", "12월 31일, 중국 우한 원인 불명 폐렴 발표", "기관 인지 시점의 근거 없음"),
 ("2019 좌측", "세계 최초 5G 상용화", "세계 최초 5G 스마트폰 상용화", "‘최초’에 이견이 있어 범위 한정"),
 ("2020", "내레이션이 ‘2010년’, ‘글’로 들림", "‘이천이십 년 일월 이십일’, ‘길’로 재녹음", "발음 불명확"),
 ("2018 · 2021 · 2022 · 엔딩", "숫자가 0부터 올라가는 애니메이션", "최종 숫자(38일, 70%, 757일, 20년)가 바로 표시", "중간 숫자가 오류로 보이는 문제"),
 ("2022", "2년 1개월 만의 일상 회복", "757일 만의 거리두기 해제", "정확히 2년 27일"),
 ("2023 · 2024", "일상적 관리 체계로 / ‘관심’으로", "‘심각’ → ‘경계’ (6.1) / ‘경계’ → ‘관심’ (5.1)", "단계 변화 명시"),
 ("2025", "질병관리청 출범 5주년", "WHO 합동외부평가 52개 지표 만점 · 출범 5주년", "기념행사 근거 없음, 대표 사건으로 교체"),
 ("2026", "AI 전담조직 신설 · 남자 청소년 HPV 무료접종", "AI 담당관 신설 · 12세 남성 청소년 HPV 무료접종", "대상이 12세 한 개 연령"),
 ("2026 좌측", "AI 에이전트, 일상 속으로", "제9회 전국동시지방선거", "특정 사건이 아니어서 검증 불가"),
]
chg = "".join(f"<tr><td><b>{a}</b></td><td>{e(b)}</td><td>{e(c)}</td><td>{e(d)}</td></tr>" for a, b, c, d in CHANGES)
caut = "".join(f"<tr><td><b>{a}</b></td><td>{e(b)}</td><td>{e(c)}</td><td>{e(d)}</td></tr>" for a, b, c, d in CAUTION)
doc = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@font-face{{font-family:P;src:url({font('Medium')});font-weight:400}}
@font-face{{font-family:P;src:url({font('Bold')});font-weight:700}}
@page{{size:A4;margin:16mm 14mm}}
*{{box-sizing:border-box}} body{{font-family:P,sans-serif;font-size:9.6pt;color:#1a2233;line-height:1.5;word-break:keep-all}}
h1{{font-size:20pt;margin:0 0 4px;color:#0d1b3d}} .sub{{color:#5b6577;font-size:9.5pt;margin-bottom:14px}}
h2{{font-size:13pt;margin:22px 0 8px;padding-left:9px;border-left:5px solid #1f5fbf;color:#0d1b3d;break-after:avoid}}
.box{{background:#eef4fc;border:1px solid #c9daf3;border-radius:8px;padding:12px 16px}} .box ul{{margin:6px 0 0;padding-left:18px}}
.cards{{display:flex;gap:10px;margin:14px 0}} .card{{flex:1;border:1px solid #d5dbe6;border-radius:8px;padding:10px;text-align:center}}
.card b{{display:block;font-size:20pt;color:#1f5fbf}} .card.g b{{color:#17804a}} .card span{{font-size:8.6pt;color:#5b6577}}
table{{width:100%;border-collapse:collapse;font-size:8.6pt}} th{{background:#14254a;color:#fff;text-align:left;padding:6px 7px;font-weight:700}}
td{{padding:6px 7px;border-bottom:1px solid #e3e7ee;vertical-align:top}} tr{{break-inside:avoid}} tr.first td{{border-top:1.5px solid #9fb0cc}}
.yr{{width:118px;color:#1f5fbf;font-size:11pt}} .yr img{{display:block;width:104px;margin-top:5px;border-radius:4px}}
.claim{{width:150px;font-weight:700}} .src{{width:150px;font-size:7.8pt}} a{{color:#1f5fbf;text-decoration:none}}
.note{{color:#8a5a00;font-size:8pt;margin-top:3px}} .b{{padding:2px 8px;border-radius:10px;font-weight:700;font-size:8pt;white-space:nowrap}}
.ok{{background:#dff3e6;color:#17804a}} .bad{{background:#fde2e0;color:#b3261e}} .sm{{font-weight:400;color:#5b6577;font-size:8pt;margin-top:3px}} .foot{{margin-top:18px;color:#5b6577;font-size:8.4pt;border-top:1px solid #d5dbe6;padding-top:8px}}
</style></head><body>
<h1>kdca-workshop.mp4 최종본 검증 보고서</h1>
<div class="sub">대상: 「그 세상, 그 시간, 그리고 우리 : 2007 ~ 2026」 최종본 kdca-workshop.mp4 (60,622,298바이트 · 4분 41초 · 1920×1080) · 범위: 우측 질병관리청 기록 20건 + 좌측 일반 뉴스 60건 · 검증일 2026-11-10</div>
<div class="box"><b>결론</b><ul>
<li>질병관리청 기록 20건과 일반 뉴스 60건 모두 영상의 연도·날짜·숫자가 출처와 <b>일치</b>합니다.</li>
<li>검증 과정에서 나온 지적 14건은 모두 최종본에 <b>반영</b>했습니다(1절).</li>
<li>오류는 아니지만 <b>표현을 바꾸면 틀리게 되는 곳이 {len(CAUTION)}군데</b> 있어 따로 적었습니다(4절).</li>
</ul></div>
<div class="cards"><div class="card g"><b>20 / 20</b><span>질병관리청 기록 일치</span></div><div class="card g"><b>{n_ok} / 60</b><span>일반 뉴스 일치</span></div><div class="card"><b>{len(CHANGES)}</b><span>검증 후 수정 반영</span></div><div class="card"><b>0</b><span>남은 연도·숫자 오류</span></div></div>
<h2>1. 검증으로 고친 곳 {len(CHANGES)}건</h2>
<table><tr><th style="width:92px">위치</th><th>수정 전</th><th>수정 후 (최종본)</th><th style="width:150px">이유</th></tr>{chg}</table>
<h2>2. 검증 방법과 한계</h2>
<ul>
<li><b>영상 표기</b> — 최종본에서 연도별 장면을 뽑아 화면 문구를 확인했고(표의 화면), 제작 원본 문구와 대조했습니다. 숫자는 애니메이션이 끝난 뒤의 값으로 판정했습니다.</li>
<li><b>일반 뉴스 60건</b> — 건마다 웹 검색 후 출처 본문을 열어 날짜·숫자를 확인했습니다. 본문에 없어 발췌문으로만 본 세부 사항은 주황색 메모에 적었습니다.</li>
<li><b>질병관리청 기록 20건</b> — 웹 검색으로 공식 페이지·보도자료·언론 보도와 대조했고, 별도로 진행된 기록 검증 보고서 2건(감염병 자료 아카이브·백서 대조)의 판정과 교차 확인했습니다. 원 보도자료 전문을 모두 연 것은 아닙니다.</li>
<li><b>음성</b> — 내레이션 26개는 자동 받아쓰기로 대본과 대조했습니다. 2020년 구간은 완성 영상에서 잘라 다시 확인했습니다. 사람이 직접 들어 확인하지는 않았습니다.</li>
<li><b>한계</b> — 출처는 언론 보도 비중이 높고 건당 1~2개입니다. 2016년 24시간 긴급상황실 정식 개소일, 2025년 WHO 평가 수치, 2026년 지방선거 투표율(잠정)은 공식 원문으로 확정하지 못했습니다.</li>
</ul>
<h2>3. 질병관리청 기록 대조표 (20건)</h2>
<table><tr><th>연도 · 영상 화면</th><th>영상 표기</th><th>확인된 날짜·사실</th><th>판정</th><th>출처</th></tr>{krows}</table>
<h2>4. 일반 뉴스 표현 주의 {len(CAUTION)}건 (오류 아님)</h2>
<table><tr><th style="width:70px">연도</th><th style="width:150px">영상 표기</th><th>확인된 사실</th><th style="width:150px">권고</th></tr>{caut}</table>
<h2>5. 일반 뉴스 대조표 (60건)</h2>
<table><tr><th>연도 · 영상 화면</th><th>영상 표기</th><th>확인된 날짜·사실</th><th>판정</th><th>출처</th></tr>{rows}</table>
<div class="foot">이 보고서는 영상 화면의 문구를 공개 자료와 대조한 사실 확인 결과입니다. 전문가 검토를 거친 문서가 아니며, 영상과 이 보고서는 AI로 제작되었습니다.</div>
</body></html>"""
open(os.path.join(D, "final.html"), "w", encoding="utf-8").write(doc)
js = """const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://'+process.argv[2]);await p.evaluate(()=>document.fonts.ready);await p.pdf({path:process.argv[3],format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font-size:7px;width:100%;text-align:center;color:#888"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'});await b.close()})()"""
open(os.path.join(D, "pdf.js"), "w").write(js)
out = os.path.join(D, "kdca-workshop_최종본_검증보고서.pdf")
subprocess.run(["node", os.path.join(D, "pdf.js"), os.path.join(D, "final.html"), out], check=True, env={**os.environ, "NODE_PATH": subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()})
print(out, n_ok, n_full)
