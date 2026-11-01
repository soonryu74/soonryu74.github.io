"""복지로 중앙부처복지서비스 API(한국사회보장정보원, 공공데이터포털 15090532) 수집 → JSON.

엔드포인트: https://apis.data.go.kr/B554287/NationalWelfareInformationsV001
  목록 callTp=L (pageNo·numOfRows·srchKeyCode 필수, lifeArray·trgterIndvdlArray·intrsThemaArray·age·onapPsbltYn 선택)
  상세 callTp=D (servId 필수)
응답은 XML. 필드명은 공공데이터포털 활용가이드로 재확인 필요(아래 파서는 태그를 그대로 dict로 옮긴다).

실행 (인증키는 환경변수, 소스에 넣지 않는다):
  맥:      DATA_GO_KR_KEY=발급키 python3 bokji-biseo/scripts/fetch_bokjiro.py --pages 2 --detail 20
  윈도우:  $env:DATA_GO_KR_KEY="발급키"; py bokji-biseo\\scripts\\fetch_bokjiro.py --pages 2 --detail 20
출력: bokji-biseo/data/central_list.json, central_detail.json (키 미설정 시 안내만 출력)
"""
import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date

BASE = "https://apis.data.go.kr/B554287/NationalWelfareInformationsV001"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data")


def call(params):
    url = BASE + "?" + urllib.parse.urlencode(params, safe="%")
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def xml_to_records(text, tag):
    root = ET.fromstring(text)
    header = {c.tag: (c.text or "").strip() for c in root.iter("header") for c in c}
    if header.get("resultCode") not in (None, "0", "00"):
        raise SystemExit(f"API 오류: {header}")
    out = []
    for item in root.iter(tag):
        out.append({c.tag: (c.text or "").strip() for c in item})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=1, help="목록 페이지 수 (페이지당 최대 500건)")
    ap.add_argument("--rows", type=int, default=100)
    ap.add_argument("--detail", type=int, default=0, help="상세조회 건수 (0이면 생략)")
    a = ap.parse_args()

    key = os.environ.get("DATA_GO_KR_KEY")
    if not key:
        print("DATA_GO_KR_KEY 환경변수가 없습니다. 공공데이터포털에서 '중앙부처복지서비스' 활용신청 후 발급키를 넣으세요.")
        sys.exit(1)

    os.makedirs(OUT, exist_ok=True)
    items = []
    for p in range(1, a.pages + 1):
        txt = call({"serviceKey": key, "callTp": "L", "pageNo": p, "numOfRows": a.rows, "srchKeyCode": "003"})
        page = xml_to_records(txt, "servList")
        if not page:
            break
        items += page
        print(f"목록 {p}페이지 {len(page)}건")
    meta = {"source": "한국사회보장정보원 중앙부처복지서비스 API (data.go.kr 15090532)", "fetched": date.today().isoformat(), "count": len(items)}
    with open(os.path.join(OUT, "central_list.json"), "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "items": items}, f, ensure_ascii=False, indent=1)

    if a.detail:
        details = []
        for it in items[: a.detail]:
            sid = it.get("servId")
            if not sid:
                continue
            txt = call({"serviceKey": key, "callTp": "D", "servId": sid})
            recs = xml_to_records(txt, "wantedDtl")
            details += recs or [{"servId": sid, "_raw": txt[:2000]}]
        with open(os.path.join(OUT, "central_detail.json"), "w", encoding="utf-8") as f:
            json.dump({"meta": meta, "items": details}, f, ensure_ascii=False, indent=1)
        print(f"상세 {len(details)}건 저장")
    print("완료:", OUT)


if __name__ == "__main__":
    main()
