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
SAMPLES = os.path.join(ROOT, "samples")
ISSUES  = os.path.join(ROOT, "issues")
_CFG_PATH = os.path.join(ROOT, "site-config.json")
try:
    _CFG = json.load(open(_CFG_PATH, encoding="utf-8"))
except Exception:
    _CFG = {}
BASE      = (_CFG.get("baseUrl") or "https://epibrief.github.io").rstrip("/")
SITE      = BASE + "/issues/"          # 메일에서 이미지를 불러올 주소
SUBSCRIBE = BASE + "/subscribe.html"   # 구독 신청 페이지

KINDS = {
    "outbreak": {"name": "감염병 발생동향", "sumTitle": "목차",
                 "secs": ["발생 상황", "상황 평가", "국내 관련성 · 권고"], "brand": "#1b3fb0", "accent": "#bf560c"},
    "phsm":     {"name": "감염병 사회 대응(PHSM)", "sumTitle": "목차",
                 "secs": ["연구 · 정책 동향", "핵심 쟁점과 근거", "분과위 시사점 · 토론거리"], "brand": "#0d6e6d", "accent": "#bf560c"},
    "chronic":  {"name": "만성질환", "sumTitle": "목차",
                 "secs": ["주요 동향", "근거 해석", "국내 적용 시사점"], "brand": "#146c3a", "accent": "#bf560c"},
    "climate":  {"name": "기후·건강", "sumTitle": "목차",
                 "secs": ["기후 · 건강 동향", "감시체계와 근거", "국내 대응 시사점"], "brand": "#0d5c8c", "accent": "#bf560c"},
}
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
         'family=Nanum+Myeongjo:wght@700;800&family=Noto+Sans+KR:wght@400;500;700&display=swap">'
         '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css">')
def e(s):
    """HTML 이스케이프 + 줄바꿈 시 '—'가 줄머리에 오지 않게 앞 공백을 고정 공백으로."""
    return html.escape(str(s or ""), quote=True).replace(" —", "\u00a0—").replace(" ·", "\u00a0·")

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
    """'키워드 :: 본문' 은 앞머리 키워드로, 숫자는 색 강조, [1] 은 위첨자로."""
    raw = str(text or "")
    lead = ""
    if " :: " in raw:
        head, _, raw = raw.partition(" :: ")
        lead = f'<b class="lead">{e(head.strip())}</b>'
    t = e(raw)
    t = NUM.sub(r'<b class="num">\1</b>', t)
    t = re.sub(r"\[(\d+(?:\]\[\d+)*)\]", lambda m: "<sup>[" + m.group(1) + "]</sup>", t)
    return lead + t

def ul(items):
    return "<ul>" + "".join(f"<li>{mark(x)}</li>" for x in (items or [])) + "</ul>"

def refs_block(refs):
    items = []
    for r in refs or []:
        head, _, link = r.partition(" — ")
        label = "기사" if "news.google.com" in link else "원문"
        items.append(f"<li>{e(head)}" + (f' <a href="{e(link)}" target="_blank" rel="noopener">{label}</a>' if link else "") + "</li>")
    return (f'<details class="refs"><summary>출처 {len(items)}건</summary>'
            f'<ol>{"".join(items)}</ol></details>')

BAD_CARD = re.compile(r"^(redirecting|client challenge|just a moment|attention required|access denied|error)\.?$", re.I)

def src_card(t):
    c = t.get("card") or {}
    title = (c.get("title") or "").strip()
    # 리디렉션 안내나 봇 차단 화면이 잡힌 카드는 보여 주지 않는다
    if not c.get("url") or not title or BAD_CARD.match(title): return ""
    if not c.get("image") and not c.get("desc"): return ""
    img = (f'<img src="{e(c["image"])}" alt="" loading="lazy" '
           f'onerror="this.remove()">') if c.get("image") else ""
    return f'''<div class="srccard">{img}
      <div class="sc-b">
        <div class="sc-site">원문 · {e(c.get("site",""))}</div>
        <div class="sc-t">{e(c.get("title",""))}</div>
        {f'<div class="sc-d">{e(c.get("desc"))}</div>' if c.get("desc") else ""}
        <a href="{e(c["url"])}" target="_blank" rel="noopener">원문 보기 →</a>
      </div></div>'''

EV = {   # 근거 강도 — 짧은 라벨로 두고 자세한 설명은 title 속성에
    "high": ("●●●", "고찰·RCT", "체계적 문헌고찰 · 무작위배정 연구", ""),
    "mid":  ("●●○", "관찰연구", "코호트 · 횡단 등 관찰연구", ""),
    "low":  ("●○○", "모형", "모형 · 생태학적 분석", ""),
    "weak": ("○○○", "발표·보도", "기관 발표 · 언론 보도 · 프리프린트", "low"),
}

def judge_badges(t):
    u, im = t.get("urgency"), t.get("impact")
    if not u and not im: return ""
    parts = []
    if u:  parts.append(f'<span class="u u-{e(u)}" title="긴급도">{e(u)}</span>')
    if im: parts.append(f'<span class="im im-{e(im)}" title="국내 영향도">국내 영향 {e(im)}</span>')
    return '<span class="judge">' + "".join(parts) + "</span>"

def evidence_badge(t):
    k = t.get("evidence")
    if not k or k not in EV: return ""
    dots, label, full, cls = EV[k]
    return (f'<span class="ev {cls}" title="근거 강도 · {e(full)}">'
            f'<span class="dots">{dots}</span>{e(label)}</span>')

def design_chips(t):
    d = t.get("design") or []
    if not d: return ""
    return '<div class="design">' + "".join(f"<span>{e(x)}</span>" for x in d) + "</div>"

def caveat_box(t):
    c = t.get("caveat")
    if not c: return ""
    return f'<div class="caveat"><b>해석 주의</b> · {e(c)}</div>'

def copy_bar(t, i, meta):
    """상사 보고용 3줄(상황·조치·출처)을 그대로 복사할 수 있게."""
    line1 = (t.get("headline") or t.get("name", "")).strip()
    line2 = ((t.get("korea") or [""])[0]).split(" :: ")[-1].strip()
    srcs = " · ".join(t.get("sources") or [])
    line3 = f'{srcs} / {meta.get("title","")} {meta.get("issue","")}'
    text = f'[{t.get("name","")}] {line1}\n조치: {line2}\n출처: {line3}'
    return (f'<div class="copybar"><button class="copybtn" data-copy="{e(text)}">'
            f'보고용 3줄 복사</button><span class="copyok" hidden>복사했습니다</span></div>')

def logo_img(t):
    """어느 사이트에서 가져왔는지 보이도록 기관 아이콘을 함께 둔다."""
    lg = t.get("logo") or {}
    if not lg.get("file"): return ""
    return (f'<img class="srclogo" src="{e(lg["file"])}" alt="{e(lg.get("site",""))}" '
            f'title="{e(lg.get("site",""))}" onerror="this.remove()">')

def trend_chart(t):
    """연도별 논문 수 막대 그래프 — 외부 라이브러리 없이 SVG로 그린다(인쇄·저장에도 남는다)."""
    c = t.get("chart") or {}
    rows = c.get("data") or []
    if len(rows) < 4:
        return ""
    W, H = 320.0, 104.0
    PAD_B, PAD_T = 18.0, 16.0
    top = max(r["v"] for r in rows) or 1
    slot = W / len(rows)
    bw = min(26.0, slot * 0.62)
    peak = max(rows, key=lambda r: r["v"])
    bars, labels, values = [], [], []
    for i, r in enumerate(rows):
        h = (H - PAD_B - PAD_T) * (r["v"] / top)
        x = i * slot + (slot - bw) / 2
        y = H - PAD_B - h
        cur = (i == len(rows) - 1)
        bars.append('<rect class="%s" x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="3"/>'
                    % ("b cur" if cur else "b", x, y, bw, max(h, 1.5)))
        labels.append('<text class="xl" x="%.1f" y="%.1f">%s</text>'
                      % (i * slot + slot / 2, H - 5, str(r["y"])[2:]))
        if r is peak or cur:          # 숫자는 최고점과 올해에만
            values.append('<text class="vl" x="%.1f" y="%.1f">%d</text>'
                          % (i * slot + slot / 2, y - 4, r["v"]))
    table = "".join("<tr><th>%s</th><td>%s</td></tr>" % (r["y"], r["v"]) for r in rows)
    note = (" · " + e(c.get("note"))) if c.get("note") else ""
    aria = "%s — %s년 %d편에서 %s년 %d편" % (c.get("title", ""), rows[0]["y"], rows[0]["v"],
                                              rows[-1]["y"], rows[-1]["v"])
    return (
        '<figure class="chart">'
        '<figcaption>' + e(c.get("title", "")) + '</figcaption>'
        '<svg viewBox="0 0 320 104" role="img" preserveAspectRatio="none" aria-label="' + e(aria) + '">'
        '<line class="ax" x1="0" y1="%.1f" x2="320" y2="%.1f"/>' % (H - PAD_B, H - PAD_B)
        + "".join(bars) + "".join(values) + "".join(labels) +
        '</svg>'
        '<div class="cnote">' + e(c.get("source", "")) + note + ' · 단위 ' + e(c.get("unit", "편")) + '</div>'
        '<table class="cdata"><caption>' + e(c.get("title", "")) + '</caption><tbody>' + table + '</tbody></table>'
        '</figure>')

def profile_table(t):
    rows = t.get("profile") or []
    if not rows: return ""
    body = "".join(f'<dt>{e(r["k"])}</dt><dd>{e(r["v"])}</dd>' for r in rows)
    return f'<div class="profile"><h5>질병 개요</h5><dl>{body}</dl></div>'

def explainer_box(d):
    x = d.get("explainer")
    if not x: return ""
    terms = "".join(f'<div class="term"><b>{e(t["k"])}</b><span>{e(t["v"])}</span></div>'
                    for t in x.get("terms", []))
    srcs = " · ".join(f'<a href="{e(s2["url"])}" target="_blank" rel="noopener">{e(s2["label"])}</a>'
                      if s2.get("url") else e(s2["label"]) for s2 in x.get("sources", []))
    body = "".join(f"<p>{e(b)}</p>" for b in x.get("body", []))
    return f'''<aside class="explainer">
      <h4>{e(x.get("title",""))}</h4>
      {body}
      {f'<div class="terms">{terms}</div>' if terms else ""}
      {f'<div class="src">정의 출처 · {srcs}</div>' if srcs else ""}
    </aside>'''

TIPS = [
    ("‘발표·보도’ 근거는 1차 자료를 확인한 뒤 인용하십시오.",
     "기관 발표를 전한 언론 보도는 수치의 기준(분모·기간)을 생략하는 일이 잦습니다. 각 꼭지의 출처에서 원문을 먼저 여십시오."),
    ("해외 수치는 국내값과 나란히 놓기 전까지 비교하지 마십시오.",
     "접종률·발생률은 분모 정의와 의료체계가 달라 그대로 대비하면 오해를 만듭니다."),
    ("모형 연구는 결론보다 가정값을 보십시오.",
     "모형의 결과는 투입한 가정(순응도·접촉률)에 좌우됩니다. 우리 매뉴얼이 같은 값을 무엇으로 두고 있는지부터 확인하는 편이 빠릅니다."),
    ("단일 관찰연구로 지침을 바꾸지 마십시오.",
     "관찰연구는 연관성을 보여줄 뿐 인과를 확정하지 않습니다. 지침 개정 근거로는 ●●● 표시(체계적 문헌고찰·무작위배정)를 우선하십시오."),
    ("프리프린트는 동료심사 전 자료입니다.",
     "흐름을 먼저 읽는 데는 유용하나, 공식 문서 인용은 게재 확정 후로 미루십시오."),
    ("‘자료 없음’도 정책 정보입니다.",
     "원문에 수치가 없으면 이 뉴스레터는 ‘(원문 미제시)’로 표시합니다. 국내 해당 지표가 없다는 사실 자체가 조사·감시 과제입니다."),
]

def tips_box():
    items = "".join(f"<li><b>{e(h)}</b><span class='why'>{e(w)}</span></li>" for h, w in TIPS)
    return (f'<aside class="tips"><h4>이 뉴스레터를 정책에 쓰실 때</h4>'
            f'<ol>{items}</ol></aside>')

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
          <span class="meta">{f'<span class="u u-{e(t.get("urgency"))}">{e(t.get("urgency"))}</span>' if t.get("urgency") else ''}{src_chips(t)}
            {f'<span class="tag tag-{e(t.get("tag"))}">{e(t.get("tag"))}</span>' if t.get("tag") else ''}</span>
        </a></li>''' for i, t in enumerate(d["topics"])) + "</ol>"

    topics = "".join(f'''<section class="topic" id="t{i+1}">
      <div class="topic-head">
        <span class="topic-no">{i+1}</span>
        <h2>{e(t["name"])} <span class="en">{e(t.get("en",""))}</span></h2>
        {judge_badges(t)}
        {evidence_badge(t) or (f'<span class="tag tag-{e(t.get("tag"))}">{e(t.get("tag"))}</span>' if t.get("tag") else '')}
      </div>
      {f'<div class="topic-src"><span class="lbl">출처</span>{logo_img(t)} <b>{e(" · ".join(t.get("sources") or []))}</b></div>' if t.get("sources") else ''}
      {f'<p class="topic-lead">{e(t.get("headline"))}</p>' if t.get("headline") else ''}
      {design_chips(t)}
      {trend_chart(t)}
      {src_card(t)}
      <div class="sec"><h4>{e(k["secs"][0])}</h4>{ul(t.get("situation"))}</div>
      <div class="sec"><h4>{e(k["secs"][1])}</h4>{ul(t.get("assess"))}</div>
      <div class="sec"><h4>{e(k["secs"][2])}</h4>{ul(t.get("korea"))}</div>
      {caveat_box(t)}
      {profile_table(t)}
      {refs_block(t.get("refs"))}
      {copy_bar(t, i, m)}
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
    <div class="nl-topline">
      <span>{e(KINDS[data["kind"]]["name"])} 뉴스레터</span>
      <span class="issue">{e(m.get("issue",""))}{" · " if m.get("issue") and date_txt else ""}{e(date_txt)}</span>
    </div>
    <div class="nl-kicker">{e(m.get("org",""))}</div>
    {f'<div class="nl-org-en">{e(m.get("orgEn"))}</div>' if m.get("orgEn") else ""}
    <h1 class="nl-title">{e(m.get("title",""))}</h1>
    {f'<div class="nl-title-en">{e(m.get("titleEn"))}</div>' if m.get("titleEn") else ""}
    {f'<p class="nl-lead">{e(d.get("tagline"))}</p>' if d.get("tagline") else ""}
  </header>
  <div class="nl-bar">
    <span>발행 {e(m.get("org",""))}</span>
    {f'<span>{e(m.get("cadence"))}</span>' if m.get("cadence") else ""}
    {f'<span>담당 {e(m.get("editor"))}</span>' if m.get("editor") else ""}
    {f'<span>구독 <a href="{e((data.get("subscribe") or {{}}).get("url",""))}">이 뉴스레터 받아보기 →</a></span>' if (data.get("subscribe") or {{}}).get("url") else ""}
  </div>
  <div class="brief">
    <div class="brief-label">이번 호에는 <span class="go">— 제목을 누르면 해당 꼭지로 이동합니다</span></div>
    {stats}
    {issues}
  </div>
  {explainer_box(d)}
  {intro}
  {topics}
  {tips_box()}
  {sub_html}
  <footer class="foot-note">
    <div class="cover">
      <b>자료 수집</b>
      {f'<span>이 호가 다룬 기간 {e(m.get("coverage"))}</span>' if m.get("coverage") else ""}
      <span>소스 102곳을 매일 새벽 5시(KST)에 자동 수집</span>
      {f'<span>{e(m.get("cadence"))}</span>' if m.get("cadence") else ""}
      {f'<span>다음 호 {e(m.get("nextIssue","").replace("-", "."))}.</span>' if m.get("nextIssue") else ""}
    </div>
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
    font-family:"Pretendard Variable","Pretendard","Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif; }}
  .bar{{ position:sticky; top:0; z-index:20; background:var(--bar-brand); color:#fff;
    display:flex; gap:6px; align-items:center; flex-wrap:nowrap;
    padding:8px 12px; box-shadow:0 1px 8px rgba(0,0,0,.18); }}
  .bar a, .bar button, .bar select{{ font-family:inherit; font-size:.92rem; font-weight:700; }}
  .bar a.home{{ color:#fff; text-decoration:none; padding:7px 11px; border-radius:8px;
    background:rgba(255,255,255,.14); white-space:nowrap; }}
  .bar .short{{ display:none; }}
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
  .menu-pop{{ position:absolute; right:0; left:auto; top:calc(100% + 8px); background:#fff; color:#191f28;
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
  @media (max-width:640px){{
    .bar{{ gap:5px; padding:7px 9px; font-size:.86rem; }}
    .bar a.home, .bar button{{ padding:7px 9px; font-size:.85rem; }}
    .bar .full{{ display:none; }}
    .bar .short{{ display:inline; }}
    .bar select{{ max-width:34vw; padding:6px 7px; font-size:.82rem; }}
    .menu-pop{{ position:fixed; left:10px; right:10px; top:56px; min-width:0; }}
  }}
  @media print{{ .bar,.toast{{ display:none !important; }} body{{ background:#fff; }} .paperwrap{{ padding:0; }} }}
</style>
</head>
<body>
<nav class="bar">
  <a class="home" href="../"><span class="full">← 뉴스레터 메이커</span><span class="short">← 홈</span></a>
  <a class="home" href="./"><span class="full">발간 목록</span><span class="short">목록</span></a>
  <select id="jump" aria-label="다른 호 보기">{opts}</select>
  <span class="sp"></span>
  <button class="ghost" onclick="window.print()"><span class="full">인쇄 · PDF</span><span class="short">인쇄</span></button>
  <span class="menu">
    <button id="mailBtn" aria-haspopup="true" aria-expanded="false"><span class="full">이메일로 보내기</span><span class="short">메일</span> ▾</button>
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
  document.addEventListener('click', async e => {{      // 보고용 3줄 복사
    const b = e.target.closest('[data-copy]'); if (!b) return;
    try {{
      await navigator.clipboard.writeText(b.dataset.copy);
      const ok = b.parentElement.querySelector('.copyok'); ok.hidden = false;
      setTimeout(() => {{ ok.hidden = true; }}, 2000);
    }} catch(err) {{ toast('복사하지 못했습니다. 길게 눌러 직접 복사해 주세요.'); }}
  }});
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
   font-family:"Pretendard Variable","Pretendard","Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif; font-size:17px; }}
 .bar{{ background:#1b3fb0; color:#fff; padding:12px 16px; display:flex; gap:10px; align-items:center; }}
 .bar a{{ color:#fff; text-decoration:none; font-weight:700; background:rgba(255,255,255,.14);
   padding:7px 12px; border-radius:8px; font-size:.92rem; }}
 .wrap{{ max-width:880px; margin:0 auto; padding:30px 16px 70px; }}
 h1{{ font-family:"Nanum Myeongjo",serif; font-size:2rem; margin:0 0 6px; }}
 .sub{{ color:var(--muted); font-size:.95rem; margin:0 0 26px; }}
 .issue{{ display:block; background:#fff; border:1px solid var(--line); border-top:5px solid var(--b);
   border-radius:4px; padding:22px 24px; margin-bottom:16px; text-decoration:none; color:inherit; }}
 .issue:hover{{ box-shadow:0 8px 26px rgba(22,48,90,.12); }}
 .issue[hidden]{{ display:none; }}
 .k-outbreak{{ --b:#1b3fb0; --a:#bf560c; }}
 .k-phsm{{ --b:#0d6e6d; --a:#bf560c; }}
 .k-chronic{{ --b:#146c3a; --a:#bf560c; }}
 .k-climate{{ --b:#0d5c8c; --a:#bf560c; }}
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
<nav class="bar"><a href="../">← 뉴스레터 메이커</a><a href="./" id="allLink" hidden>전체 뉴스레터 보기</a>
  <a href="../subscribe.html" id="subLink" style="margin-left:auto">구독 신청</a></nav>
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
    document.getElementById('subLink').href = '../subscribe.html?series=' + series;
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
        sub["url"] = SUBSCRIBE + "?series=" + kind       # 구독 신청 페이지(해당 뉴스레터가 미리 선택됨)
        many = counts.get(kind, 1) > 1
        sub["label"] = "이 뉴스레터 받아보기"
        sub["note"] = ("휴대폰 카메라로 찍으면 " + KINDS[kind]["name"]
                       + " 뉴스레터 구독 신청 화면으로 바로 이어집니다."
                       + ("" if many else " (이번이 창간호입니다)"))
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
