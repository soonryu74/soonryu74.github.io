"""앱 데이터 빌드: 목록(API) + 상세(API/웹) + AI 초안 + 사람 승인 규칙 → data/services.json

입력
  data/raw/central_list.json        목록 461건 (fetch_bokjiro.py)
  data/raw/central_detail.json      상세 (API)
  data/raw/web_detail.json          상세 (복지로 웹 렌더링, 보조)
  data/raw/structuring_all.json     AI 조건 초안 (structure_trial.py --out)
  data/rules_approved.json          사람이 원문과 대조해 승인한 규칙 + 쉬운말 카드
  data/raw/local_list.json          지자체복지서비스 목록 전국 (fetch_local.py --list)
  data/raw/local_detail.json        지자체 상세 (선택 수집)
  data/raw/structuring_local.json   지자체 AI 조건 초안
출력
  data/services.json                중앙부처 (앱이 읽는 파일, 원자료 값은 바꾸지 않고 필드 선택·정리만)
  data/local/index.json, data/local/NN.json   지자체: 시도별 분할
실행: python3 bokji-biseo/scripts/build_app_data.py   (윈도우: py bokji-biseo\\scripts\\build_app_data.py)
"""
import json, os, re
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")

def load(p, default):
    p = os.path.join(RAW, p) if not os.path.isabs(p) else p
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default

HH_MAP = [  # AI 초안의 가구유형 문자열 → 프로필 플래그
    ("한부모", "single_parent"), ("조손", "single_parent"), ("다자녀", "multi_child"), ("장애", "disabled"), ("다문화", "multicultural"), ("결혼이민", "multicultural"),
    ("북한이탈", "defector"), ("탈북", "defector"), ("기초생활", "basic"), ("수급", "basic"), ("차상위", "near_poor"), ("임산부", "pregnant"), ("임신", "pregnant"),
    ("영유아", "infant"), ("보훈", "veteran"), ("유공자", "veteran"), ("농업인", "farmer"), ("어업인", "farmer"), ("농어", "farmer"), ("대학생", "student"), ("1인", "single"), ("독거", "single"),
]

def draft_to_cond(d):
    cond = {}
    if d.get("age_min") is not None: cond["age_min"] = d["age_min"]
    if d.get("age_max") is not None: cond["age_max"] = d["age_max"]
    m = re.search(r"(\d{2,3})\s*%\s*(이하|미만)", d.get("income_rule") or "")
    if m: cond["income_max_pct"] = int(m.group(1))
    hh = set()
    for s in d.get("household_types") or []:
        for k, v in HH_MAP:
            if k in s: hh.add(v)
    if hh: cond["household_any"] = sorted(hh)
    if d.get("business_required") == "필요": cond["business"] = "required"
    return cond

def main():
    L = load("central_list.json", {"items": []})
    det = {x.get("servId"): x for x in load("central_detail.json", {"items": []})["items"]}
    web = {x.get("servId"): x for x in load("web_detail.json", {"items": []})["items"]}
    drafts = {x.get("_servId"): x for x in load("structuring_all.json", {"results": []})["results"]}
    approved = load(os.path.join(ROOT, "data", "rules_approved.json"), {"rules": {}})["rules"]

    out = []
    for it in L["items"]:
        sid = it.get("servId")
        s = {
            "id": sid, "name": it.get("servNm", ""), "jur": it.get("jurMnofNm", ""), "org": it.get("jurOrgNm", ""),
            "digest": it.get("servDgst", ""), "themes": [t for t in it.get("intrsThemaArray", "").split(",") if t],
            "life": [t for t in it.get("lifeArray", "").split(",") if t], "target": [t for t in it.get("trgterIndvdlArray", "").split(",") if t],
            "online": it.get("onapPsbltYn", ""), "link": it.get("servDtlLink", ""), "phone": it.get("rprsCtadr", ""),
            "cycle": it.get("sprtCycNm", ""), "registered": it.get("svcfrstRegTs", ""),
            "detail_src": "api" if sid in det else ("web" if sid in web else None),
        }
        if sid in approved:
            r = dict(approved[sid]); r["status"] = "approved"; s["rule"] = r
        elif sid in drafts and not drafts[sid].get("_error"):
            d = drafts[sid]
            s["rule"] = {"status": "draft", "cond": draft_to_cond(d), "quotes": d.get("quotes", [])[:3], "ambiguous": bool(d.get("ambiguous")), "ambiguous_reason": d.get("ambiguous_reason", "")}
        else:
            s["rule"] = {"status": "none"}
        out.append(s)

    meta = {
        "source": "한국사회보장정보원 중앙부처복지서비스 API (공공데이터포털 15090532)", "fetched": L.get("meta", {}).get("fetched", ""), "built": date.today().isoformat(),
        "count": len(out), "ministries": len({s["jur"] for s in out if s["jur"]}),
        "approved": sum(1 for s in out if s["rule"]["status"] == "approved"), "draft": sum(1 for s in out if s["rule"]["status"] == "draft"),
        "detail_api": len(det), "detail_web": len(web), "ambiguous": sum(1 for d in drafts.values() if d.get("ambiguous")),
    }
    # ----- 지자체 -----
    LL = load("local_list.json", {"items": [], "meta": {}})
    ldet = {x.get("servId"): x for x in load("local_detail.json", {"items": []})["items"]}
    ldrafts = {x.get("_servId"): x for x in load("structuring_local.json", {"results": []})["results"]}
    by_sido = {}
    for it in LL["items"]:
        sid = it.get("servId"); sido = it.get("ctpvNm") or "기타"
        d = ldet.get(sid, {})
        end = d.get("enfcEndYmd", "")
        s = {
            "id": sid, "name": it.get("servNm", ""), "sido": sido, "sgg": it.get("sggNm", ""), "dept": it.get("bizChrDeptNm", ""),
            "digest": (it.get("servDgst", "") or "")[:200], "themes": [t.strip() for t in it.get("intrsThemaNmArray", "").split(",") if t.strip()],
            "life": [t.strip() for t in it.get("lifeNmArray", "").split(",") if t.strip()], "target": [t.strip() for t in it.get("trgterIndvdlNmArray", "").split(",") if t.strip()],
            "apply": it.get("aplyMtdNm", ""), "lastMod": it.get("lastModYmd", ""), "link": it.get("servDtlLink", ""), "local": True,
            "end": end if end and not end.startswith("9999") else "", "begin": d.get("enfcBgngYmd", ""), "detail": bool(d),
        }
        if sid in approved:
            r = dict(approved[sid]); r["status"] = "approved"; s["rule"] = r
        elif sid in ldrafts and not ldrafts[sid].get("_error"):
            dd = ldrafts[sid]; cond = draft_to_cond(dd); cond["region"] = {"sido": sido, **({"sgg": s["sgg"]} if s["sgg"] else {})}
            s["rule"] = {"status": "draft", "cond": cond, "quotes": dd.get("quotes", [])[:3], "ambiguous": bool(dd.get("ambiguous")), "ambiguous_reason": dd.get("ambiguous_reason", "")}
        else:
            s["rule"] = {"status": "none"}
        by_sido.setdefault(sido, []).append(s)
    ldir = os.path.join(ROOT, "data", "local"); os.makedirs(ldir, exist_ok=True)
    index = {"meta": {"source": "한국사회보장정보원 지자체복지서비스 API (공공데이터포털 15108347)", "fetched": LL.get("meta", {}).get("fetched", ""), "count": len(LL["items"]),
                      "detail": len(ldet), "approved": sum(1 for v in by_sido.values() for x in v if x["rule"]["status"] == "approved"), "draft": sum(1 for v in by_sido.values() for x in v if x["rule"]["status"] == "draft")}, "sidos": []}
    for i, (sido, items) in enumerate(sorted(by_sido.items())):
        fname = f"{i:02d}.json"
        with open(os.path.join(ldir, fname), "w", encoding="utf-8") as f:
            json.dump({"sido": sido, "services": items}, f, ensure_ascii=False, separators=(",", ":"))
        index["sidos"].append({"name": sido, "file": fname, "count": len(items), "sggs": sorted({x["sgg"] for x in items if x["sgg"]})})
    with open(os.path.join(ldir, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    meta["local"] = index["meta"]
    with open(os.path.join(ROOT, "data", "services.json"), "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "services": out}, f, ensure_ascii=False, separators=(",", ":"))
    print(json.dumps(meta, ensure_ascii=False))

if __name__ == "__main__":
    main()
