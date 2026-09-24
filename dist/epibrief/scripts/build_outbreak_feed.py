#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
감염병 뉴스레터용 소스 자동 수집 → data/feed.json

- data/newsletter/sources.json 에 적힌 기관 RSS와 뉴스 검색어를 훑어
  '제목 + 출처 + 원문링크 + 날짜 + 짧은 발췌'만 저장합니다(원문 미저장, 저작권 안전).
- 키가 필요 없습니다. 실패한 소스는 건너뛰고 나머지는 그대로 저장합니다.

실행:  python3 scripts/build_outbreak_feed.py
"""
import os, re, json, html, socket, time, datetime
import urllib.request, urllib.parse
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "data", "sources.json")
OUT  = os.path.join(ROOT, "data", "feed.json")

KEEP_DAYS  = 45     # 이 기간 안의 글만 보관
PER_SOURCE = 25     # 소스 한 곳에서 최대 몇 건까지
UA = "Mozilla/5.0 (compatible; outbreak-newsletter/1.0; +https://github.com)"

def force_ipv4():
    if getattr(socket, "_v4", False): return
    orig = socket.getaddrinfo
    socket.getaddrinfo = lambda h, *a, **k: [r for r in orig(h, *a, **k) if r[0] == socket.AF_INET] or orig(h, *a, **k)
    socket._v4 = True

def fetch_xml(url, tries=3):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml, */*"})
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read()
            return ET.fromstring(raw)
        except Exception as e:
            if i < tries - 1:
                time.sleep(2 * (i + 1))
            else:
                print(f"  ! 실패: {url} ({e})")
    return None

def google_news_rss(query, lang="en"):
    if lang == "ko":
        tail = "&hl=ko&gl=KR&ceid=KR:ko"
    else:
        tail = "&hl=en-US&gl=US&ceid=US:en"
    return "https://news.google.com/rss/search?q=" + urllib.parse.quote(query) + "+when:30d" + tail

def fetch_json(url, tries=3):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8", "replace"))
        except Exception as e:
            if i < tries - 1:
                time.sleep(2 * (i + 1))
            else:
                print(f"  ! 실패: {url} ({e})")
    return None

def who_don(limit=PER_SOURCE):
    """WHO 발생 속보(Disease Outbreak News) 공식 자료 — WHO 웹사이트 API에서 그대로 가져온다."""
    url = ("https://www.who.int/api/news/diseaseoutbreaknews?sf_provider=dynamicProvider372"
           "&sf_culture=en&%24orderby=PublicationDateAndTime%20desc&%24top=" + str(limit) + "&%24format=json")
    data = fetch_json(url) or {}
    out = []
    for x in data.get("value", []):
        out.append({
            "title": (x.get("Title") or "").strip(),
            "link": "https://www.who.int/emergencies/disease-outbreak-news/item" + (x.get("ItemDefaultUrl") or ""),
            "date": (x.get("PublicationDateAndTime") or x.get("PublicationDate") or "")[:10],
            "excerpt": strip_tags(x.get("Summary") or x.get("Overview") or "", 420),
            "origin": "WHO Disease Outbreak News",
        })
    return [o for o in out if o["title"]]

def europepmc(query, limit=PER_SOURCE):
    """검색식의 {RECENT} 는 최근 120일 기간으로 바뀐다."""
    today = datetime.date.today()
    query = query.replace("{RECENT}", "(FIRST_PDATE:[%s TO %s])"
                          % ((today - datetime.timedelta(days=120)).isoformat(), today.isoformat()))
    url = ("https://www.ebi.ac.uk/europepmc/webservices/rest/search?query="
           + urllib.parse.quote(query)
           + f"&format=json&pageSize={limit}&resultType=core&sort=P_PDATE_D%20desc")
    data = fetch_json(url)
    out = []
    for r in ((data or {}).get("resultList") or {}).get("result", []):
        doi = r.get("doi") or ""
        link = ("https://doi.org/" + doi) if doi else (
               "https://europepmc.org/article/%s/%s" % (r.get("source", "MED"), r.get("id", "")))
        journal = (r.get("journalInfo") or {}).get("journal", {}).get("title") or r.get("bookOrReportDetails", {}).get("publisher", "") or "preprint"
        out.append({
            "title": r.get("title", "").strip().rstrip("."),
            "link": link,
            "date": parse_date(r.get("firstPublicationDate") or r.get("pubYear", "")),
            "excerpt": strip_tags(r.get("abstractText", ""), 420),
            "origin": f"{journal} · {r.get('authorString','')[:60]}",
        })
    return out

DATE_FORMATS = (
    "%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S %Z",
    "%a, %d %b %Y %H:%M:%S GMT", "%a, %d %b %Y %H:%M %z",
    "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d",
)

def parse_date(s):
    s = (s or "").strip()
    if not s: return ""
    for fmt in DATE_FORMATS:
        try:
            return datetime.datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except Exception:
            pass
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", s)
    return m.group(0) if m else ""

def strip_tags(s, limit=320):
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = html.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s[:limit]

def items_from(root):
    """RSS(item)와 Atom(entry)을 함께 읽는다."""
    if root is None: return []
    out = []
    for it in root.iter():
        tag = it.tag.split("}")[-1]
        if tag not in ("item", "entry"): continue
        def txt(name):
            for ch in it:
                if ch.tag.split("}")[-1] == name:
                    return (ch.text or "").strip()
            return ""
        link = txt("link")
        if not link:
            for ch in it:
                if ch.tag.split("}")[-1] == "link" and ch.get("href"):
                    link = ch.get("href"); break
        title = txt("title")
        desc  = txt("description") or txt("summary") or txt("content")
        date  = parse_date(txt("pubDate") or txt("published") or txt("updated") or txt("date"))
        src_el = None
        for ch in it:
            if ch.tag.split("}")[-1] == "source": src_el = ch
        origin = (src_el.text or "").strip() if src_el is not None and src_el.text else ""
        if title and link:
            out.append({"title": title, "link": link, "date": date,
                        "excerpt": strip_tags(desc), "origin": origin})
    return out

def main():
    force_ipv4()
    groups = json.load(open(SRC, encoding="utf-8"))["groups"]
    today = datetime.date.today()
    cutoff = (today - datetime.timedelta(days=KEEP_DAYS)).strftime("%Y-%m-%d")

    items, seen, status = [], set(), []
    for g in groups:
        for s in g["sources"]:
            print(f"- {s['name']}")
            got, via = [], ""
            if s.get("who_api"):
                got, via = who_don(), "WHO 공식"
            if not got and s.get("epmc"):
                got, via = europepmc(s["epmc"]), "논문 검색"
            if not got and s.get("rss"):
                got, via = items_from(fetch_xml(s["rss"])), "기관 RSS"
            if not got and s.get("query"):          # RSS가 막히거나 비면 뉴스검색으로 대체
                got = items_from(fetch_xml(google_news_rss(s["query"], s.get("lang", "en"))))
                via = "뉴스검색"
                s = dict(s); s.pop("rss", None)      # 아래 제목 정리 규칙을 뉴스검색 기준으로
            got = got[:PER_SOURCE]
            keys = [k.lower() for k in s.get("filter", [])]
            if keys:   # 주제와 먼 글을 걸러낸다 (프리프린트처럼 분야가 넓은 소스용)
                got = [g2 for g2 in got
                       if any(k in (g2["title"] + " " + g2["excerpt"]).lower() for k in keys)]
            kept = 0
            for it in got:
                title = re.sub(r"\s-\s[^-]+$", "", it["title"]).strip() if via == "뉴스검색" else it["title"]
                key = re.sub(r"\W+", "", title.lower())[:60]
                if not title or key in seen: continue
                if it["date"] and it["date"] < cutoff: continue
                seen.add(key)
                items.append({
                    "id": f"{s['id']}-{len(items)}",
                    "sourceId": s["id"],
                    "sourceName": s["name"],
                    "groupId": g["id"],
                    "kind": g.get("kind", "outbreak"),
                    "region": s.get("region", ""),
                    "lang": s.get("lang", "en"),
                    "title": title,
                    "origin": it["origin"],
                    "link": it["link"],
                    "date": it["date"] or today.strftime("%Y-%m-%d"),
                    "excerpt": it["excerpt"],
                })
                kept += 1
            status.append({"id": s["id"], "name": s["name"], "count": kept, "via": via})
            print(f"  → {kept}건 ({via})")

    items.sort(key=lambda x: x["date"], reverse=True)
    data = {
        "updated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "count": len(items),
        "status": status,
        "items": items,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    if not items:
        print("수집 0건 — 기존 feed.json 을 유지합니다.")
        return
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"저장: {OUT} ({len(items)}건)")

if __name__ == "__main__":
    main()
