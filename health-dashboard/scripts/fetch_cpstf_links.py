# -*- coding: utf-8 -*-
"""
미국 CPSTF(Community Guide) 권고 224건에 원문 링크를 붙인다.

fetch_cpstf.py 가 받은 「All Active Findings」 PDF에는 권고 이름·판정·날짜만 있고 페이지 주소가 없어,
대시보드에서 CPSTF 항목을 눌러도 원문으로 갈 수 없었다. 이 스크립트는
  1) 주제 페이지 /topics/<slug>.html  (22개 — 홈페이지 메뉴의 주소 그대로)
  2) 주제별 권고 목록 /pages/task-force-findings-<…>.html  (주제 페이지에서 찾는다)
  3) 목록 속 개별 권고 /findings/<…>.html
을 읽어 권고 이름으로 맞춘 뒤 data/cpstf_findings.json 의 topics[].url·findings_url, items[].url 을 채운다.
맞출 수 없는 권고는 url 없이 두고(화면에서는 주제별 권고 목록으로 보낸다) 개수를 출력한다.
사용법: python scripts/fetch_cpstf_links.py
"""
import json, re, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
P = ROOT / "data" / "cpstf_findings.json"
SITE = "https://www.thecommunityguide.org"
TOPIC_SLUG = {
    "Adolescent Health": "adolescent-health", "Asthma": "asthma", "Cancer": "cancer", "Diabetes": "diabetes",
    "Excessive Alcohol Use": "excessive-alcohol-consumption",
    "Health Communication and Health Information Technology": "health-communication-and-health-information-technology",
    "Heart Disease and Stroke Prevention": "heart-disease-stroke-prevention",
    "HIV/AIDS, STIs and Teen Pregnancy": "hiv-stis-and-teen-pregnancy", "Mental Health": "mental-health",
    "Motor Vehicle Injury": "motor-vehicle-injury", "Nutrition": "nutrition", "Obesity": "obesity", "Oral Health": "oral-health",
    "Physical Activity": "physical-activity", "Pregnancy Health": "pregnancy-health", "Preparedness and Response": "preparedness-and-response",
    "Social Determinants of Health": "social-determinants-health", "Substance Use": "substance-use", "Tobacco Use": "tobacco",
    "Vaccination": "vaccination", "Violence Prevention": "violence", "Worksite Health": "worksite-health",
}
S = requests.Session()


def get(url):
    for i in range(4):
        try:
            r = S.get(url, timeout=60)
            if r.status_code == 200: return r.text
            if r.status_code == 404: return ""
        except Exception:
            pass
        time.sleep(2 ** i)
    return ""


def links(html):
    """(주소, 링크 글자) — /findings/ 로 가는 것만"""
    out = []
    for m in re.finditer(r'<a[^>]*href="([^"]*/findings/[^"#]*)"[^>]*>(.*?)</a>', html, re.S):
        href, txt = m.group(1), re.sub(r"<[^>]+>|&nbsp;|\s+", " ", m.group(2)).strip()
        href = href if href.startswith("http") else SITE + href
        out.append((href.replace("http://", "https://"), txt))
    return out


STOP = {"and", "or", "the", "of", "to", "for", "in", "with", "among", "a", "an", "on", "by", "use", "interventions", "intervention"}
def toks(s):
    s = re.sub(r"&amp;", "&", s.lower())
    return {w for w in re.findall(r"[a-z0-9]+", s) if w not in STOP}


def score(name, href, txt):
    a = toks(name)
    if not a: return 0
    b = toks(txt) | toks(href.rsplit("/", 1)[-1].replace("-", " ").replace(".html", ""))
    return len(a & b) / len(a)


def main():
    d = json.loads(P.read_text(encoding="utf-8"))
    per_topic = {}
    for t in d["topics"]:
        slug = TOPIC_SLUG.get(t["topic"])
        if not slug:
            print("  주제 주소 없음:", t["topic"]); continue
        t["url"] = f"{SITE}/topics/{slug}.html"
        html = get(t["url"])
        fl = re.search(r'href="(/pages/[^"]*findings-[^"]*\.html)"', html)
        t["findings_url"] = SITE + fl.group(1) if fl else t["url"]
        lk = links(get(t["findings_url"])) if fl else []
        lk += links(html)
        per_topic[t["topic"]] = list(dict.fromkeys(lk))
        print(f"  {t['topic']:<40s} 권고 링크 {len(per_topic[t['topic']]):3d}  목록 {'있음' if fl else '없음'}")
        time.sleep(0.5)
    # PDF는 계층을 잃었다: 「Client Reminders Breast Cancer」 다음 줄의 「Cervical Cancer」는 「Client Reminders — 자궁경부암」이다.
    # 짧은 하위 항목은 바로 위의 온전한 항목 이름을 맥락으로 붙여 맞춘다(자기 단어가 우선, 맥락은 동점 가르기).
    CANCER_T = re.compile(r"\s*(Breast|Cervical|Colorectal) Cancer$")
    SUB = re.compile(r"^(When |Coordinated with|To |Non-|Healthcare Workers|Group-Level|Individual-Level|(Breast|Cervical|Colorectal) Cancer$)")
    hit, base = 0, ""
    for it in d["items"]:
        nm = it["name"]
        is_sub = bool(SUB.match(nm))
        if not is_sub: base = CANCER_T.sub("", nm)
        ctx = base if is_sub else ""
        it["label"] = f"{ctx} — {nm}" if ctx else nm      # 화면에 보일 이름(하위 항목은 위 항목과 함께)
        cands = per_topic.get(it["topic"], [])
        sc = sorted(((score(nm, *c) + 0.5 * score(ctx, *c) if ctx else score(nm, *c), c[0]) for c in cands), reverse=True)
        best = sc[0] if sc else (0, None)
        second = next((x[0] for x in sc[1:] if x[1] != best[1]), 0)
        own = score(nm, best[1], "") if best[1] else 0
        # 확신할 때만 개별 링크: 자기 단어 80% 이상이 주소에 있고, 차점과 0.15 이상 차이
        if best[1] and own >= 0.8 and best[0] - second >= 0.15:
            it["url"] = best[1]; hit += 1
        else:
            it.pop("url", None)
    # 한 주소를 둘 이상이 잡으면(같은 권고의 판정 두 줄이 아닌 한) 둘 다 뺀다
    from collections import Counter
    cnt = Counter(it.get("url") for it in d["items"] if it.get("url"))
    for it in d["items"]:
        if it.get("url") and cnt[it["url"]] > 1:
            it.pop("url"); hit -= 1
    print(f"개별 권고 링크 {hit}/{len(d['items'])} (나머지는 주제별 권고 목록으로)")
    d["links_retrieved"] = time.strftime("%Y-%m-%d")
    P.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
