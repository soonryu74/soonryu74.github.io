# -*- coding: utf-8 -*-
"""
대시보드 빌드 진입점: React(Vite) 앱을 빌드해 health-dashboard/index.html 을 갱신한다.

파이프라인:  scripts/kosis_fetch_core.py  →  data/dashboard_data.json
             scripts/build_dashboard.py   →  app/ 빌드 → index.html (단일 파일)

사용법: python scripts/build_dashboard.py   (최초 1회 app/ 에서 npm install 필요)
"""
import json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
data_path = ROOT / "data" / "dashboard_data.json"
app = ROOT / "app"

if not data_path.exists():
    sys.exit("data/dashboard_data.json 없음 — 먼저 scripts/kosis_fetch_core.py 실행")
if not (app / "node_modules").exists():
    sys.exit("app/node_modules 없음 — 먼저  cd app && npm install")

# 참고문헌 목록(data/refs.json)은 자료원 카드(coverage.json)의 갱신일을 쓰므로 빌드 때마다 새로 만든다
subprocess.run([sys.executable, str(ROOT / "scripts" / "build_refs.py")], check=True)
# 숫자 전수 검증(data/validation_summary.json · docs/DATA_VALIDATION.md) → /solve 랜딩 생성. 영문 소개·/solve 는 이 숫자만 쓴다
subprocess.run(["node", str(ROOT / "scripts" / "qa" / "data_validation.mjs")], check=True, stdout=subprocess.DEVNULL)
# Global Health Equity Radar(/global/, World Bank WDI) — 파생 데이터 생성·원본 전수 대조·JS 묶기
subprocess.run([sys.executable, str(ROOT / "scripts" / "build_global.py")], check=True)
# 공모전 증거 묶음(docs/COMPETITION_EVIDENCE.md · MIT_SOLVE_CRITERIA_MAP.md · data/competition_evidence.json) — 실제 데이터·점검 기록에서 계산, 금지 표현이 있으면 중단
subprocess.run(["node", str(ROOT / "scripts" / "build_competition_evidence.mjs")], check=True)
subprocess.run([sys.executable, str(ROOT / "scripts" / "build_solve.py")], check=True)

# 데이터 무결성 확인: 지표별 시도 17개, 연도-값 길이 일치
data = json.loads(data_path.read_text(encoding="utf-8"))
for name, d in data["indicators"].items():
    assert len(d["sido"]) == 17, f"{name}: 시도 {len(d['sido'])}개"
    n = len(d["years"])
    assert len(d["national"]) == n, f"{name}: national 길이 불일치"
    for s, vals in d["sido"].items():
        assert len(vals) == n, f"{name}/{s}: 길이 불일치"

subprocess.run(["npm", "run", "build"], cwd=app, check=True)
out = ROOT / "index.html"
print(f"생성: {out} ({out.stat().st_size:,} bytes)")

# health-profile.kr 저장소가 옆에 클론돼 있으면 같은 산출물을 거울 배포
# (GitHub Pages는 저장소당 커스텀 도메인 1개만 받으므로 전용 저장소를 따로 둔다)
MIRROR = ROOT.parent.parent / "health-profile"
if (MIRROR / ".git").exists():
    (MIRROR / "index.html").write_bytes(out.read_bytes())
    (MIRROR / "CNAME").write_text("health-profile.kr\n", encoding="utf-8")
    # docs(방법론 md·설명서·활용법 pptx/pdf·소개 영상 mp4)도 함께 복사 → health-profile.kr/docs/... 로 열린다
    import shutil
    shutil.copytree(ROOT / "docs", MIRROR / "docs", dirs_exist_ok=True)
    # 영문 랜딩 health-profile.kr/solve (정적 페이지 + 실제 화면 캡처, scripts/build_solve.py)
    if (ROOT / "solve").exists():
        shutil.copytree(ROOT / "solve", MIRROR / "solve", dirs_exist_ok=True, ignore=shutil.ignore_patterns("template.html"))
    if (ROOT / "global").exists():  # health-profile.kr/global (src/ 는 원본 소스라 제외)
        shutil.copytree(ROOT / "global", MIRROR / "global", dirs_exist_ok=True, ignore=shutil.ignore_patterns("src"))
    print(f"거울 배포: {MIRROR / 'index.html'} + docs/ {len(list((MIRROR / 'docs').iterdir()))}개 + solve/")
else:
    print(f"거울 배포 생략: {MIRROR} 없음")
