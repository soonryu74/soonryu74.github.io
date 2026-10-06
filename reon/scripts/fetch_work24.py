#!/usr/bin/env python3
r"""고용24 OPEN-API 수집 스크립트 (구조) — 다시ON AI

브라우저에서 API 를 직접 부르지 않기 위해, 이 스크립트가 서버(GitHub Actions)에서 수집해
reon/data/cache/training.json, reon/data/cache/openings.json 을 만든다. 화면 어댑터(js/adapters/work24.js)는
이 파일에 items 가 있으면 "고용24 수집 데이터(수집일)"로, 없으면 DEMO 데이터로 표시한다.

사용법
  맥:      WORK24_API_KEY=발급키 python3 reon/scripts/fetch_work24.py
  윈도우:  $env:WORK24_API_KEY="발급키"; py reon\scripts\fetch_work24.py

주의
  - 요청주소·파라미터는 고용24 OPEN-API 안내(https://www.work24.go.kr → 고객센터 → OPEN-API)에서 확인한 범위만 적었다.
    (채용정보 목록 callOpenApiSvcInfo210L01, 훈련과정 목록 callOpenApiSvcInfo310L01)
    응답 항목명은 승인 후 받는 명세서와 대조해 FIELD_MAP 을 맞춰야 한다. 대조 전에는 items 를 쓰지 않는다.
  - 키가 없으면 아무것도 바꾸지 않고 종료한다(빈 캐시 유지 → DEMO 표시).
"""
import json
import os
import sys
import datetime as dt
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "data", "cache")
KEY = os.environ.get("WORK24_API_KEY", "").strip()

ENDPOINTS = {
    # 고용24 OPEN-API 채용정보 목록 (검색 결과·커뮤니티 코드로 확인된 요청주소, 승인 후 명세서로 재확인 필요)
    "openings": "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do",
    # 고용24 OPEN-API 국민내일배움카드 훈련과정 목록
    "training": "https://www.work24.go.kr/cm/openApi/call/hr/callOpenApiSvcInfo310L01.do",
}

# 전환직무별 검색어 (data/jobs.js 의 searchKeyword 와 동일하게 유지)
KEYWORDS = {
    "welfare_counselor": "복지 상담", "care_coordinator": "재가센터 코디네이터", "job_counselor": "직업상담",
    "care_worker": "요양보호사", "senior_life_supporter": "생활지원사", "contact_center": "고객상담",
    "admin_clerk": "사무보조", "corporate_trainer": "강사", "after_school": "돌봄전담사",
    "child_caregiver": "아이돌보미", "safety_manager": "안전관리자", "facility_manager": "시설관리",
    "welfare_driver": "송영 운전", "security_guard": "경비원", "quality_clerk": "품질관리 사무",
    "b2b_sales": "영업 관리", "public_info_guide": "안내원", "small_business_support": "소상공인 상담",
}

# 응답 XML 항목 → 화면 항목. 승인 후 명세서와 대조해 채운다(추정값으로 채우지 않는다).
FIELD_MAP = {
    "openings": {"title": "title", "company": "company", "region": "region", "empType": "holidayTpNm",
                 "sal": "sal", "closeDt": "closeDt", "url": "wantedInfoUrl"},
    "training": {"title": "title", "institution": "subTitle", "region": "address", "start": "traStartDate",
                 "end": "traEndDate", "url": "titleLink"},
}


def get(url, params):
    q = urllib.parse.urlencode(params)
    with urllib.request.urlopen(f"{url}?{q}", timeout=30) as r:
        return r.read().decode("utf-8")


def parse_items(xml_text, mapping, extra):
    root = ET.fromstring(xml_text)
    items = []
    for node in root.iter():
        if node.tag not in ("wanted", "scn_list", "item"):
            continue
        row = {k: (node.findtext(v) or "").strip() for k, v in mapping.items()}
        if not row.get("title"):
            continue
        row.update(extra)
        items.append(row)
    return items


def write_cache(name, items):
    path = os.path.join(CACHE, f"{name}.json")
    payload = {
        "source": {"provider": "한국고용정보원 고용24 OPEN-API", "endpoint": ENDPOINTS[name],
                   "asOf": dt.date.today().isoformat(), "license": "고용24 OPEN-API 이용약관"},
        "items": items,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
    print(f"{path}: {len(items)}건")


def main():
    if not KEY:
        print("WORK24_API_KEY 가 없어 수집을 건너뜁니다(캐시 유지, 화면은 DEMO 표시).")
        return 0
    openings, training = [], []
    for job_id, kw in KEYWORDS.items():
        try:
            xml = get(ENDPOINTS["openings"], {"authKey": KEY, "callTp": "L", "returnType": "XML",
                                              "startPage": 1, "display": 5, "keyword": kw})
            openings += parse_items(xml, FIELD_MAP["openings"], {"jobId": job_id, "demo": False})
        except Exception as e:  # noqa: BLE001
            print(f"[채용] {job_id}: {e}", file=sys.stderr)
    today = dt.date.today()
    try:
        xml = get(ENDPOINTS["training"], {"authKey": KEY, "returnType": "XML", "outType": "1", "pageNum": 1,
                                          "pageSize": 100, "srchTraStDt": today.strftime("%Y%m%d"),
                                          "srchTraEndDt": (today + dt.timedelta(days=90)).strftime("%Y%m%d"),
                                          "sort": "ASC", "sortCol": "TRNG_BGDE"})
        training += parse_items(xml, FIELD_MAP["training"], {"demo": False})
    except Exception as e:  # noqa: BLE001
        print(f"[훈련] {e}", file=sys.stderr)
    if openings:
        write_cache("openings", openings)
    if training:
        write_cache("training", training)
    return 0


if __name__ == "__main__":
    sys.exit(main())
