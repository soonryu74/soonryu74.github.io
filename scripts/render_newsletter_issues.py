#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
발간본 만들기: newsletter/samples/*.json → newsletter/issues/*.html + 목록 페이지

- 서식은 newsletter/paper.css (뉴스레터 메이커 미리보기와 동일)
- 이메일 본문 만들기는 newsletter/email.js 를 그대로 씁니다.
실행: python3 scripts/render_newsletter_issues.py
"""
import os, re, json, glob, html, io
import qrcode
from qrcode.image.pil import PilImage

ROOT    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = os.path.join(ROOT, "newsletter", "samples")
ISSUES  = os.path.join(ROOT, "newsletter", "issues")
SITE    = "https://soonryu74.github.io/newsletter/issues/"   # 메일에서 이미지를 불러올 주소

KINDS = {
    "outbreak": {"name": "감염병 발생동향", "sumTitle": "목차",
                 "secs": ["발생 상황", "상황 평가", "국내 관련성 · 권고"], "brand": "#12395f", "accent": "#c2540b"},
    "phsm":     {"name": "감염병 사회 대응(PHSM)", "sumTitle": "목차",
                 "secs": ["연구 · 정책 동향", "핵심 쟁점과 근거", "분과위 시사점 · 토론거리"], "brand": "#3b3080", "accent": "#0e7490"},
    "chronic":  {"name": "만성질환", "sumTitle": "목차",
                 "secs": ["주요 동향", "근거 해석", "국내 적용 시사점"], "brand": "#14532d", "accent": "#a16207"},
    "climate":  {"name": "기후·건강", "sumTitle": "목차",
                 "secs": ["기후 · 건강 동향", "감시체계와 근거", "국내 대응 시사점"], "brand": "#7c2d12", "accent": "#0369a1"},
}
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
         'family=Noto+Sans+KR:wght@400;500;700;800&family=Nanum+Myeongjo:wght@700;800&display=swap">')
e = lambda s: html.escape(str(s or ""), quote=True)

def make_qr(url, out_path, brand="#12395f"):
    """구독 주소를 QR 그림(PNG)으로 저장한다. 인쇄·메일 어디서나 보이도록 그림 파일로 만든다."""
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M,
                       box_size=10, border=2)
    qr.add_data(url); qr.make(fit=True)
    img = qr.make_image(fill_color=brand, back_color="white")
    img.save(out_path)
    return os.path.basename(out_path)

NUM = re.compile(r"(\d[\d,\.]*\s?(?:배|명|건|개|%|℃|년|주|일|시간|개국|개 주|만 명|억|달러|쌍)|\d{1,3}(?:,\d{3})+)")
def mark(text):
    """숫자를 굵게, [1] 같은 근거 번호를 위첨자로."""
    t = e(text)
    t = NUM.sub(r'<b class="num">\1</b>', t)
    t = re.sub(r"\[(\d+(?:\]\[\d+)*)\]", lambda m: "<sup>[" + m.group(1) + "]</sup>", t)
    return t

def ul(items):
    return "<ul>" + "".join(f"<li>{mark(x)}</li>" for x in (items or [])) + "</ul>"

def refs_block(refs):
    items = []
    for r in refs or []:
        head, _, link = r.partition(" — ")
        items.append(f"<li>{e(head)}" + (f' <a href="{e(link)}" target="_blank" rel="noopener">원문</a>' if link else "") + "</li>")
    return (f'<details class="refs"><summary>출처 {len(items)}건</summary>'
            f'<ol>{"".join(items)}</ol></details>')

def paper(data):
    k = KINDS[data["kind"]]
    m, d = data["meta"], data["draft"]
    date_txt = m.get("date", "").replace("-", ".") + "." if m.get("date") else ""

    stats = ""
    if d.get("stats"):
        stats = '<div class="stats">' + "".join(
            f'<div class="stat"><div class="v">{e(s["v"])}</div><div class="l">{e(s["l"])}</div>'
            + (f'<div class="n">{e(s.get("n"))}</div>' if s.get("n") else "") + "</div>"
            for s in d["stats"][:4]) + "</div>"

    def src_chips(t, limit=2):
        srcs = t.get("sources") or []
        chips = "".join(f'<span class="src">{e(x)}</span>' for x in srcs[:limit])
        if len(srcs) > limit:
            chips += f'<span class="src-more">외 {len(srcs)-limit}곳</span>'
        return chips

    issues = '<ol class="issues">' + "".join(
        f'''<li><a href="#t{i+1}">
          <span class="no">{i+1}</span>
          <span class="it">{e(t["name"])}
            {f'<span class="ih">{e(t.get("headline"))}</span>' if t.get("headline") else ''}</span>
          <span class="meta">{src_chips(t)}
            {f'<span class="tag tag-{e(t.get("tag"))}">{e(t.get("tag"))}</span>' if t.get("tag") else ''}</span>
        </a></li>''' for i, t in enumerate(d["topics"])) + "</ol>"

    topics = "".join(f'''<section class="topic" id="t{i+1}">
      <div class="topic-head">
        <span class="topic-no">{i+1}</span>
        <h2>{e(t["name"])} <span class="en">{e(t.get("en",""))}</span></h2>
        {f'<span class="tag tag-{e(t.get("tag"))}">{e(t.get("tag"))}</span>' if t.get("tag") else ''}
      </div>
      {f'<div class="topic-src">출처 <b>{e(" · ".join(t.get("sources") or []))}</b></div>' if t.get("sources") else ''}
      {f'<p class="topic-lead">{e(t.get("headline"))}</p>' if t.get("headline") else ''}
      <div class="sec"><h4>{e(k["secs"][0])}</h4>{ul(t.get("situation"))}</div>
      <div class="sec"><h4>{e(k["secs"][1])}</h4>{ul(t.get("assess"))}</div>
      <div class="sec"><h4>{e(k["secs"][2])}</h4>{ul(t.get("korea"))}</div>
      {refs_block(t.get("refs"))}
    </section>''' for i, t in enumerate(d["topics"]))

    intro = f'<div class="intro">{e(d["intro"])}</div>' if d.get("intro") else ""
    sub = data.get("subscribe") or {}
    sub_html = ""
    if sub.get("url") and data.get("_qr"):
        sub_html = f'''<aside class="subscribe">
    <img src="{e(data["_qr"])}" alt="구독 안내 QR 코드" width="112" height="112">
    <div class="sub-text">
      <div class="sub-title">{e(sub.get("label","뉴스레터 구독"))}</div>
      <div class="sub-note">{e(sub.get("note",""))}</div>
      <a href="{e(sub["url"])}">{e(sub["url"])}</a>
    </div>
  </aside>'''
    return f'''<div id="paper" class="t-{e(data.get("tpl","official"))} k-{e(data["kind"])}">
  <header class="nl-head">
    <div class="nl-kicker">{e(m.get("org",""))}</div>
    <h1 class="nl-title">{e(m.get("title",""))}</h1>
    <div class="nl-meta">{e(m.get("issue",""))}{" · " if m.get("issue") and date_txt else ""}{e(date_txt)}{" · 작성 " + e(m.get("editor","")) if m.get("editor") else ""}</div>
    {f'<p class="nl-lead">{e(d.get("tagline"))}</p>' if d.get("tagline") else ""}
  </header>
  <div class="brief">
    <div class="brief-label">{e(k["sumTitle"])} <span class="go">— 제목을 누르면 해당 꼭지로 이동합니다</span></div>
    {stats}
    {issues}
  </div>
  {intro}
  {topics}
  {sub_html}
  <footer class="foot-note">
    본 뉴스레터는 각 기관의 공개 자료와 학술 문헌을 정리한 것으로, 원문의 내용이 우선합니다.<br>
    {e(m.get("org",""))}{" · " + e(m.get("editor","")) if m.get("editor") else ""}
  </footer>
</div>'''

def page(data, others):
    k = KINDS[data["kind"]]
    m = data["meta"]
    title = f'{m.get("title","")} {m.get("issue","")}'.strip()
    opts = "".join(
        f'<option value="{e(o["file"])}"{" selected" if o["current"] else ""}>{e(o["kindName"])} · {e(o["issue"])}</option>'
        for o in others)
    return f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(title)}</title>
<meta name="description" content="{e(m.get('org',''))} 발간 · {e(title)}. 공식 기관 발표와 최신 연구를 정리한 뉴스레터입니다.">
<meta name="theme-color" content="{k["brand"]}">
{FONTS}
<link rel="stylesheet" href="../paper.css">
<style>
  :root{{ --bar-brand:{k["brand"]}; --bar-accent:{k["accent"]}; }}
  body{{ margin:0; background:#eef1f5; color:#191f28;
    font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif; }}
  .bar{{ position:sticky; top:0; z-index:20; background:var(--bar-brand); color:#fff;
    display:flex; gap:8px; align-items:center; flex-wrap:wrap;
    padding:10px 16px; box-shadow:0 1px 8px rgba(0,0,0,.18); }}
  .bar a, .bar button, .bar select{{ font-family:inherit; font-size:.92rem; font-weight:700; }}
  .bar a.home{{ color:#fff; text-decoration:none; padding:7px 12px; border-radius:8px;
    background:rgba(255,255,255,.14); }}
  .bar a.home:hover{{ background:rgba(255,255,255,.24); }}
  .bar .sp{{ flex:1 }}
  .bar select{{ background:rgba(255,255,255,.12); color:#fff; border:1px solid rgba(255,255,255,.35);
    border-radius:8px; padding:7px 10px; max-width:min(46vw,320px); }}
  .bar select option{{ color:#191f28; }}
  .bar button{{ background:#fff; color:var(--bar-brand); border:0; border-radius:8px;
    padding:8px 14px; cursor:pointer; }}
  .bar button:hover{{ background:#f0f3f8; }}
  .bar button.ghost{{ background:rgba(255,255,255,.14); color:#fff; }}
  .bar button.ghost:hover{{ background:rgba(255,255,255,.26); }}
  .menu{{ position:relative; }}
  .menu-pop{{ position:absolute; right:0; top:calc(100% + 8px); background:#fff; color:#191f28;
    border:1px solid #dde2e9; border-radius:12px; box-shadow:0 10px 30px rgba(22,48,90,.18);
    min-width:250px; padding:6px; display:none; }}
  .menu-pop.on{{ display:block; }}
  .menu-pop button, .menu-pop a{{ display:block; width:100%; text-align:left; background:none;
    border:0; color:#191f28; padding:11px 12px; border-radius:8px; cursor:pointer; font-size:.92rem;
    font-weight:600; text-decoration:none; }}
  .menu-pop button:hover, .menu-pop a:hover{{ background:#f2f5f9; }}
  .menu-pop .hint{{ font-size:.78rem; color:#6d7885; font-weight:400; padding:4px 12px 8px; }}
  .toast{{ position:fixed; left:50%; bottom:26px; transform:translateX(-50%); background:#191f28;
    color:#fff; padding:12px 18px; border-radius:10px; font-size:.9rem; z-index:50; display:none; }}
  .toast.on{{ display:block; }}
  .paperwrap{{ padding:24px 14px 60px; }}
  @media print{{ .bar,.toast{{ display:none !important; }} body{{ background:#fff; }} .paperwrap{{ padding:0; }} }}
</style>
</head>
<body>
<nav class="bar">
  <a class="home" href="../">← 뉴스레터 메이커</a>
  <a class="home" href="./">발간 목록</a>
  <select id="jump" aria-label="다른 호 보기">{opts}</select>
  <span class="sp"></span>
  <button class="ghost" onclick="window.print()">인쇄 · PDF</button>
  <span class="menu">
    <button id="mailBtn" aria-haspopup="true" aria-expanded="false">이메일로 보내기 ▾</button>
    <span class="menu-pop" id="mailPop">
      <div class="hint">받는 사람에게 그대로 보낼 수 있는 형태로 만듭니다.</div>
      <button data-act="copy">메일 본문 복사 (서식 유지)</button>
      <a href="#" data-act="mailto">메일 프로그램 열기</a>
      <button data-act="download">메일용 HTML 파일 저장</button>
    </span>
  </span>
</nav>

<div class="paperwrap">{paper(data)}</div>
<div class="toast" id="toast"></div>

<script type="application/json" id="issue-data">{json.dumps(data, ensure_ascii=False)}</script>
<script src="../email.js"></script>
<script>
  const DATA = JSON.parse(document.getElementById('issue-data').textContent);
  const toast = (msg) => {{
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    setTimeout(() => t.classList.remove('on'), 2600);
  }};
  document.getElementById('jump').addEventListener('change', e => {{ location.href = e.target.value; }});
  const pop = document.getElementById('mailPop'), btn = document.getElementById('mailBtn');
  btn.addEventListener('click', () => {{
    const on = pop.classList.toggle('on');
    btn.setAttribute('aria-expanded', on ? 'true' : 'false');
  }});
  document.addEventListener('click', e => {{ if (!e.target.closest('.menu')) pop.classList.remove('on'); }});
  pop.addEventListener('click', async e => {{
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act;
    if (act === 'copy'){{ e.preventDefault(); toast(await NLEmail.copy(DATA)); }}
    if (act === 'download'){{ e.preventDefault(); NLEmail.download(DATA); toast('메일용 HTML 파일을 저장했습니다.'); }}
    if (act === 'mailto'){{ el.href = NLEmail.mailto(DATA); }}
    pop.classList.remove('on');
  }});
</script>
</body>
</html>
'''

def index_page(rows):
    cards = "".join(f'''
    <a class="issue k-{e(r["kind"])}" data-kind="{e(r["kind"])}" href="{e(r["file"])}">
      <div class="kind">{e(r["kindName"])}</div>
      <div class="t">{e(r["title"])}</div>
      <div class="m">{e(r["issue"])} · {e(r["date"])} · {e(r["org"])}</div>
      <p class="lead">{e(r["tagline"])}</p>
      <div class="topics">{"".join(f'<span>{e(x)}</span>' for x in r["topics"][:4])}</div>
    </a>''' for r in rows)
    return f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>발간한 뉴스레터</title>
<meta name="description" content="뉴스레터 메이커로 발간한 호 목록. 감염병 발생동향, 사회 대응(PHSM), 만성질환, 기후·건강.">
{FONTS}
<style>
 :root{{ --ink:#191f28; --muted:#6d7885; --line:#dde2e9; }}
 body{{ margin:0; background:#eef1f5; color:var(--ink);
   font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif; font-size:17px; }}
 .bar{{ background:#12395f; color:#fff; padding:12px 16px; display:flex; gap:10px; align-items:center; }}
 .bar a{{ color:#fff; text-decoration:none; font-weight:700; background:rgba(255,255,255,.14);
   padding:7px 12px; border-radius:8px; font-size:.92rem; }}
 .wrap{{ max-width:880px; margin:0 auto; padding:30px 16px 70px; }}
 h1{{ font-family:"Nanum Myeongjo",serif; font-size:2rem; margin:0 0 6px; }}
 .sub{{ color:var(--muted); font-size:.95rem; margin:0 0 26px; }}
 .issue{{ display:block; background:#fff; border:1px solid var(--line); border-top:5px solid var(--b);
   border-radius:4px; padding:22px 24px; margin-bottom:16px; text-decoration:none; color:inherit; }}
 .issue:hover{{ box-shadow:0 8px 26px rgba(22,48,90,.12); }}
 .issue[hidden]{{ display:none; }}
 .k-outbreak{{ --b:#12395f; --a:#c2540b; }}
 .k-phsm{{ --b:#3b3080; --a:#0e7490; }}
 .k-chronic{{ --b:#14532d; --a:#a16207; }}
 .k-climate{{ --b:#7c2d12; --a:#0369a1; }}
 .kind{{ font-size:.78rem; font-weight:800; letter-spacing:.08em; color:var(--a); }}
 .t{{ font-family:"Nanum Myeongjo",serif; font-size:1.45rem; font-weight:800; color:var(--b); margin:6px 0 4px; }}
 .m{{ font-size:.84rem; color:var(--muted); font-variant-numeric:tabular-nums; }}
 .lead{{ font-size:1rem; line-height:1.65; color:#3d4753; margin:12px 0 0; }}
 .topics{{ display:flex; gap:6px; flex-wrap:wrap; margin-top:14px; }}
 .topics span{{ font-size:.8rem; color:#3d4753; border:1px solid var(--line); border-radius:999px; padding:3px 11px; }}
 @media (max-width:560px){{ .t{{ font-size:1.25rem; }} }}
</style>
</head>
<body>
<nav class="bar"><a href="../">← 뉴스레터 메이커</a><a href="./" id="allLink" hidden>전체 뉴스레터 보기</a></nav>
<div class="wrap">
  <h1 id="listTitle">발간한 뉴스레터</h1>
  <p class="sub" id="listSub">뉴스레터 메이커로 만든 호입니다. 서식과 구성을 그대로 가져다 새 호를 만들 수 있습니다.</p>
  {cards}
  <p class="sub" id="listEmpty" hidden>아직 이 뉴스레터의 다른 호가 없습니다. 이번 호가 창간호입니다.</p>
</div>
<script>
  /* ?series=phsm 처럼 열면 그 뉴스레터만 보여 줍니다 (QR로 들어온 경우) */
  var NAMES = {{ outbreak:'전 세계 감염병 발생 동향', phsm:'감염병 사회 대응(PHSM) 분과위원회',
                chronic:'만성질환 동향', climate:'기후·건강 위기 동향' }};
  var series = new URLSearchParams(location.search).get('series');
  if (series && NAMES[series]) {{
    var shown = 0;
    document.querySelectorAll('.issue').forEach(function(el){{
      var keep = el.dataset.kind === series;
      el.hidden = !keep; if (keep) shown++;
    }});
    document.getElementById('listTitle').textContent = NAMES[series];
    document.getElementById('listSub').textContent = shown + '개 호가 발간되었습니다. 구독을 원하시면 발행 기관으로 문의해 주세요.';
    document.getElementById('allLink').hidden = false;
    document.getElementById('listEmpty').hidden = shown > 1;
  }}
</script>
</body>
</html>
'''

def main():
    os.makedirs(ISSUES, exist_ok=True)
    files = sorted(glob.glob(os.path.join(SAMPLES, "*.json")))
    metas = []
    for path in files:
        data = json.load(open(path, encoding="utf-8"))
        metas.append({"path": path, "data": data,
                      "file": os.path.basename(path).replace(".json", ".html"),
                      "kindName": KINDS[data["kind"]]["name"],
                      "issue": data["meta"].get("issue", "")})
    rows = []
    counts = {}
    for me in metas:
        counts[me["data"]["kind"]] = counts.get(me["data"]["kind"], 0) + 1
    for me in metas:
        kind = me["data"]["kind"]
        sub = me["data"].setdefault("subscribe", {})
        sub["url"] = SITE + "?series=" + kind            # 이 뉴스레터 시리즈만 모아 보는 주소
        many = counts.get(kind, 1) > 1
        sub["label"] = ("이 뉴스레터 구독 · 지난 호 보기" if many else "이 뉴스레터 구독 안내")
        sub["note"] = ("휴대폰 카메라로 찍으면 " + KINDS[kind]["name"] + " 뉴스레터의 "
                       + ("지난 호와 구독 안내로 이어집니다." if many else "구독 안내로 이어집니다. (이번이 창간호입니다)"))
        qr_name = "qr-" + me["file"].replace(".html", ".png")
        make_qr(sub["url"], os.path.join(ISSUES, qr_name), KINDS[kind]["brand"])
        me["data"]["_qr"] = qr_name
        me["data"]["_qr_abs"] = SITE + qr_name
        others = [{"file": o["file"], "kindName": o["kindName"], "issue": o["issue"],
                   "current": o["file"] == me["file"]} for o in metas]
        open(os.path.join(ISSUES, me["file"]), "w", encoding="utf-8").write(page(me["data"], others))
        m, d = me["data"]["meta"], me["data"]["draft"]
        rows.append({"file": me["file"], "kind": me["data"]["kind"], "kindName": me["kindName"],
                     "title": m.get("title", ""), "issue": m.get("issue", ""), "date": m.get("date", ""),
                     "org": m.get("org", ""), "tagline": d.get("tagline", ""),
                     "topics": [t["name"] for t in d["topics"]]})
        print("생성:", me["file"])
    rows.sort(key=lambda r: r["date"], reverse=True)
    open(os.path.join(ISSUES, "index.html"), "w", encoding="utf-8").write(index_page(rows))
    for r in rows:                                    # 홈 화면이 읽을 목록
        r["sample"] = "../samples/" + r["file"].replace(".html", ".json")
    json.dump({"issues": rows}, open(os.path.join(ISSUES, "manifest.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("생성: manifest.json")
    print("생성: index.html (", len(rows), "호 )")

if __name__ == "__main__":
    main()
