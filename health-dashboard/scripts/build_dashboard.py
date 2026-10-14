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
    # 검색·공유 기본 파일(health-profile.kr 루트에만): 카톡·검색 미리보기 그림, robots.txt, sitemap.xml
    if (ROOT / "og.jpg").exists():
        shutil.copy2(ROOT / "og.jpg", MIRROR / "og.jpg")
    site = "https://health-profile.kr"
    (MIRROR / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {site}/sitemap.xml\n", encoding="utf-8")
    from datetime import datetime, timedelta, timezone
    from urllib.parse import quote
    today = (datetime.now(timezone.utc) + timedelta(hours=9)).strftime("%Y-%m-%d")
    pages = ["/", "/solve/", "/global/", "/global/methodology/"]
    pages += ["/docs/" + quote(f) for f in ("지역건강프로파일_대시보드_사용설명서_v1.pdf", "health-profile.kr_활용법_v1.pdf") if (ROOT / "docs" / f).exists()]
    urls = "".join(f"  <url><loc>{site}{p}</loc><lastmod>{today}</lastmod></url>\n" for p in pages)
    (MIRROR / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n', encoding="utf-8")
    # 외부 AI·검토자용 코드 묶음(health-profile.kr/code/…zip): git 이 추적하는 공개 파일만(=GitHub 공개 저장소와 같은 내용).
    # 영상·PDF·pptx·이미지·대용량 데이터 제외, private/·.env·data/kdh 는 애초에 추적되지 않음. sitemap 에는 넣지 않는다.
    import subprocess as _sp, zipfile
    keep = ("app/src/", "app/tests/", "scripts/", "docs/", "global/src/", "global/methodology/")
    files = ["CLAUDE.md", "app/package.json", "app/vite.config.js", "app/index.html", "global/index.html", "solve/template.html",
             "data/directions.json", "data/validation_summary.json", "data/competition_evidence.json", "data/refs.json",
             "data/coverage.json", "data/reviews.json", "data/contact.json"]
    tracked = _sp.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.splitlines()
    pick = sorted(set(f for f in tracked if (f in files or (f.startswith(keep) and not (f.startswith("docs/") and not f.endswith(".md"))))
                      and not f.lower().endswith((".jpg", ".png", ".mp4", ".pptx", ".pdf"))))
    assert not any(p.startswith(("private/", "data/kdh/")) or p.endswith(".env") for p in pick), "비공개 경로가 묶음에 섞임"
    (MIRROR / "code").mkdir(exist_ok=True)
    zpath = MIRROR / "code" / "health-dashboard_code_for_review.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for f in pick:
            z.write(ROOT / f, f)
    print(f"코드 묶음: {zpath.name} {len(pick)}개 파일 {zpath.stat().st_size // 1024}KB")
    print(f"거울 배포: {MIRROR / 'index.html'} + docs/ {len(list((MIRROR / 'docs').iterdir()))}개 + solve/")
else:
    print(f"거울 배포 생략: {MIRROR} 없음")
