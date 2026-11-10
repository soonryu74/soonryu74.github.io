"""일반 뉴스 검증 보고서 PDF 생성: python3 report/build_report.py"""
import json, os, html, base64, subprocess
D = os.path.dirname(os.path.abspath(__file__))
items = sum((json.load(open(os.path.join(D, f"part{i}.json"), encoding="utf-8")) for i in (1, 2, 3)), [])
assert len(items) == 60
e = html.escape
font = lambda w: "file://" + os.path.join(D, "..", "public", "fonts", f"Pretendard-{w}.woff2")
img = lambda y: "data:image/jpeg;base64," + base64.b64encode(open(os.path.join(D, f"y{y}.jpg"), "rb").read()).decode()
n_ok = sum(1 for x in items if x["verdict"] == "일치")
n_full = sum(1 for x in items if x["confirmed_by"] == "fulltext")
CAUTION = [
 ("2019", "세계 최초 5G 상용화", "2019.4.3 밤 11시 이통 3사 1호 가입자 개통으로 미국 버라이즌보다 약 2시간 앞섰다. 다만 미국 언론 일부는 버라이즌을 최초로 본다.", "유지 가능. 엄밀히 하려면 ‘세계 최초 5G 스마트폰 상용화’"),
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
.ok{{background:#dff3e6;color:#17804a}} .bad{{background:#fde2e0;color:#b3261e}} .foot{{margin-top:18px;color:#5b6577;font-size:8.4pt;border-top:1px solid #d5dbe6;padding-top:8px}}
</style></head><body>
<h1>kdca-workshop_1111.mp4 일반 뉴스 검증 보고서</h1>
<div class="sub">대상: 구글 드라이브 ‘공모전’ 폴더 kdca-workshop_1111.mp4 (60,613,897바이트 · 4분 41초 · 1920×1080) · 범위: 화면 좌측 ‘그 세상’ 일반 뉴스 60건 · 검증일 2026-11-10</div>
<div class="box"><b>결론</b><ul>
<li>60건 모두 영상에 적힌 연도와 내용이 출처와 <b>일치</b>합니다. 연도·숫자가 틀린 항목은 없습니다.</li>
<li>60건 모두 출처 기사·문서의 <b>본문을 열어</b> 날짜와 숫자를 확인했습니다. 이전 검증은 제목·발췌문 기준이었습니다.</li>
<li>오류는 아니지만 <b>표현을 바꾸면 틀리게 되는 곳이 8군데</b> 있습니다. 가장 먼저 볼 곳은 2019년 ‘세계 최초 5G 상용화’입니다.</li>
</ul></div>
<div class="cards"><div class="card g"><b>{n_ok} / 60</b><span>연도·내용 일치</span></div><div class="card"><b>0</b><span>연도·숫자 오류</span></div><div class="card"><b>{len(CAUTION)}</b><span>표현 주의 (오류 아님)</span></div><div class="card"><b>{n_full} / 60</b><span>출처 본문으로 확인</span></div></div>
<h2>1. 표현 주의 {len(CAUTION)}건</h2>
<table><tr><th style="width:70px">연도</th><th style="width:150px">영상 표기</th><th>확인된 사실</th><th style="width:150px">권고</th></tr>{caut}</table>
<h2>2. 검증 방법과 한계</h2>
<ul>
<li><b>대상 확인</b> — 드라이브 파일의 크기가 제작 최종본과 바이트 단위로 같아 같은 파일로 보았습니다. 드라이브 파일을 직접 내려받아 재생하지는 않았습니다.</li>
<li><b>영상 표기</b> — 최종본에서 연도별 장면을 뽑아 좌측 뉴스 3건씩을 확인했고(아래 표의 화면), 제작 원본 문구와 대조했습니다.</li>
<li><b>대조</b> — 건마다 웹 검색 후 출처 페이지 본문을 열어 날짜·숫자를 확인했습니다. 본문에 없어 발췌문으로만 본 세부 사항은 표의 주황색 메모에 적었습니다.</li>
<li><b>한계</b> — 출처는 대부분 언론 보도이고, 건당 1~2개 출처입니다. 2026년 지방선거 투표율은 잠정치입니다. 우측 질병관리청 기록 20건은 이 보고서의 범위가 아닙니다.</li>
</ul>
<h2>3. 전체 대조표 (60건)</h2>
<table><tr><th>연도 · 영상 화면</th><th>영상 표기</th><th>확인된 날짜·사실</th><th>판정</th><th>출처</th></tr>{rows}</table>
<div class="foot">이 보고서는 영상 화면의 문구를 공개 자료와 대조한 사실 확인 결과입니다. 전문가 검토를 거친 문서가 아니며, 영상과 이 보고서는 AI로 제작되었습니다.</div>
</body></html>"""
open(os.path.join(D, "report.html"), "w", encoding="utf-8").write(doc)
js = """const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://'+process.argv[2]);await p.evaluate(()=>document.fonts.ready);await p.pdf({path:process.argv[3],format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font-size:7px;width:100%;text-align:center;color:#888"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'});await b.close()})()"""
open(os.path.join(D, "pdf.js"), "w").write(js)
out = os.path.join(D, "kdca-workshop_1111_일반뉴스_검증보고서.pdf")
subprocess.run(["node", os.path.join(D, "pdf.js"), os.path.join(D, "report.html"), out], check=True, env={**os.environ, "NODE_PATH": subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()})
print(out, n_ok, n_full)
