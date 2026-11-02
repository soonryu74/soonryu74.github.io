"""지자체복지서비스 API(한국사회보장정보원, 공공데이터포털 15108347) 수집 → data/raw/local_list.json, local_detail.json

엔드포인트: https://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations
  목록 /LcgvWelfarelist  (pageNo, numOfRows≤500, ctpvNm, sggNm, lifeArray, trgterIndvdlArray, intrsThemaArray, age, srchKeyCode, searchWrd)
  상세 /LcgvWelfaredetailed (servId)  → sprtTrgtCn·slctCritCn·alwServCn·aplyMtdCn·enfcBgngYmd·enfcEndYmd·lastModYmd
실행 (인증키는 환경변수):
  맥:      DATA_GO_KR_KEY=키 python3 bokji-biseo/scripts/fetch_local.py --list            # 전국 목록 전체
           DATA_GO_KR_KEY=키 python3 bokji-biseo/scripts/fetch_local.py --detail-ids ids.txt --sleep 1
  윈도우:  $env:DATA_GO_KR_KEY="키"; py bokji-biseo\\scripts\\fetch_local.py --list
"""
import argparse, json, os, sys, time, urllib.parse, urllib.request, urllib.error
import xml.etree.ElementTree as ET
from datetime import date

BASE = "https://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "raw")
LIST_PATH = os.path.join(OUT, "local_list.json")
DET_PATH = os.path.join(OUT, "local_detail.json")


def call(endpoint, params):
    key = params.pop("serviceKey")
    url = endpoint + "?serviceKey=" + key + "&" + urllib.parse.urlencode(params)
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=40) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code == 429:
                raise SystemExit("HTTP 429 (일일 호출 제한)")
            last = e; time.sleep(1.5 * (attempt + 1))
        except (urllib.error.URLError, ConnectionError, TimeoutError) as e:
            last = e; time.sleep(1.5 * (attempt + 1))
    raise SystemExit(f"호출 실패: {last}")


def records(text, tag):
    root = ET.fromstring(text)
    rc = root.findtext("resultCode")
    if rc not in (None, "0", "00"):
        raise SystemExit(f"API 오류: {rc} {root.findtext('resultMessage')}")
    return [{c.tag: (c.text or "").strip() for c in item} for item in root.iter(tag)], root.findtext("totalCount")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="전국 목록 전체 수집(500건/페이지)")
    ap.add_argument("--ctpv", default="", help="시도명으로 제한 (예: 경기도)")
    ap.add_argument("--detail-ids", help="상세조회할 servId 목록 파일(줄 단위) 또는 쉼표 구분 문자열")
    ap.add_argument("--sleep", type=float, default=0.8)
    a = ap.parse_args()
    key = os.environ.get("DATA_GO_KR_KEY")
    if not key:
        print("DATA_GO_KR_KEY 환경변수가 없습니다."); sys.exit(1)
    os.makedirs(OUT, exist_ok=True)
    meta = {"source": "한국사회보장정보원 지자체복지서비스 API (data.go.kr 15108347)", "fetched": date.today().isoformat()}

    if a.list:
        items, page = [], 1
        while True:
            p = {"serviceKey": key, "pageNo": page, "numOfRows": 500}
            if a.ctpv: p["ctpvNm"] = a.ctpv
            recs, total = records(call(BASE + "/LcgvWelfarelist", p), "servList")
            items += recs
            print(f"목록 {page}페이지 {len(recs)}건 / 전체 {total}", flush=True)
            if not recs or len(items) >= int(total or 0):
                break
            page += 1; time.sleep(a.sleep)
        meta["count"] = len(items)
        json.dump({"meta": meta, "items": items}, open(LIST_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("저장:", LIST_PATH)

    if a.detail_ids:
        ids = open(a.detail_ids, encoding="utf-8").read().split() if os.path.exists(a.detail_ids) else a.detail_ids.split(",")
        details, done = [], set()
        if os.path.exists(DET_PATH):
            details = json.load(open(DET_PATH, encoding="utf-8"))["items"]; done = {d.get("servId") for d in details}
        todo = [i for i in ids if i and i not in done]
        print(f"상세 기존 {len(done)}건, 남은 {len(todo)}건")
        for n, sid in enumerate(todo, 1):
            recs, _ = records(call(BASE + "/LcgvWelfaredetailed", {"serviceKey": key, "servId": sid}), "wantedDtl")
            details += recs or [{"servId": sid}]
            if n % 10 == 0 or n == len(todo):
                json.dump({"meta": meta, "items": details}, open(DET_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
                print(f"  {len(details)}건 저장", flush=True)
            time.sleep(a.sleep)
        print("저장:", DET_PATH)


if __name__ == "__main__":
    main()
