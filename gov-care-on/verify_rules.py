# -*- coding: utf-8 -*-
"""
rules.json 인용 검증: 규칙에 적힌 소득 %·금액·서식·근거가 지침 원문의 '인용한 쪽'에 실제로 있는지 대조.

실행: python verify_rules.py            (표 출력)
      python verify_rules.py --json     (JSON 출력, 앱에서 사용)
"""
import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
RULES = BASE / "input_readonly" / "rules.json"
CORPUS = BASE / "input_readonly" / "corpus"


def load_pages() -> dict:
    docs = {}
    for p in CORPUS.glob("*.json"):
        d = json.loads(p.read_text(encoding="utf-8"))
        docs[d["doc_id"]] = {pg["pdf_page"]: pg["text"] for pg in d["pages"]}
    return docs


def norm(s: str) -> str:
    # 공백·중점·괄호 차이를 무시하고 비교
    return re.sub(r"[\s·‧･･·‧()\[\]<>〈〉［］]", "", s)


def contains(text: str, needle: str) -> bool:
    return norm(needle) in norm(text)


def money_forms(v: int) -> list[str]:
    s = f"{v:,}"
    out = [s]
    if v % 10000 == 0:
        man = v // 10000
        out += [f"{man}만원", f"{man}만 원", f"{man:,}만원", f"{man:,}만 원"]
    return out


def check_program(p: dict, docs: dict) -> list[dict]:
    rows = []
    doc = p["doc_id"]

    def page(cite):
        return docs.get(cite.get("doc_id", doc), {}).get(cite["pdf_page"], "")

    def add(kind, what, cite, ok, found=""):
        rows.append({"program": p["program"], "ministry": p["ministry"], "kind": kind, "what": what,
                     "doc": cite.get("doc_id", doc), "pdf_page": cite["pdf_page"], "print_page": cite["print_page"],
                     "ok": bool(ok), "found": found})

    inc = p.get("income")
    if inc:
        t = page(inc["cite"])
        pct = inc["pct"]
        ok = any(contains(t, x) for x in [f"{pct}%", f"{pct} %", f"100분의 {pct}", f"100분의{pct}"])
        add("소득 기준", f"기준 중위소득 {pct}%", inc["cite"], ok, f"'{pct}%' 쪽 내 존재" if ok else "쪽에서 퍼센트 표기 못 찾음")
        for hh, v in (inc.get("table") or {}).items():
            ok = any(contains(t, f) for f in money_forms(v))
            add("소득 상한액", f"{hh}인 가구 {v:,}원", inc["cite"], ok)
    am = p.get("amount")
    if am:
        t = page(am["cite"])
        if "table" in am:
            for hh, v in am["table"].items():
                ok = any(contains(t, f) for f in money_forms(v))
                add("지원 금액", f"{hh}인 가구 {v:,}원", am["cite"], ok)
        else:
            ok = any(contains(t, f) for f in money_forms(am["flat"]))
            add("지원 한도", f"{am['flat']:,}원", am["cite"], ok)
    for f in p.get("forms", []):
        t = page(f["cite"])
        m = re.search(r"(서식|별지)\s*(제)?\s*(\d+)\s*호", f["name"])
        if m:
            n = m.group(3)
            ok = re.search(rf"(서식|별지)\s*(제)?\s*{n}\s*호", t) is not None
            add("서식", f["name"], f["cite"], ok)
        else:
            words = [w for w in re.split(r"[\s·,()/]+", f["name"]) if len(w) >= 2][:6]
            hit = sum(contains(t, w) for w in words)
            add("서식", f["name"], f["cite"], hit >= max(1, len(words) // 2), f"키워드 {hit}/{len(words)} 일치")
    for b in p.get("benefits", []):
        t = page(b["cite"])
        nums = re.findall(r"\d{1,3}(?:,\d{3})+|\d+만\s?원|\d+%", b["detail"])
        if nums:
            ok = all(contains(t, n) for n in nums[:3])
            add("지원 내용 수치", f"{b['item']}: {', '.join(nums[:3])}", b["cite"], ok)
        else:
            add("지원 내용", b["item"], b["cite"], contains(t, b["item"][:4]))
    for ex in p.get("exclusions", []):
        t = page(ex["cite"])
        add("제외 사유", ex["note"][:40], ex["cite"], any(contains(t, k) for k in ex["keywords"]) or any(contains(t, w) for w in ex["note"].split()[:3]))
    for v in p.get("verify_always", []) + p.get("verify_if", []):
        t = page(v["cite"])
        words = [w for w in re.split(r"[\s·,()/]+", v["item"]) if len(w) >= 2][:6]
        hit = sum(contains(t, w) for w in words)
        add("확인 항목 근거", v["item"][:40], v["cite"], hit >= max(1, len(words) // 2), f"키워드 {hit}/{len(words)} 일치")
    for cr in p.get("cross_rules", []):
        t = page(cr["cite"])
        add("제도 간 규칙", cr["note"][:40], cr["cite"], contains(t, "우선") and contains(t, "중복"))
    return rows


def run() -> dict:
    docs = load_pages()
    rules = json.loads(RULES.read_text(encoding="utf-8"))
    rows = []
    for p in rules["programs"]:
        rows.extend(check_program(p, docs))
    # 레지스트리 규칙도 검증
    reg_dir = BASE / "registry" / "rules"
    reg_corpus = BASE / "registry" / "corpus"
    if reg_dir.exists():
        for rp in reg_dir.glob("*.json"):
            cp = reg_corpus / rp.name
            if cp.exists():
                d = json.loads(cp.read_text(encoding="utf-8"))
                docs[d["doc_id"]] = {pg["pdf_page"]: pg["text"] for pg in d["pages"]}
            for p in json.loads(rp.read_text(encoding="utf-8")):
                rows.extend(check_program(p, docs))
    ok = sum(r["ok"] for r in rows)
    return {"total": len(rows), "passed": ok, "failed": len(rows) - ok, "rows": rows}


if __name__ == "__main__":
    res = run()
    if "--json" in sys.argv:
        print(json.dumps(res, ensure_ascii=False, indent=1))
    else:
        for r in res["rows"]:
            print(f"{'✅' if r['ok'] else '❌'} [{r['ministry']}] {r['program']} | {r['kind']}: {r['what']} → {r['doc']} PDF {r['pdf_page']}p(인쇄 {r['print_page']}p) {r['found']}")
        print(f"\n합계 {res['total']}건 중 통과 {res['passed']}건, 실패 {res['failed']}건")
