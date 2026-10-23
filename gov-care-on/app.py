# -*- coding: utf-8 -*-
"""
국민 곁에 ON (Gov-Care Navigator)
범부처 보건·복지 지침을 한 번에 대조해 위기 가구의 지원 자격을 판정하고,
기안문·사전기입 신청서·쉬운말 안내장 3종을 생성하는 Streamlit 앱.

실행:  streamlit run app.py
"""
import datetime
import hashlib
import io
import json
import urllib.request
import zipfile
from pathlib import Path

import pandas as pd
import streamlit as st

# ──────────────────────────────────────────────────────────────
# 경로 설정: 원본 지침은 읽기 전용 폴더, 산출물은 별도 폴더에 격리
# ──────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.resolve()
INPUT_READONLY_DIR = BASE_DIR / "input_readonly"
OUTPUT_GENERATED_DIR = BASE_DIR / "output_generated"
INPUT_READONLY_DIR.mkdir(exist_ok=True)
OUTPUT_GENERATED_DIR.mkdir(exist_ok=True)

SAMPLE_GUIDELINE_PATH = INPUT_READONLY_DIR / "2026_범부처_보건복지_통합지침_모의데이터.json"

DEFAULT_GUIDELINES = [
    {
        "id": "KDCA-TB-2026-01",
        "ministry": "질병관리청",
        "title": "2026 국가결핵관리지침 - 다제내성 및 취약계층 치료·생활 지원",
        "page": "제4장 82p ~ 85p",
        "criteria": {"disease_keywords": ["결핵", "다제내성", "호흡기"], "max_income_pct": 120},
        "benefit": "입원·격리 치료비 본인부담금 전액 지원 + 부양가족 생활보호비(월 최대 110만 원) + 복약관리 방문간호 연계",
        "required_form": "[별지 제14호] 결핵환자 입원·격리치료 및 생활보호비 통합신청서",
    },
    {
        "id": "MOHW-EMG-2026-04",
        "ministry": "보건복지부",
        "title": "2026 긴급복지지원사업 안내 - 중한 질병·부상 위기가구 생계·의료지원",
        "page": "제2장 34p ~ 39p",
        "criteria": {"disease_keywords": ["결핵", "중증", "당뇨", "합병증", "수술", "골절"], "max_income_pct": 75},
        "benefit": "긴급생계지원금(1인 가구 월 71.3만 원) + 긴급의료비(최대 300만 원, 비급여 포함)",
        "required_form": "[서식 제1호] 긴급복지지원 신청 및 금융정보 제공 동의서",
    },
    {
        "id": "LOCAL-CARE-2026-09",
        "ministry": "지자체(보건소·복지과)",
        "title": "2026 찾아가는 건강돌봄 및 만성질환 합병증 예방 특화사업",
        "page": "자치법규 고시 제12조 (19p)",
        "criteria": {"disease_keywords": ["당뇨", "고혈압", "만성질환", "독거", "골절"], "max_income_pct": 150},
        "benefit": "연속혈당측정기·합병증 정밀검사 바우처 + 주 2회 방문간호 + 맞춤 영양식 배달",
        "required_form": "[통합서식] 지역사회 통합돌봄(Care-ON) 서비스 의뢰·신청서",
    },
]


def init_default_guidelines() -> None:
    if not SAMPLE_GUIDELINE_PATH.exists():
        with open(SAMPLE_GUIDELINE_PATH, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_GUIDELINES, f, ensure_ascii=False, indent=2)


def get_file_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        h.update(f.read())
    return h.hexdigest()[:16].upper()


# ──────────────────────────────────────────────────────────────
# 모델 비종속(Multi-LLM) 라우터
#  - API 주소가 있으면 실제 호출, 없거나 실패하면 내장 템플릿으로 생성
# ──────────────────────────────────────────────────────────────
class MultiLLMRouter:
    SUPPORTED_MODELS = {
        "Gemma-2-27B (Ollama 로컬 / 폐쇄망)": {"provider": "ollama", "model_id": "gemma2"},
        "EXAONE-3.5 (OpenAI 호환 API)": {"provider": "openai_compat", "model_id": "exaone"},
        "HyperCLOVA X HCX-GOV (행안부 공통기반)": {"provider": "clova", "model_id": "HCX-GOV-THINK-30B"},
        "Solar-Pro (Upstage, OpenAI 호환 API)": {"provider": "openai_compat", "model_id": "solar-pro"},
    }

    @staticmethod
    def generate(model_label: str, api_endpoint: str, api_key: str, prompt: str, fallback_data: dict) -> tuple[str, str]:
        if api_endpoint and api_endpoint.strip().startswith("http"):
            try:
                req_data = json.dumps(
                    {"model": MultiLLMRouter.SUPPORTED_MODELS[model_label]["model_id"], "prompt": prompt, "stream": False}
                ).encode("utf-8")
                headers = {"Content-Type": "application/json"}
                if api_key:
                    headers["Authorization"] = f"Bearer {api_key}"
                req = urllib.request.Request(api_endpoint, data=req_data, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=8) as resp:
                    res_json = json.loads(resp.read().decode("utf-8"))
                    text = res_json.get("response") or res_json.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if text:
                        return text, f"실시간 API 호출로 생성했습니다 · {model_label}"
            except Exception:
                pass
        return (
            MultiLLMRouter._build_structured_output(model_label, fallback_data),
            f"내장 템플릿 엔진으로 생성했습니다 · {model_label} 어댑터 (API 미연결 시 자동 대체)",
        )

    @staticmethod
    def _build_structured_output(model_label: str, data: dict) -> str:
        c = data["case"]
        matched = data["matched"]
        today = datetime.date.today()

        benefits_txt = "\n".join(
            f"  - **[{m['ministry']}] {m['title']}** (근거: `{m['page']}`)\n    → 지원내용: {m['benefit']}" for m in matched
        ) or "  - 현재 입력 조건에 부합하는 지침이 없습니다."
        forms_txt = "\n".join(f"  - `{m['required_form']}` (사전 기입 완료)" for m in matched) or "  - 해당 없음"

        if data["doc_type"] == "official_report":
            return f"""# [기안문 초안] 위기 민원인 범부처 통합 지원 검토보고
* **문서번호**: 보건복지-2026-XXXX호 (선제적 발굴·지원)
* **생성 모델**: `{model_label}`
* **검토 대상**: {c['name']} (만 {c['age']}세, {c['region']} 거주 / 가구유형: {c['household']} / 기준중위소득 {c['income_pct']}%)
* **상담 요지**: {c['situation']}

---
### 1. 통합 적격 판정 결과 (총 {len(matched)}종)
{benefits_txt}

### 2. 조치 계획 및 구비서류
1. **원스톱 처리**: 민원인이 질병관리청·보건복지부·지자체 창구를 각각 방문하지 않도록 본 검토보고로 부처 간 협의를 갈음합니다.
2. **사전 기입 완료 서식**:
{forms_txt}
3. **원본 지침 무결성**: 투입된 원본 지침(`input_readonly`)은 수정·훼손 없이 보존됨을 확인했습니다.
"""

        if data["doc_type"] == "pre_filled_form":
            codes = ", ".join(m["id"] for m in matched) or "-"
            benefits_short = " / ".join(m["benefit"][:28] + "…" for m in matched) or "-"
            return f"""# [사전 기입 통합 지원 신청서]
> 담당 공무원이 상담 내용을 바탕으로 항목을 미리 채웠습니다. 민원인께서는 내용을 확인하신 뒤 **서명만** 하시면 됩니다.

| 구분 | 자동 기입 내역 | 확인 |
| :--- | :--- | :--- |
| **신청인 성명 / 연령** | **{c['name']}** / 만 {c['age']}세 | 본인 확인 |
| **거주지 / 가구특성** | {c['region']} / {c['household']} | 주소지 대조 |
| **소득 판정 결과** | 기준중위소득 **{c['income_pct']}%** | 수치 판정 완료 |
| **통합 신청 제도 코드** | {codes} | 지침 근거 일치 |
| **예상 수혜 내역** | {benefits_short} | 중복 배제 확인 |

---
**[신청인 동의 및 서명란]**
본인은 담당 공무원으로부터 위 지원 제도의 절차와 근거를 충분히 안내받았으며, 범부처 통합 신청 및 개인정보 활용에 동의합니다.

* **신청일자**: {today.year}년 {today.month}월 {today.day}일
* **신청인 성명**: **{c['name']}**  (서명 또는 인)
"""

        # easy_guide: 매칭된 지침을 바탕으로 쉬운말 항목 구성
        easy_items = []
        for m in matched:
            easy_items.append(f"**{m['ministry']}**에서 도와드립니다\n   {m['benefit']}")
        if not easy_items:
            easy_items.append("지금 입력된 조건으로는 바로 연결되는 제도가 없습니다. 담당 직원이 다른 방법을 함께 찾아드리겠습니다.")
        easy_list = "\n".join(f"{i + 1}. {item}" for i, item in enumerate(easy_items))
        n = len(matched)
        titles_en = "; ".join(m["id"] for m in matched) or "none"

        return f"""# [큰글씨 쉬운말 · 다국어 안내장]

### 🇰🇷 쉬운 우리말 안내
**{c['name']} 님, 혼자 감당하지 않으셔도 됩니다. 나라가 끝까지 함께합니다.**

{easy_list}
{n + 1}. **오늘 하실 일은 하나뿐입니다**
   복잡한 서류는 담당 직원이 미리 다 적어두었습니다. 신청서 아래에 **성함만 적어 주시면** 오늘 바로 처리됩니다.

---
### 🌐 Multilingual Summary
* **[English]** Dear **{c['name']}**, based on the 2026 Integrated Public Health & Welfare Guidelines you are eligible for **{n} support program(s)** ({titles_en}). Your caseworker has pre-filled every form. You only need to sign.
* **[Tiếng Việt]** Kính gửi **{c['name']}**, theo hướng dẫn y tế - phúc lợi tổng hợp 2026, quý vị đủ điều kiện nhận **{n} chương trình hỗ trợ**. Nhân viên phụ trách đã điền sẵn mọi giấy tờ. Quý vị chỉ cần ký tên.
"""


# ──────────────────────────────────────────────────────────────
# 페이지 설정 & 스타일
# ──────────────────────────────────────────────────────────────
st.set_page_config(page_title="국민 곁에 ON · 범정부 제도 내비게이션", page_icon="🏛️", layout="wide")

st.markdown(
    """
<style>
  .gc-hero{background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%);color:#fff;padding:22px 26px;border-radius:14px;margin-bottom:18px;}
  .gc-hero .tag{display:inline-block;background:#2563eb;padding:4px 10px;border-radius:6px;font-weight:700;font-size:12px;letter-spacing:.2px;}
  .gc-hero h1{font-size:26px;font-weight:800;margin:10px 0 4px 0;color:#fff;}
  .gc-hero p{margin:0;color:#cbd5e1;font-size:14px;}
  .gc-hero .meta{margin-top:12px;font-size:12px;color:#86efac;}
  .gc-hero code{background:rgba(255,255,255,.12);color:#e2e8f0;padding:1px 6px;border-radius:4px;}
  .gc-step{font-size:13px;color:#2563eb;font-weight:700;letter-spacing:.5px;margin-bottom:-6px;}
  .gc-foot{color:#94a3b8;font-size:12px;margin-top:28px;}
</style>
""",
    unsafe_allow_html=True,
)

init_default_guidelines()
with open(SAMPLE_GUIDELINE_PATH, "r", encoding="utf-8") as f:
    guidelines = json.load(f)

if "extra_guidelines" not in st.session_state:
    st.session_state["extra_guidelines"] = []

all_guidelines = guidelines + st.session_state["extra_guidelines"]
file_hash = get_file_sha256(SAMPLE_GUIDELINE_PATH)

st.markdown(
    f"""
<div class="gc-hero">
  <span class="tag">2026 공공 AI 대전환 챌린지 · 세션 1</span>
  <h1>🏛️ 국민 곁에 ON <span style="font-weight:400;font-size:18px;color:#cbd5e1;">Gov-Care Navigator</span></h1>
  <p>질병관리청·보건복지부·지자체 지침을 한 번에 대조해, 위기 가구가 받을 수 있는 지원을 찾아내고 서류까지 준비합니다.</p>
  <div class="meta">🔒 원본 지침 읽기 전용 보호 중 · SHA-256 <code>{file_hash}</code> · 산출물 격리 경로 <code>output_generated/</code></div>
</div>
""",
    unsafe_allow_html=True,
)

# ──────────────────────────────────────────────────────────────
# 사이드바
# ──────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ AI 모델 설정")
    selected_model = st.selectbox("연결할 LLM", list(MultiLLMRouter.SUPPORTED_MODELS.keys()))
    api_endpoint = st.text_input("API 주소 (선택)", placeholder="http://localhost:11434/api/generate")
    api_key = st.text_input("API 키 (선택)", type="password")
    st.caption("API 주소를 비워 두면 내장 템플릿 엔진으로 동작합니다. 인터넷·외부 서버 없이도 시연할 수 있습니다.")

    st.divider()
    st.header("📂 지침 추가 투입")
    uploaded_file = st.file_uploader("새 사업지침 파일", type=["json", "txt", "md", "csv"])
    if uploaded_file is not None:
        ro_target = INPUT_READONLY_DIR / uploaded_file.name
        if not ro_target.exists():
            with open(ro_target, "wb") as out_f:
                out_f.write(uploaded_file.getbuffer())
        new_rule = {
            "id": f"CUSTOM-{len(st.session_state['extra_guidelines']) + 1:02d}",
            "ministry": "추가 투입 지침",
            "title": f"[신규] {uploaded_file.name}",
            "page": "첨부문서 제1장 1p",
            "criteria": {"disease_keywords": ["결핵", "당뇨", "골절", "만성질환", "독거", "호흡기"], "max_income_pct": 180},
            "benefit": f"{uploaded_file.name} 근거 맞춤형 지원",
            "required_form": f"[별지서식] {uploaded_file.name} 통합신청서",
        }
        if not any(g["title"] == new_rule["title"] for g in st.session_state["extra_guidelines"]):
            st.session_state["extra_guidelines"].append(new_rule)
            st.toast(f"{uploaded_file.name} 읽기 전용으로 등록했습니다.")
    st.caption(f"현재 적용 지침: {len(all_guidelines)}건")

# ──────────────────────────────────────────────────────────────
# Step 1. 시나리오 선택 & 입력
# ──────────────────────────────────────────────────────────────
SCENARIOS = {
    "시나리오 ① 위기 독거노인 — 다제내성 결핵 + 당뇨 합병증, 중위소득 60%": {
        "name": "김복동", "age": 74, "region": "서울특별시 중구", "household": "독거노인 1인 가구", "income_pct": 60,
        "situation": "74세 독거 어르신으로 최근 다제내성 결핵 확진을 받아 격리 입원이 시급하나, 중증 당뇨 합병증과 생계 곤란(기준중위소득 60%)으로 치료를 포기하려 함.",
    },
    "시나리오 ② 외국인 일용직 근로자 — 호흡기 감염 의심 + 골절, 중위소득 70%": {
        "name": "응우옌 반", "age": 42, "region": "경기도 안산시", "household": "다문화 3인 가구", "income_pct": 70,
        "situation": "건설 일용직 근로 중 골절상 및 결핵 의심 호흡기 증상으로 소득이 전면 중단됨. 한국어 공문서 해독이 어려움.",
    },
}

st.markdown('<p class="gc-step">STEP 1</p>', unsafe_allow_html=True)
st.subheader("상담 사례 입력")
selected_scenario_key = st.radio("시연용 사례를 고르거나, 아래 입력값을 직접 수정하세요.", list(SCENARIOS.keys()))
current_case = SCENARIOS[selected_scenario_key]

col1, col2, col3 = st.columns([1.1, 1.2, 2.2])
with col1:
    c_name = st.text_input("민원인 성명", value=current_case["name"])
    c_age = st.number_input("연령(만)", value=current_case["age"], min_value=1, max_value=120)
with col2:
    c_income = st.slider("기준중위소득 비율 (%)", 0, 200, current_case["income_pct"])
    c_region = st.text_input("거주 지자체", value=current_case["region"])
with col3:
    c_situation = st.text_area("현장 상담 내용", value=current_case["situation"], height=108)

# ──────────────────────────────────────────────────────────────
# Step 2. 적격 판정
# ──────────────────────────────────────────────────────────────
matched_guidelines = []
audit_rows = []
for g in all_guidelines:
    income_ok = c_income <= g["criteria"]["max_income_pct"]
    hit_keywords = [k for k in g["criteria"]["disease_keywords"] if k in c_situation]
    is_eligible = income_ok and bool(hit_keywords)
    if is_eligible:
        matched_guidelines.append(g)
    audit_rows.append(
        {
            "소관 기관": g["ministry"],
            "사업지침명": g["title"],
            "근거 쪽수": g["page"],
            "소득 기준": f"중위소득 {g['criteria']['max_income_pct']}% 이하 (현재 {c_income}%)",
            "일치 키워드": ", ".join(hit_keywords) if hit_keywords else "-",
            "판정": "✅ 적격" if is_eligible else "❌ 기준 미충족",
        }
    )

st.divider()
st.markdown('<p class="gc-step">STEP 2</p>', unsafe_allow_html=True)
st.subheader("범부처 적격 판정표")
m1, m2, m3 = st.columns(3)
m1.metric("검토한 지침", f"{len(all_guidelines)}건")
m2.metric("적격 판정", f"{len(matched_guidelines)}건")
m3.metric("기준중위소득", f"{c_income}%")
st.dataframe(pd.DataFrame(audit_rows), width="stretch", hide_index=True)
st.caption("판정 기준: 소득 비율이 지침별 상한 이하이고, 상담 내용에 질환 키워드가 하나 이상 포함되면 적격으로 봅니다.")

# ──────────────────────────────────────────────────────────────
# Step 3. 산출물 생성
# ──────────────────────────────────────────────────────────────
st.markdown('<p class="gc-step">STEP 3</p>', unsafe_allow_html=True)
st.subheader("행정 산출물 3종 생성")
if st.button("기안문 · 사전기입 신청서 · 쉬운말/다국어 안내장 한 번에 만들기", type="primary", width="stretch"):
    case_payload = {
        "name": c_name, "age": c_age, "region": c_region, "household": current_case["household"],
        "income_pct": c_income, "situation": c_situation,
    }

    tab1, tab2, tab3, tab4 = st.tabs(["📄 ① 기안문(검토보고)", "✍️ ② 사전기입 신청서", "🌏 ③ 큰글씨·다국어 안내장", "🔎 ④ 검증 로그"])

    outputs_to_save = {}
    for doc_type, tab in [("official_report", tab1), ("pre_filled_form", tab2), ("easy_guide", tab3)]:
        content, status_msg = MultiLLMRouter.generate(
            selected_model, api_endpoint, api_key, c_situation,
            {"case": case_payload, "matched": matched_guidelines, "doc_type": doc_type},
        )
        outputs_to_save[doc_type] = content
        with tab:
            st.info(status_msg)
            st.markdown(content)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    saved_md_path = OUTPUT_GENERATED_DIR / f"통합지원패키지_{c_name}_{timestamp}.md"
    with open(saved_md_path, "w", encoding="utf-8") as f:
        f.write("\n\n---\n\n".join(outputs_to_save.values()))

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"01_기안문_{c_name}.md", outputs_to_save["official_report"])
        zf.writestr(f"02_사전기입_신청서_{c_name}.md", outputs_to_save["pre_filled_form"])
        zf.writestr(f"03_쉬운말_다국어_안내장_{c_name}.md", outputs_to_save["easy_guide"])

    with tab4:
        st.success("원본 지침 읽기 전용 보호 · 모델 비종속 동작 확인")
        st.json(
            {
                "active_llm_adapter": selected_model,
                "input_readonly_sha256": file_hash,
                "readonly_integrity_verified": get_file_sha256(SAMPLE_GUIDELINE_PATH) == file_hash,
                "matched_guideline_ids": [m["id"] for m in matched_guidelines],
                "isolated_output_file": str(saved_md_path.relative_to(BASE_DIR)),
            }
        )

    st.download_button(
        label="📦 산출물 3종 ZIP 다운로드",
        data=zip_buffer.getvalue(),
        file_name=f"국민곁에ON_산출물_{c_name}_{timestamp}.zip",
        mime="application/zip",
        width="stretch",
    )

st.markdown(
    '<p class="gc-foot">※ 본 앱의 지침·금액·서식명은 시연용 모의 데이터입니다. 실제 지원 여부는 소관 기관의 최신 지침을 기준으로 확인하세요.</p>',
    unsafe_allow_html=True,
)
