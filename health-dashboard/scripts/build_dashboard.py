# -*- coding: utf-8 -*-
"""
대시보드 v2 빌드: data/dashboard_data.json 을 v2 템플릿에 주입해
health-dashboard/index.html 을 생성한다.

사용법: python scripts/build_dashboard.py
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
data_path = ROOT / "data" / "dashboard_data.json"
tpl_path = ROOT / "prototype" / "dashboard_v2_template.html"
out_path = ROOT / "index.html"

if not data_path.exists():
    sys.exit("data/dashboard_data.json 없음 — 먼저 scripts/kosis_fetch_core.py 실행")

data = json.loads(data_path.read_text(encoding="utf-8"))

# 간단한 무결성 확인: 지표별 시도 17개, 연도-값 길이 일치
for name, d in data["indicators"].items():
    assert len(d["sido"]) == 17, f"{name}: 시도 {len(d['sido'])}개"
    n = len(d["years"])
    assert len(d["national"]) == n, f"{name}: national 길이 불일치"
    for s, vals in d["sido"].items():
        assert len(vals) == n, f"{name}/{s}: 길이 불일치"

html = tpl_path.read_text(encoding="utf-8")
html = html.replace("__DATA__", json.dumps(data, ensure_ascii=False))
html = html.replace("__GENERATED__", data.get("generated", ""))
out_path.write_text(html, encoding="utf-8")
print(f"생성: {out_path} ({out_path.stat().st_size:,} bytes)")
