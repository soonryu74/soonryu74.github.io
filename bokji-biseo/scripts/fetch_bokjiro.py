"""복지로 중앙부처복지서비스 API(한국사회보장정보원, 공공데이터포털 15090532) 수집 → JSON.

엔드포인트: https://apis.data.go.kr/B554287/NationalWelfareInformationsV001
  목록 /NationalWelfarelistV001  callTp=L (pageNo·numOfRows·srchKeyCode 필수, lifeArray·trgterIndvdlArray·intrsThemaArray·age·onapPsbltYn 선택)
  상세 /NationalWelfaredetailedV001  callTp=D (servId 필수)
응답은 XML. 필드명은 공공데이터포털 활용가이드로 재확인 필요(아래 파서는 태그를 그대로 dict로 옮긴다).

실행 (인증키는 환경변수, 소스에 넣지 않는다):
  맥:      DATA_GO_KR_KEY=발급키 python3 bokji-biseo/scripts/fetch_bokjiro.py --pages 2 --detail 20
  윈도우:  $env:DATA_GO_KR_KEY="발급키"; py bokji-biseo\\scripts\\fetch_bokjiro.py --pages 2 --detail 20
출력: bokji-biseo/data/raw/central_list.json, central_detail.json (키 미설정 시 안내만 출력)
"""
import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date

BASE = "https://apis.data.go.kr/B554287/NationalWelfareInformationsV001"
LIST = BASE + "/NationalWelfarelistV001"
DETAIL = BASE + "/NationalWelfaredetailedV001"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "raw")


def call(endpoint, params):
    # 포털의 '인증키(Encoding)'는 이미 URL 인코딩돼 있으므로 다시 인코딩하지 않는다
    key = params.pop("serviceKey")
    url = endpoint + "?serviceKey=" + key + "&" + urllib.parse.urlencode(params)
    last = None
    for attempt in range(4):  # 네트워크 끊김 재시도
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code == 429:
                raise SystemExit("HTTP 429")
            last = e; time.sleep(1.5 * (attempt + 1))
        except (urllib.error.URLError, ConnectionError, TimeoutError) as e:
            last = e
            time.sleep(1.5 * (attempt + 1))
    raise SystemExit(f"호출 실패: {last}")


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
    ap.add_argument("--skip-list", action="store_true", help="기존 central_list.json을 재사용")
    ap.add_argument("--sleep", type=float, default=1.0, help="상세 호출 간격(초). 개발계정 호출 제한 대응")
    a = ap.parse_args()

    key = os.environ.get("DATA_GO_KR_KEY")
    if not key:
        print("DATA_GO_KR_KEY 환경변수가 없습니다. 공공데이터포털에서 '중앙부처복지서비스' 활용신청 후 발급키를 넣으세요.")
        sys.exit(1)

    os.makedirs(OUT, exist_ok=True)
    items = []
    list_path = os.path.join(OUT, "central_list.json")
    if a.skip_list and os.path.exists(list_path):
        with open(list_path, encoding="utf-8") as f:
            items = json.load(f)["items"]
        print(f"기존 목록 {len(items)}건 재사용")
    for p in range(1, 0 if a.skip_list else a.pages + 1):
        txt = call(LIST, {"serviceKey": key, "callTp": "L", "pageNo": p, "numOfRows": a.rows, "srchKeyCode": "003"})
        page = xml_to_records(txt, "servList")
        if not page:
            break
        items += page
        print(f"목록 {p}페이지 {len(page)}건")
    meta = {"source": "한국사회보장정보원 중앙부처복지서비스 API (data.go.kr 15090532)", "fetched": date.today().isoformat(), "count": len(items)}
    if not a.skip_list:
        with open(list_path, "w", encoding="utf-8") as f:
            json.dump({"meta": meta, "items": items}, f, ensure_ascii=False, indent=1)

    if a.detail:
        det_path = os.path.join(OUT, "central_detail.json")
        details, done = [], set()
        if os.path.exists(det_path):  # 이어받기
            details = json.load(open(det_path, encoding="utf-8"))["items"]
            done = {d.get("servId") for d in details}
        todo = [it for it in items[: a.detail] if it.get("servId") and it["servId"] not in done]
        print(f"상세 기존 {len(done)}건, 남은 {len(todo)}건")
        for n, it in enumerate(todo, 1):
            sid = it["servId"]
            for attempt in range(6):
                try:
                    txt = call(DETAIL, {"serviceKey": key, "callTp": "D", "servId": sid})
                    break
                except SystemExit as e:
                    if "429" in str(e) and attempt < 5:
                        wait = 15 * (attempt + 1); print(f"  429 제한 → {wait}초 대기", flush=True); time.sleep(wait)
                    else:
                        raise
            recs = xml_to_records(txt, "wantedDtl")
            details += recs or [{"servId": sid, "_raw": txt[:2000]}]
            if n % 10 == 0 or n == len(todo):
                with open(det_path, "w", encoding="utf-8") as f:
                    json.dump({"meta": meta, "items": details}, f, ensure_ascii=False, indent=1)
                print(f"  {len(details)}건 저장", flush=True)
            time.sleep(a.sleep)
    print("완료:", OUT)


if __name__ == "__main__":
    main()
