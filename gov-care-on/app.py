# -*- coding: utf-8 -*-
"""
국민 곁에 ON (Gov-Care Navigator)

실제 지침 원문(보건복지부 「2026년 긴급복지지원사업 안내」, 질병관리청 「2026 국가결핵관리지침」)을
읽기 전용 코퍼스로 투입하고, 상담 내용과 대조해
  1) 제도별 1차 적격 스크리닝(소득·위기사유·제외사유, 조문 쪽수 인용)
  2) 원문 근거 구절 검색(BM25)
  3) 기안문·사전기입 신청서·쉬운말 안내장 생성(LLM 또는 내장 템플릿)
을 수행한다.

실행: streamlit run app.py
"""
import datetime
import hashlib
import io
import json
import re
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

import pandas as pd
import streamlit as st
from rank_bm25 import BM25Okapi

# ──────────────────────────────────────────────────────────────
# 경로
# ──────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.resolve()
INPUT_DIR = BASE_DIR / "input_readonly"
CORPUS_DIR = INPUT_DIR / "corpus"
RULES_PATH = INPUT_DIR / "rules.json"
OUTPUT_DIR = BASE_DIR / "output_generated"
OUTPUT_DIR.mkdir(exist_ok=True)

DOC_SOURCES = {
    "MOHW_EMG_2026": {
        "title": "2026년 긴급복지지원사업 안내",
        "org": "보건복지부 기초생활보장과",
        "url": "https://mohw.go.kr/board.es?act=view&bid=0009&list_no=1488509&mid=a10402000000",
        "retrieved": "2026-10-23",
    },
    "KDCA_TB_2026": {
        "title": "2026 국가결핵관리지침",
        "org": "질병관리청 결핵정책과",
        "url": "https://tbzero.kdca.go.kr/tbzero/board/boardView.do?leftMenuId=8&paramMenuId=82&boardSeq=9206",
        "retrieved": "2026-10-23",
    },
}


def sha16(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16].upper()


# ──────────────────────────────────────────────────────────────
# 코퍼스 로딩 & BM25 검색
# ──────────────────────────────────────────────────────────────
_HANGUL_RUN = re.compile(r"[가-힣]+|[A-Za-z]+|\d+(?:,\d{3})*(?:\.\d+)?%?")


def tokenize(text: str) -> list[str]:
    toks = []
    for m in _HANGUL_RUN.finditer(text):
        w = m.group(0)
        if re.match(r"[가-힣]", w):
            if len(w) == 1:
                toks.append(w)
            else:
                toks.extend(w[i : i + 2] for i in range(len(w) - 1))
        else:
            toks.append(w.lower())
    return toks


def chunk_page(text: str, size: int = 450) -> list[str]:
    lines = [l for l in text.splitlines() if l.strip()]
    chunks, cur = [], ""
    for line in lines:
        if len(cur) + len(line) + 1 > size and cur:
            chunks.append(cur)
            cur = line
        else:
            cur = f"{cur}\n{line}" if cur else line
    if cur:
        chunks.append(cur)
    return chunks


@st.cache_resource(show_spinner="지침 원문 색인 구축 중…")
def load_corpus() -> dict:
    docs, chunks = {}, []
    for path in sorted(CORPUS_DIR.glob("*.json")):
        d = json.loads(path.read_text(encoding="utf-8"))
        d["file_sha16"] = sha16(path)
        docs[d["doc_id"]] = d
        for pg in d["pages"]:
            for c in chunk_page(pg["text"]):
                chunks.append({"doc_id": d["doc_id"], "pdf_page": pg["pdf_page"], "print_page": pg["print_page"], "text": c})
    bm25 = BM25Okapi([tokenize(c["text"]) for c in chunks]) if chunks else None
    return {"docs": docs, "chunks": chunks, "bm25": bm25}


def build_extra_index(extra_chunks: list[dict]):
    if not extra_chunks:
        return None
    return BM25Okapi([tokenize(c["text"]) for c in extra_chunks])


def search(corpus: dict, query: str, doc_id: str | None, k: int = 3, extra: tuple | None = None) -> list[dict]:
    results = []
    q = tokenize(query)
    if corpus["bm25"] is not None:
        scores = corpus["bm25"].get_scores(q)
        for idx, sc in enumerate(scores):
            c = corpus["chunks"][idx]
            if doc_id and c["doc_id"] != doc_id:
                continue
            if sc > 0:
                results.append({**c, "score": float(sc)})
    if extra and extra[0] is not None:
        bm, ch = extra
        for idx, sc in enumerate(bm.get_scores(q)):
            if sc > 0:
                results.append({**ch[idx], "score": float(sc)})
    results.sort(key=lambda r: r["score"], reverse=True)
    # 같은 쪽 중복 제거
    seen, out = set(), []
    for r in results:
        key = (r["doc_id"], r["pdf_page"])
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
        if len(out) >= k:
            break
    return out


def page_text(corpus: dict, doc_id: str, pdf_page: int) -> str:
    d = corpus["docs"].get(doc_id)
    if not d:
        return ""
    for pg in d["pages"]:
        if pg["pdf_page"] == pdf_page:
            return pg["text"]
    return ""


def doc_title(corpus: dict, doc_id: str) -> str:
    return DOC_SOURCES.get(doc_id, {}).get("title") or corpus["docs"].get(doc_id, {}).get("source_file", doc_id)


def cite_label(corpus: dict, cite: dict, default_doc: str) -> str:
    did = cite.get("doc_id", default_doc)
    return f"{doc_title(corpus, did)} {cite['print_page']}쪽"


# ──────────────────────────────────────────────────────────────
# 규칙 엔진 (1차 스크리닝)
# ──────────────────────────────────────────────────────────────
def _hit(keywords: list[str], text: str) -> list[str]:
    return [k for k in keywords if k in text]


def evaluate(program: dict, case: dict, corpus: dict) -> dict:
    text = case["situation"]
    hh = str(min(max(int(case["household_size"]), 1), 7))
    checks = []  # {"name","status": pass|fail|verify, "detail","cite"}
    doc = program["doc_id"]

    # 1) 트리거 키워드(모든 그룹에서 1개 이상)
    groups_ok, hits_all = True, []
    for grp in program["trigger_groups"]:
        hits = _hit(grp, text)
        hits_all.extend(hits)
        if not hits:
            groups_ok = False
    checks.append({
        "name": "지원 사유 키워드", "status": "pass" if groups_ok else "fail",
        "detail": ("일치: " + ", ".join(dict.fromkeys(hits_all))) if hits_all else "상담 내용에서 해당 사유를 찾지 못함",
        "cite": None,
    })

    # 2) 소득 기준
    inc = program.get("income")
    income_ok = True
    if inc:
        pct = case["income_pct"]
        ok = pct <= inc["pct"] if inc["op"] == "<=" else pct < inc["pct"]
        income_ok = ok
        thr = inc["table"].get(hh)
        thr_txt = f" (가구원 {hh}인 기준 월 {thr:,}원 이하)" if thr else ""
        checks.append({
            "name": "소득 기준", "status": "pass" if ok else "fail",
            "detail": f"{inc['label']}{thr_txt} / 입력값 {pct}%",
            "cite": cite_label(corpus, inc["cite"], doc),
        })

    # 3) 제외 사유
    excluded = False
    for ex in program.get("exclusions", []):
        hits = _hit(ex["keywords"], text)
        if hits:
            excluded = True
            checks.append({"name": "제외 사유", "status": "fail", "detail": f"{ex['note']} (일치: {', '.join(hits)})", "cite": cite_label(corpus, ex["cite"], doc)})

    # 4) 확인 필요 항목 (blocking=true 항목이 걸리면 '확인 필요' 판정)
    blocked = False
    for v in program.get("verify_if", []):
        if _hit(v["keywords"], text):
            checks.append({"name": "담당자 확인", "status": "verify", "detail": v["item"], "cite": cite_label(corpus, v["cite"], doc)})
            if v.get("blocking"):
                blocked = True
    for v in program.get("verify_always", []):
        checks.append({"name": "담당자 확인", "status": "verify", "detail": v["item"], "cite": cite_label(corpus, v["cite"], doc)})
    am = program.get("age_min_for")
    if am and case["age"] >= am["age"]:
        checks.append({"name": "연령 기반 연계", "status": "verify", "detail": am["item"], "cite": cite_label(corpus, am["cite"], doc)})

    # 5) 판정
    if program.get("link_only"):
        status = "연계 검토" if groups_ok else "해당 없음"
    elif not groups_ok or not income_ok or excluded:
        status = "미충족"
    elif blocked:
        status = "확인 필요"
    else:
        status = "적격 가능"

    # 6) 예상 금액
    amount_txt, amount_cite = None, None
    am_def = program.get("amount")
    if am_def and status == "적격 가능":
        if "table" in am_def:
            val = am_def["table"].get(hh)
            amount_txt = f"월 {val:,}원 ({am_def['label']})" if val else am_def["label"]
        else:
            amount_txt = f"최대 {am_def['flat']:,}원 ({am_def['label']})"
        amount_cite = cite_label(corpus, am_def["cite"], doc)

    return {"program": program, "status": status, "checks": checks, "amount": amount_txt, "amount_cite": amount_cite}


def apply_cross_rules(results: list[dict], corpus: dict) -> list[dict]:
    by_id = {r["program"]["id"]: r for r in results}
    notes = []
    for r in results:
        for cr in r["program"].get("cross_rules", []):
            other = by_id.get(cr["with"])
            if other and r["status"] == "적격 가능" and other["status"] == "적격 가능":
                key = tuple(sorted([r["program"]["id"], cr["with"]]))
                if key not in [n["key"] for n in notes]:
                    notes.append({"key": key, "note": cr["note"], "cite": cite_label(corpus, cr["cite"], r["program"]["doc_id"])})
    return notes


# ──────────────────────────────────────────────────────────────
# LLM 라우터 (OpenAI 호환 Chat Completions)
# ──────────────────────────────────────────────────────────────
PROVIDERS = {
    "Upstage Solar (solar-pro4, 클라우드 API)": {"url": "https://api.upstage.ai/v1/chat/completions", "model": "solar-pro4", "needs_key": True},
    "Ollama 로컬 (gemma2 등, 폐쇄망)": {"url": "http://localhost:11434/v1/chat/completions", "model": "gemma2", "needs_key": False},
    "OpenAI 호환 서버 직접 입력 (EXAONE·HyperCLOVA X 등)": {"url": "", "model": "", "needs_key": False},
    "내장 템플릿 엔진 (LLM 미사용, 오프라인)": None,
}


def secret(name: str) -> str:
    try:
        return str(st.secrets.get(name, "") or "")
    except Exception:
        return ""


def chat_complete(url: str, model: str, api_key: str, system: str, user: str, timeout: int = 60) -> str:
    body = json.dumps({
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0.2,
        "stream": False,
    }).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    choices = data.get("choices") or []
    if choices:
        msg = choices[0].get("message", {})
        content = msg.get("content")
        if isinstance(content, list):
            content = "".join(p.get("text", "") for p in content if isinstance(p, dict))
        if content:
            return content.strip()
    if data.get("response"):
        return str(data["response"]).strip()
    raise ValueError("응답에 content가 없습니다")


SYSTEM_PROMPT = (
    "당신은 대한민국 지방자치단체 보건·복지 담당 공무원을 보조하는 행정문서 작성 AI입니다. "
    "반드시 제공된 [판정 결과]와 [원문 근거 구절]에 있는 내용만 사용하고, 없는 금액·조문·쪽수를 만들어내지 마십시오. "
    "근거를 인용할 때는 '(지침명 n쪽)' 형식으로 표기하십시오. "
    "'확인 필요'로 표시된 항목은 확정된 사실처럼 쓰지 말고 담당자가 확인해야 할 사항으로 적으십시오. "
    "출력은 한국어 마크다운으로 작성하십시오."
)

DOC_SPECS = {
    "official_report": ("① 검토보고(기안문)", "위기 민원인 범부처 통합 지원 검토보고 기안문 초안을 작성하십시오. 구성: 문서 개요(검토대상·상담요지) / 제도별 판정 결과와 근거 조문 / 제도 간 중복·우선순위 / 담당자 확인 사항 / 조치 계획 및 구비 서식."),
    "pre_filled_form": ("② 사전기입 통합 신청서", "민원인이 서명만 하면 되도록 상담 내용으로 항목을 미리 채운 '통합 지원 신청서' 초안을 마크다운 표로 작성하십시오. 구성: 신청인 정보 표 / 신청 제도 및 예상 지원 내역 표(근거 쪽수 포함) / 담당자 확인 체크리스트 / 동의·서명란(신청일자 포함)."),
    "easy_guide": ("③ 큰글씨 쉬운말·다국어 안내장", "민원인(고령자·외국인 포함)에게 드리는 쉬운말 안내장을 작성하십시오. 전문용어 없이 짧은 문장으로, 받을 수 있는 도움과 금액, 오늘 해야 할 일(서명)만 적으십시오. 마지막에 같은 내용을 영어와 베트남어로 3~4문장씩 요약하십시오."),
}


def build_context(case: dict, results: list[dict], cross_notes: list[dict], passages: dict, corpus: dict) -> str:
    lines = [f"[민원인] 성명 {case['name']}, 만 {case['age']}세, {case['region']}, {case['household']} (가구원 {case['household_size']}인), 기준중위소득 {case['income_pct']}%",
             f"[상담 내용] {case['situation']}", "", "[판정 결과]"]
    for r in results:
        p = r["program"]
        lines.append(f"- {p['ministry']} / {p['program']} ({p['doc_title']}, {p['legal_basis']}): {r['status']}")
        for c in r["checks"]:
            tag = {"pass": "충족", "fail": "미충족", "verify": "확인 필요"}[c["status"]]
            cite = f" ({c['cite']})" if c["cite"] else ""
            lines.append(f"    · [{tag}] {c['name']}: {c['detail']}{cite}")
        if r["amount"]:
            lines.append(f"    · 예상 지원: {r['amount']} ({r['amount_cite']})")
        if r["status"] in ("적격 가능", "연계 검토"):
            for b in p["benefits"]:
                lines.append(f"    · 지원 내용: {b['item']} - {b['detail']} ({cite_label(corpus, b['cite'], p['doc_id'])})")
            for f in p["forms"]:
                lines.append(f"    · 서식: {f['name']} ({cite_label(corpus, f['cite'], p['doc_id'])})")
    if cross_notes:
        lines.append("")
        lines.append("[제도 간 중복·우선순위]")
        for n in cross_notes:
            lines.append(f"- {n['note']} ({n['cite']})")
    lines.append("")
    lines.append("[원문 근거 구절]")
    for pid, hits in passages.items():
        for h in hits:
            lines.append(f"<{doc_title(corpus, h['doc_id'])} {h['print_page']}쪽>\n{h['text'][:700]}\n")
    return "\n".join(lines)


def generate_documents(provider: str, url: str, model: str, api_key: str, context: str) -> tuple[dict, str, list[str]]:
    outputs, warnings = {}, []
    engine_label = "내장 템플릿 엔진 (LLM 미사용)"
    cfg = PROVIDERS.get(provider)
    if cfg is not None and url.strip().startswith("http") and model.strip():
        ok_all = True
        for key, (title, instr) in DOC_SPECS.items():
            try:
                outputs[key] = chat_complete(url.strip(), model.strip(), api_key, SYSTEM_PROMPT, f"{instr}\n\n{context}")
            except urllib.error.HTTPError as e:
                warnings.append(f"{title}: HTTP {e.code} ({e.reason})")
                ok_all = False
                break
            except Exception as e:  # noqa: BLE001
                warnings.append(f"{title}: {type(e).__name__} - {e}")
                ok_all = False
                break
        if ok_all and len(outputs) == 3:
            return outputs, f"LLM 생성 · {model} @ {url.split('/')[2]}", warnings
        outputs = {}
        warnings.append("LLM 호출에 실패하여 내장 템플릿으로 대체했습니다.")
    return outputs, engine_label, warnings


# ──────────────────────────────────────────────────────────────
# 내장 템플릿 (LLM 미연결 시)
# ──────────────────────────────────────────────────────────────
STATUS_ICON = {"적격 가능": "✅", "확인 필요": "🟡", "미충족": "❌", "연계 검토": "🔗", "해당 없음": "—"}


def template_documents(case: dict, results: list[dict], cross_notes: list[dict], corpus: dict) -> dict:
    today = datetime.date.today()
    eligible = [r for r in results if r["status"] in ("적격 가능", "연계 검토")]

    # ① 검토보고
    sec = []
    for r in results:
        p = r["program"]
        sec.append(f"**{STATUS_ICON[r['status']]} [{p['ministry']}] {p['program']}** — {r['status']}  \n근거: {p['doc_title']} ({p['legal_basis']})")
        for c in r["checks"]:
            tag = {"pass": "충족", "fail": "미충족", "verify": "확인 필요"}[c["status"]]
            cite = f" _({c['cite']})_" if c["cite"] else ""
            sec.append(f"- [{tag}] {c['name']}: {c['detail']}{cite}")
        if r["amount"]:
            sec.append(f"- 예상 지원: **{r['amount']}** _({r['amount_cite']})_")
        sec.append("")
    cross = "\n".join(f"- {n['note']} _({n['cite']})_" for n in cross_notes) or "- 해당 없음"
    forms = "\n".join(f"- {f['name']} _({cite_label(corpus, f['cite'], r['program']['doc_id'])})_" for r in eligible for f in r["program"]["forms"]) or "- 해당 없음"
    report = f"""# [검토보고 초안] 위기 민원인 범부처 통합 지원 검토
* **문서번호**: 보건복지-{today.year}-○○○○호
* **검토 대상**: {case['name']} (만 {case['age']}세, {case['region']}, {case['household']} / 가구원 {case['household_size']}인 / 기준중위소득 {case['income_pct']}%)
* **상담 요지**: {case['situation']}
* **대조 지침**: 보건복지부 「2026년 긴급복지지원사업 안내」, 질병관리청 「2026 국가결핵관리지침」 (원문 읽기 전용 투입)

---
### 1. 제도별 1차 스크리닝 결과
{chr(10).join(sec)}
### 2. 제도 간 중복·우선순위
{cross}

### 3. 조치 계획
1. 위 '확인 필요' 항목을 행정정보 공동이용 및 현장확인으로 확인한 뒤 지원 결정
2. 민원인이 기관별 창구를 따로 방문하지 않도록 본 검토보고로 보건소·복지과 협의를 갈음
3. 사전 기입 서식:
{forms}

> 본 결과는 지침 조문 기반 1차 스크리닝이며, 최종 결정은 담당 공무원의 조사·심의에 따릅니다.
"""

    # ② 사전기입 신청서
    rows = "\n".join(
        f"| {r['program']['ministry']} | {r['program']['program']} | {r['amount'] or '연계 서비스'} | {r['amount_cite'] or r['program']['doc_title']} |"
        for r in eligible
    ) or "| - | 해당 제도 없음 | - | - |"
    verify_items = [c for r in eligible for c in r["checks"] if c["status"] == "verify"]
    checklist = "\n".join(f"- [ ] {c['detail']} _({c['cite']})_" for c in verify_items) or "- [ ] 없음"
    form = f"""# [사전 기입 통합 지원 신청서]
> 담당 공무원이 상담 내용을 바탕으로 항목을 미리 채웠습니다. 내용을 확인하신 뒤 **서명만** 해 주시면 됩니다.

### 1. 신청인 정보
| 항목 | 기입 내용 |
| :--- | :--- |
| 성명 / 연령 | **{case['name']}** / 만 {case['age']}세 |
| 거주지 | {case['region']} |
| 가구 특성 | {case['household']} (가구원 {case['household_size']}인) |
| 소득 수준 | 기준중위소득 {case['income_pct']}% |

### 2. 신청 제도 및 예상 지원
| 소관 | 제도 | 예상 지원 | 근거 |
| :--- | :--- | :--- | :--- |
{rows}

### 3. 담당자 확인 체크리스트
{checklist}

### 4. 동의 및 서명
본인은 위 지원 제도의 절차와 근거를 안내받았으며, 범부처 통합 신청 및 개인정보·금융정보 활용에 동의합니다.

* 신청일자: {today.year}년 {today.month}월 {today.day}일
* 신청인: **{case['name']}** (서명 또는 인)
"""

    # ③ 쉬운말 안내장
    easy = []
    for r in eligible:
        p = r["program"]
        amt = f" 매달 **{r['amount'].split(' (')[0]}** 정도입니다." if r["amount"] and r["amount"].startswith("월") else (f" **{r['amount'].split(' (')[0]}**까지 도와드립니다." if r["amount"] else "")
        easy.append(f"**{p['ministry']}**에서 '{p['program']}'으로 도와드립니다.{amt}")
    if not easy:
        easy.append("지금 적어 주신 내용으로는 바로 연결되는 제도가 없습니다. 담당 직원이 다른 방법을 함께 찾겠습니다.")
    n = len(eligible)
    guide = f"""# [큰글씨 쉬운말 안내장]

### {case['name']} 님께
혼자 감당하지 않으셔도 됩니다. 아래 도움을 받으실 수 있습니다.

{chr(10).join(f"{i + 1}. {t}" for i, t in enumerate(easy))}
{n + 1}. 서류는 담당 직원이 미리 적어 두었습니다. **성함만 적어 주시면** 됩니다.
{n + 2}. 몇 가지는 직원이 더 확인한 뒤 확정됩니다. 결과를 꼭 다시 알려드리겠습니다.

---
### English
Dear **{case['name']}**, based on the 2026 national welfare and tuberculosis guidelines you may receive **{n} kind(s) of support**. Your caseworker has pre-filled the forms. You only need to sign. Some items will be confirmed by the officer first.

### Tiếng Việt
Kính gửi **{case['name']}**, theo hướng dẫn phúc lợi và quản lý lao năm 2026, quý vị có thể nhận **{n} loại hỗ trợ**. Cán bộ đã điền sẵn giấy tờ, quý vị chỉ cần ký tên. Một số mục sẽ được cán bộ xác nhận trước.
"""
    return {"official_report": report, "pre_filled_form": form, "easy_guide": guide}


# ──────────────────────────────────────────────────────────────
# UI
# ──────────────────────────────────────────────────────────────
st.set_page_config(page_title="국민 곁에 ON · 범정부 제도 내비게이션", page_icon="🏛️", layout="wide")
st.markdown(
    """
<style>
  .gc-hero{background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%);color:#fff;padding:22px 26px;border-radius:14px;margin-bottom:18px;}
  .gc-hero .tag{display:inline-block;background:#2563eb;padding:4px 10px;border-radius:6px;font-weight:700;font-size:12px;}
  .gc-hero h1{font-size:26px;font-weight:800;margin:10px 0 4px 0;color:#fff;}
  .gc-hero p{margin:0;color:#cbd5e1;font-size:14px;}
  .gc-hero .meta{margin-top:12px;font-size:12px;color:#86efac;}
  .gc-hero code{background:rgba(255,255,255,.12);color:#e2e8f0;padding:1px 6px;border-radius:4px;}
  .gc-step{font-size:13px;color:#2563eb;font-weight:700;letter-spacing:.5px;margin-bottom:-6px;}
  .gc-quote{border-left:4px solid #94a3b8;background:#f8fafc;padding:8px 12px;margin:6px 0 10px 0;font-size:13.5px;white-space:pre-wrap;color:#0f172a;}
  .gc-foot{color:#94a3b8;font-size:12px;margin-top:28px;}
</style>
""",
    unsafe_allow_html=True,
)

corpus = load_corpus()
rules = json.loads(RULES_PATH.read_text(encoding="utf-8"))
rules_sha = sha16(RULES_PATH)
programs = rules["programs"]
median = rules["median_income_2026"]

if "extra_chunks" not in st.session_state:
    st.session_state["extra_chunks"] = []
    st.session_state["extra_bm25"] = None
    st.session_state["extra_names"] = []

doc_meta = " · ".join(f"{doc_title(corpus, d)} {len(corpus['docs'][d]['pages'])}쪽" for d in corpus["docs"])
st.markdown(
    f"""
<div class="gc-hero">
  <span class="tag">2026 공공 AI 대전환 챌린지 · 세션 1</span>
  <h1>🏛️ 국민 곁에 ON <span style="font-weight:400;font-size:18px;color:#cbd5e1;">Gov-Care Navigator</span></h1>
  <p>보건복지부·질병관리청 지침 원문을 한 번에 대조해, 위기 가구가 받을 수 있는 지원을 조문 근거와 함께 찾아내고 서류까지 준비합니다.</p>
  <div class="meta">📚 투입 원문: {doc_meta} &nbsp;|&nbsp; 🔒 읽기 전용 · 규칙 SHA-256 <code>{rules_sha}</code> &nbsp;|&nbsp; 산출물 격리 <code>output_generated/</code></div>
</div>
""",
    unsafe_allow_html=True,
)

# ── 사이드바
with st.sidebar:
    st.header("⚙️ 문서 생성 엔진")
    default_idx = 0 if secret("UPSTAGE_API_KEY") else 3
    provider = st.selectbox("LLM 제공자", list(PROVIDERS.keys()), index=default_idx)
    cfg = PROVIDERS[provider]
    if cfg is None:
        llm_url, llm_model, llm_key = "", "", ""
        st.caption("LLM 없이 규칙 엔진 결과를 템플릿에 채워 넣습니다. 인터넷·외부 서버 없이 동작합니다.")
    else:
        llm_url = st.text_input("API 주소", value=cfg["url"], placeholder="http://localhost:11434/v1/chat/completions")
        llm_model = st.text_input("모델명", value=cfg["model"], placeholder="gemma2 / exaone / HCX-...")
        key_default = secret("UPSTAGE_API_KEY") if "Upstage" in provider else ""
        llm_key = st.text_input("API 키", value=key_default, type="password", help="Streamlit Cloud에서는 Secrets에 UPSTAGE_API_KEY로 저장하면 자동 입력됩니다.")
        if cfg["needs_key"] and not llm_key:
            st.warning("API 키가 없으면 호출이 실패하고 내장 템플릿으로 대체됩니다.")

    st.divider()
    st.header("📂 지침 추가 투입")
    up = st.file_uploader("PDF·TXT·MD 파일", type=["pdf", "txt", "md"], help="업로드 문서는 '원문 근거 검색' 대상에만 추가됩니다. 판정 규칙은 rules.json에 담당자가 검토 후 등록합니다.")
    if up is not None and up.name not in st.session_state["extra_names"]:
        pages = []
        if up.name.lower().endswith(".pdf"):
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(up.getvalue()))
                for i, pg in enumerate(reader.pages, start=1):
                    t = pg.extract_text() or ""
                    if t.strip():
                        pages.append((i, t))
            except Exception as e:  # noqa: BLE001
                st.error(f"PDF 읽기 실패: {e}")
        else:
            pages = [(1, up.getvalue().decode("utf-8", errors="ignore"))]
        for i, t in pages:
            for c in chunk_page(t):
                st.session_state["extra_chunks"].append({"doc_id": f"UPLOAD::{up.name}", "pdf_page": i, "print_page": i, "text": c})
        st.session_state["extra_bm25"] = build_extra_index(st.session_state["extra_chunks"])
        st.session_state["extra_names"].append(up.name)
        st.toast(f"{up.name} 검색 대상에 추가 ({len(pages)}쪽)")
    if st.session_state["extra_names"]:
        st.caption("추가 문서: " + ", ".join(st.session_state["extra_names"]))

    st.divider()
    with st.expander("📑 투입 원문 출처"):
        for did, d in corpus["docs"].items():
            src = DOC_SOURCES.get(did, {})
            st.markdown(f"**{src.get('title', did)}**  \n{src.get('org', '')}  \n[원문 게시물]({src.get('url', '#')}) · 수집 {src.get('retrieved', '-')}  \n원본 PDF SHA-256 `{d['source_sha256'][:16]}…`")

# ── Step 1
SCENARIOS = {
    "시나리오 ① 위기 독거노인 — 다제내성 결핵 + 당뇨 합병증, 중위소득 60%": {
        "name": "김복동", "age": 74, "region": "서울특별시 중구", "household": "독거노인 1인 가구", "household_size": 1, "income_pct": 60,
        "situation": "74세 독거 어르신으로 최근 다제내성 결핵 확진을 받아 격리 입원이 시급하나, 중증 당뇨 합병증과 생계 곤란(기준중위소득 60%)으로 치료를 포기하려 함. 혼자 거주하며 돌봐줄 가족이 없음.",
    },
    "시나리오 ② 외국인 일용직 근로자 — 골절 + 결핵 의심, 중위소득 70%": {
        "name": "응우옌 반", "age": 42, "region": "경기도 안산시", "household": "다문화 3인 가구", "household_size": 3, "income_pct": 70,
        "situation": "건설 일용직 근로 중 골절상으로 수술·입원이 필요하고 결핵 의심 호흡기 증상도 있어 소득이 전면 중단됨. 외국인 근로자로 한국어 공문서 해독이 어려움.",
    },
}

st.markdown('<p class="gc-step">STEP 1</p>', unsafe_allow_html=True)
st.subheader("상담 사례 입력")
scenario_key = st.radio("시연용 사례를 고르거나 아래 값을 직접 수정하세요.", list(SCENARIOS.keys()))
sc = SCENARIOS[scenario_key]

c1, c2, c3 = st.columns([1.1, 1.2, 2.2])
with c1:
    c_name = st.text_input("민원인 성명", value=sc["name"])
    c_age = st.number_input("연령(만)", value=sc["age"], min_value=1, max_value=120)
    c_hh = st.number_input("가구원 수", value=sc["household_size"], min_value=1, max_value=7)
with c2:
    c_income = st.slider("기준중위소득 비율 (%)", 0, 200, sc["income_pct"])
    med = median[str(min(int(c_hh), 7))]
    st.caption(f"가구원 {int(c_hh)}인 2026 기준중위소득 월 {med:,}원 → 입력 소득 약 **{int(med * c_income / 100):,}원/월**")
    c_region = st.text_input("거주 지자체", value=sc["region"])
with c3:
    c_situation = st.text_area("현장 상담 내용", value=sc["situation"], height=130)

case = {"name": c_name, "age": int(c_age), "region": c_region, "household": sc["household"], "household_size": int(c_hh), "income_pct": int(c_income), "situation": c_situation}

# ── Step 2
results = [evaluate(p, case, corpus) for p in programs]
cross_notes = apply_cross_rules(results, corpus)
extra = (st.session_state["extra_bm25"], st.session_state["extra_chunks"])
passages = {r["program"]["id"]: search(corpus, f"{r['program']['retrieval_query']} {c_situation}", r["program"]["doc_id"], k=3, extra=extra) for r in results}

st.divider()
st.markdown('<p class="gc-step">STEP 2</p>', unsafe_allow_html=True)
st.subheader("범부처 1차 스크리닝 결과 · 원문 근거")
n_ok = sum(r["status"] == "적격 가능" for r in results)
n_link = sum(r["status"] == "연계 검토" for r in results)
n_verify = sum(1 for r in results if r["status"] in ("적격 가능", "연계 검토") for c in r["checks"] if c["status"] == "verify")
m1, m2, m3, m4 = st.columns(4)
m1.metric("대조한 제도", f"{len(programs)}종")
m2.metric("적격 가능", f"{n_ok}종")
m3.metric("연계 검토", f"{n_link}종")
m4.metric("담당자 확인 항목", f"{n_verify}건")

summary_rows = [{
    "소관": r["program"]["ministry"], "제도": r["program"]["program"], "판정": f"{STATUS_ICON[r['status']]} {r['status']}",
    "예상 지원": r["amount"] or ("연계 서비스" if r["status"] == "연계 검토" else "-"),
    "근거 지침": r["program"]["doc_title"],
} for r in results]
st.dataframe(pd.DataFrame(summary_rows), width="stretch", hide_index=True)
if cross_notes:
    for n in cross_notes:
        st.warning(f"제도 간 조정: {n['note']} ({n['cite']})")

for r in results:
    p = r["program"]
    with st.expander(f"{STATUS_ICON[r['status']]} [{p['ministry']}] {p['program']} — {r['status']}", expanded=(r["status"] == "적격 가능")):
        colA, colB = st.columns([1.1, 1.4])
        with colA:
            st.markdown(f"**근거**: {p['doc_title']} · {p['legal_basis']}")
            for c in r["checks"]:
                icon = {"pass": "✅", "fail": "❌", "verify": "🟡"}[c["status"]]
                cite = f" <span style='color:#64748b'>({c['cite']})</span>" if c["cite"] else ""
                st.markdown(f"{icon} **{c['name']}** — {c['detail']}{cite}", unsafe_allow_html=True)
            if r["amount"]:
                st.markdown(f"💰 **예상 지원**: {r['amount']} <span style='color:#64748b'>({r['amount_cite']})</span>", unsafe_allow_html=True)
            if r["status"] in ("적격 가능", "연계 검토"):
                st.markdown("**지원 내용**")
                for b in p["benefits"]:
                    st.markdown(f"- {b['item']}: {b['detail']} <span style='color:#64748b'>({cite_label(corpus, b['cite'], p['doc_id'])})</span>", unsafe_allow_html=True)
                st.markdown("**구비 서식**: " + " / ".join(f["name"] for f in p["forms"]))
        with colB:
            st.markdown("**원문 근거 구절 (BM25 검색 상위)**")
            kws = [k for g in p["trigger_groups"] for k in g if k in c_situation][:6]
            for h in passages[p["id"]]:
                txt = h["text"][:650]
                for k in kws:
                    txt = txt.replace(k, f"〔{k}〕")
                label = f"{doc_title(corpus, h['doc_id']) if not h['doc_id'].startswith('UPLOAD::') else h['doc_id'][8:]} · {h['print_page']}쪽"
                st.markdown(f"<div class='gc-quote'><b>{label}</b>\n{txt}</div>", unsafe_allow_html=True)
            if not passages[p["id"]]:
                st.caption("검색된 구절이 없습니다.")

st.caption("판정 기준: 상담 내용의 지원 사유 키워드 + 소득 비율 + 제외 사유를 지침 조문과 대조한 1차 스크리닝입니다. 최종 결정은 담당 공무원의 조사·심의에 따릅니다.")

# ── Step 3
st.markdown('<p class="gc-step">STEP 3</p>', unsafe_allow_html=True)
st.subheader("행정 산출물 3종 생성")
if st.button("기안문 · 사전기입 신청서 · 쉬운말/다국어 안내장 생성", type="primary", width="stretch"):
    t0 = time.time()
    context = build_context(case, results, cross_notes, passages, corpus)
    with st.spinner("문서 생성 중…"):
        outputs, engine_label, warnings = generate_documents(provider, llm_url, llm_model, llm_key, context)
    if not outputs:
        outputs = template_documents(case, results, cross_notes, corpus)
    elapsed = time.time() - t0

    tabs = st.tabs(["📄 ① 검토보고(기안문)", "✍️ ② 사전기입 신청서", "🌏 ③ 쉬운말·다국어 안내장", "🔎 ④ 생성 근거·감사 로그"])
    for (key, _), tab in zip(DOC_SPECS.items(), tabs[:3]):
        with tab:
            st.info(f"생성 엔진: {engine_label} · {elapsed:.1f}초")
            for w in warnings:
                st.warning(w)
            st.markdown(outputs[key])

    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = re.sub(r"[^0-9A-Za-z가-힣_-]+", "_", c_name).strip("_") or "민원인"
    saved = OUTPUT_DIR / f"통합지원패키지_{safe_name}_{ts}.md"
    saved.write_text("\n\n---\n\n".join(outputs.values()), encoding="utf-8")
    zbuf = io.BytesIO()
    with zipfile.ZipFile(zbuf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"01_검토보고_{safe_name}.md", outputs["official_report"])
        zf.writestr(f"02_사전기입_신청서_{safe_name}.md", outputs["pre_filled_form"])
        zf.writestr(f"03_쉬운말_다국어_안내장_{safe_name}.md", outputs["easy_guide"])
        zf.writestr("00_생성근거_context.txt", context)

    with tabs[3]:
        st.success("원문 읽기 전용 보호 · 근거 추적 가능")
        st.json({
            "engine": engine_label,
            "provider": provider,
            "rules_sha256_16": rules_sha,
            "corpus": {did: {"pages": len(d["pages"]), "source_pdf_sha256": d["source_sha256"], "json_sha256_16": d["file_sha16"]} for did, d in corpus["docs"].items()},
            "results": {r["program"]["id"]: r["status"] for r in results},
            "passages_used": {pid: [f"{h['doc_id']} p{h['print_page']}" for h in hits] for pid, hits in passages.items()},
            "output_file": str(saved.relative_to(BASE_DIR)),
            "elapsed_sec": round(elapsed, 2),
        })
        with st.expander("LLM에 전달된 컨텍스트 전문"):
            st.code(context, language="markdown")

    st.download_button("📦 산출물 3종 + 생성근거 ZIP 다운로드", data=zbuf.getvalue(), file_name=f"국민곁에ON_{safe_name}_{ts}.zip", mime="application/zip", width="stretch")

st.markdown(
    '<p class="gc-foot">※ 투입 지침은 보건복지부·질병관리청이 공개한 2026년 원문이며, 판정은 1차 스크리닝입니다. 실제 지원 여부는 소관 기관의 조사·심의로 확정됩니다.</p>',
    unsafe_allow_html=True,
)
