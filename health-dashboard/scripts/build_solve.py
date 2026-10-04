# -*- coding: utf-8 -*-
"""
/solve 영문 랜딩(정적, 앱 데이터 없음)을 만든다: solve/template.html + data/validation_summary.json → solve/index.html
숫자는 손으로 쓰지 않고 scripts/qa/data_validation.mjs 가 실제 데이터에서 센 값만 넣는다.
사용법: python scripts/build_solve.py   (build_dashboard.py 가 빌드 전에 호출)
"""
import html, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VS = json.loads((ROOT / "data" / "validation_summary.json").read_text(encoding="utf-8"))
REV = json.loads((ROOT / "data" / "reviews.json").read_text(encoding="utf-8"))
CONTACT = json.loads((ROOT / "data" / "contact.json").read_text(encoding="utf-8"))

R, I, Y = VS["regions"], VS["indicators"], VS["years"]
src = I["by_source"]
ROWS = [
    ("chs", "Korea Disease Control and Prevention Agency (KDCA) — Korea Community Health Survey, via KOSIS",
     "Health behaviours, chronic-disease management, prevention, mental and oral health; survey-weighted rates with standard errors (used for confidence intervals)"),
    ("mort", "Statistics Korea — Cause-of-death statistics", "Age-standardized mortality by cause"),
    ("cancer", "National Health Insurance Service (NHIS) — National cancer screening statistics", "Cancer screening rates (people screened ÷ people eligible)"),
    ("nhis", "National Health Insurance Service (NHIS) — health insurance, health screening and medical-use statistics", "Screening, medical use and health-workforce context"),
    ("inf", "KDCA — Notifiable infectious disease reports", "Infectious disease incidence"),
    ("pop", "Statistics Korea, Ministry of the Interior and Safety and others", "Population, social and economic context"),
    ("env", "Ministry of Environment, Ministry of Land, Infrastructure and Transport, Korea Road Traffic Authority and others", "Environment and safety context"),
    ("hle", "Derived in this project from Statistics Korea life tables and the Community Health Survey", "Healthy life expectancy (approximation, not an official statistic)"),
    ("dep", "Derived in this project from the Population and Housing Census (2015, 2020)", "Area deprivation index (approximation) — socioeconomic context"),
]
rows = "".join(
    f"<tr><td>{html.escape(name)}</td><td>{html.escape(role)}</td><td>{src[k]}</td></tr>"
    for k, name, role in ROWS if src.get(k)
)
missing = [k for k in src if k not in {r[0] for r in ROWS}]
assert not missing, f"출처 설명이 없는 자료원: {missing}"

pub = [r for r in REV.get("reviews", []) if r.get("status") != "withdrawn"]
if pub:
    review = f"Independent reviews published: {len(pub)} (listed on the Sources tab of the app)."
elif REV.get("pending", {}).get("active"):
    review = "External review requests have been sent; no reviews have been published yet."
else:
    review = "No external reviews have been published yet."

n_years = Y["last"] - Y["first"] + 1
jsonld = {
    "@context": "https://schema.org", "@type": "WebApplication", "name": "Health Equity Radar",
    "url": "https://health-profile.kr/solve/", "applicationCategory": "HealthApplication", "operatingSystem": "Web browser",
    "inLanguage": ["en", "ko"], "isAccessibleForFree": True,
    "description": "A working prototype that transforms official Korean local health data into health equity priorities, interpretation, and evidence-informed public-health action.",
    "spatialCoverage": "Republic of Korea",
    "temporalCoverage": f"{Y['first']}/{Y['last']}",
}
rep = {
    "{{JSONLD}}": json.dumps(jsonld, ensure_ascii=False),
    "{{N_IND}}": str(I["total"]), "{{N_SURVEY}}": str(I["survey"]), "{{N_ADMIN}}": str(I["municipality_level"]),
    "{{N_HC}}": str(R["survey_units"]), "{{N_SGG}}": str(R["municipalities_active"]),
    "{{Y0}}": str(Y["first"]), "{{Y1}}": str(Y["last"]), "{{N_YEARS}}": str(n_years),
    "{{VERIFIED}}": VS["generated"], "{{SOURCE_ROWS}}": rows, "{{REVIEW_STATUS}}": html.escape(review),
    "{{EMAIL}}": html.escape(CONTACT["email"]), "{{CREDIT}}": html.escape(CONTACT.get("credit", {}).get("org", "the developer")),
}
out = (ROOT / "solve" / "template.html").read_text(encoding="utf-8")
for k, v in rep.items():
    out = out.replace(k, v)
assert "{{" not in out, "치환 안 된 자리표시자가 남음"
(ROOT / "solve" / "index.html").write_text(out, encoding="utf-8")
print(f"solve/index.html {len(out.encode('utf-8')):,} bytes · 지표 {I['total']} · 조사 단위 {R['survey_units']} · 시군구 {R['municipalities_active']} · {Y['first']}–{Y['last']}")
