#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
발간본 만들기: newsletter/samples/*.json → newsletter/issues/*.html + 목록 페이지

뉴스레터 메이커(newsletter/index.html)의 미리보기와 같은 서식(paper.css)을 씁니다.
실행: python3 scripts/render_newsletter_issues.py
"""
import os, json, glob, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = os.path.join(ROOT, "newsletter", "samples")
ISSUES  = os.path.join(ROOT, "newsletter", "issues")

KINDS = {
    "outbreak": {"sumTitle": "이번 호 요약",
                 "secs": ["발생 상황", "상황 평가", "국내 관련성 · 권고"]},
    "phsm":     {"sumTitle": "이번 호 핵심 메시지",
                 "secs": ["연구 · 정책 동향", "핵심 쟁점과 근거", "분과위 시사점 · 토론거리"]},
    "chronic":  {"sumTitle": "이번 호 요약",
                 "secs": ["주요 동향", "근거 해석", "국내 적용 시사점"]},
    "climate":  {"sumTitle": "이번 호 요약",
                 "secs": ["기후 · 건강 동향", "감시체계와 근거", "국내 대응 시사점"]},
}
e = lambda s: html.escape(str(s or ""), quote=True)

def ul(items):
    return "<ul>" + "".join(f"<li>{e(x)}</li>" for x in (items or [])) + "</ul>"

def refs_html(refs):
    out = []
    for r in refs or []:
        head, _, link = r.partition(" — ")
        out.append(f'<li>{e(head)}' + (f' <a href="{e(link)}" target="_blank" rel="noopener">원문</a>' if link else '') + '</li>')
    return '<ol style="margin:5px 0 0;padding-left:20px">' + "".join(out) + "</ol>"

def render(data):
    k = KINDS[data["kind"]]
    m, d = data["meta"], data["draft"]
    date_txt = m.get("date", "").replace("-", ".") + "." if m.get("date") else ""
    topics = "".join(
        f'''<div class="topic">
      <h2>{i+1}. {e(t["name"])} <span class="en">{e(t.get("en",""))}</span></h2>
      <div class="sec"><h4>{e(k["secs"][0])}</h4>{ul(t.get("situation"))}</div>
      <div class="sec"><h4>{e(k["secs"][1])}</h4>{ul(t.get("assess"))}</div>
      <div class="sec"><h4>{e(k["secs"][2])}</h4>{ul(t.get("korea"))}</div>
      <div class="refs"><b>출처</b>{refs_html(t.get("refs"))}</div>
    </div>''' for i, t in enumerate(d["topics"]))

    summary = "".join(
        f'<li style="margin-bottom:8px"><b>{e(t["name"])}</b>'
        + (f' <span style="color:#6b7787;font-weight:400">{e(t.get("en",""))}</span>' if t.get("en") else '')
        + "<br>" + "<br>".join(e(x) for x in t.get("summary", [])) + "</li>"
        for t in d["topics"])

    intro = f'<div class="intro">{e(d["intro"])}</div>' if d.get("intro") else ""
    title = f'{m.get("title","")} {m.get("issue","")}'.strip()
    return f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(title)}</title>
<meta name="description" content="{e(m.get('org',''))}가 펴낸 {e(title)}. 공식 기관 발표와 최신 연구를 정리한 뉴스레터입니다.">
<link rel="stylesheet" href="../paper.css">
<style>
 body{{margin:0;background:#e7ecf2;color:#1c2430;
   font-family:"Pretendard","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif}}
 .topbar{{background:#123a6b;color:#c6d6ea;font-size:.84rem;padding:10px 16px;display:flex;
   gap:12px;justify-content:space-between;flex-wrap:wrap}}
 .topbar a{{color:#fff;font-weight:700}}
 .paperwrap{{padding:20px 12px 50px}}
 @media print{{ .topbar{{display:none}} body{{background:#fff}} .paperwrap{{padding:0}} }}
</style>
</head>
<body>
<div class="topbar">
  <span>{e(m.get("org",""))} · {e(m.get("issue",""))}</span>
  <span><a href="../">이 서식으로 새 호 만들기 →</a></span>
</div>
<div class="paperwrap"><div id="paper" class="t-{e(data.get("tpl","official"))}">
  <div class="nl-head">
    <div class="nl-kicker">{e(m.get("org",""))}</div>
    <div class="nl-title">{e(m.get("title",""))}</div>
    <div class="nl-meta">{e(m.get("issue",""))}{" · " if m.get("issue") and date_txt else ""}{e(date_txt)}{" · 작성 " + e(m.get("editor","")) if m.get("editor") else ""}</div>
  </div>
  {intro}
  <div class="sumbox">
    <h3>{e(k["sumTitle"])}</h3>
    <ol style="margin:0;padding-left:20px">{summary}</ol>
  </div>
  {topics}
  <div class="foot-note">
    본 뉴스레터는 각 기관의 공개 자료와 학술 문헌을 정리한 것으로, 원문의 내용이 우선합니다.
    {e(m.get("org",""))}{" · " + e(m.get("editor","")) if m.get("editor") else ""}
  </div>
</div></div>
</body>
</html>
'''

def index_page(rows):
    cards = "".join(f'''
    <a class="card" href="{e(r["file"])}">
      <div class="k">{e(r["kindName"])}</div>
      <div class="t">{e(r["title"])}</div>
      <div class="m">{e(r["issue"])} · {e(r["date"])} · {e(r["org"])}</div>
      <div class="s">{e(r["first"])}</div>
    </a>''' for r in rows)
    return f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>발간한 뉴스레터</title>
<style>
 body{{margin:0;background:#f4f6f9;color:#1c2430;font-family:"Pretendard","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif}}
 .wrap{{max-width:860px;margin:0 auto;padding:28px 16px 60px}}
 h1{{font-size:1.25rem;color:#123a6b;margin:0 0 4px}}
 .sub{{color:#6b7787;font-size:.9rem;margin:0 0 22px}}
 .card{{display:block;background:#fff;border:1px solid #dfe5ec;border-radius:14px;padding:18px 20px;
   margin-bottom:14px;text-decoration:none;color:inherit;box-shadow:0 2px 10px rgba(18,58,107,.06)}}
 .card:hover{{border-color:#b9cbe2}}
 .k{{font-size:.75rem;font-weight:800;color:#0f7b7b}}
 .t{{font-size:1.05rem;font-weight:800;color:#123a6b;margin:4px 0 3px}}
 .m{{font-size:.8rem;color:#6b7787}}
 .s{{font-size:.88rem;color:#41505f;margin-top:8px;line-height:1.6}}
 .back{{display:inline-block;margin-top:10px;font-size:.9rem;color:#123a6b;font-weight:700}}
</style>
</head>
<body><div class="wrap">
  <h1>발간한 뉴스레터</h1>
  <p class="sub">뉴스레터 메이커로 만든 호입니다. 서식과 구성을 그대로 가져다 새 호를 만들 수 있습니다.</p>
  {cards}
  <a class="back" href="../">← 뉴스레터 메이커로 돌아가기</a>
</div></body>
</html>
'''

def main():
    os.makedirs(ISSUES, exist_ok=True)
    kind_names = {"outbreak": "감염병 발생동향", "phsm": "감염병 사회 대응(PHSM)", "chronic": "만성질환", "climate": "기후·건강"}
    rows = []
    for path in sorted(glob.glob(os.path.join(SAMPLES, "*.json"))):
        data = json.load(open(path, encoding="utf-8"))
        name = os.path.basename(path).replace(".json", ".html")
        open(os.path.join(ISSUES, name), "w", encoding="utf-8").write(render(data))
        m, d = data["meta"], data["draft"]
        first = (d["topics"][0].get("summary") or [""])[0]
        rows.append({"file": name, "kindName": kind_names[data["kind"]], "title": m.get("title", ""),
                     "issue": m.get("issue", ""), "date": m.get("date", ""), "org": m.get("org", ""),
                     "first": first})
        print("생성:", name)
    rows.sort(key=lambda r: r["date"], reverse=True)
    open(os.path.join(ISSUES, "index.html"), "w", encoding="utf-8").write(index_page(rows))
    print("생성: index.html (", len(rows), "호 )")

if __name__ == "__main__":
    main()
