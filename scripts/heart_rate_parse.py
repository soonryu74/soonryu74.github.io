#!/usr/bin/env python3
"""
심박 데이터 통합 파서 (애플워치 / 갤럭시워치 / 범용 CSV) → 일별 요약 + 기준선 판독.
외부 라이브러리 없이 파이썬 표준 라이브러리만 사용합니다.

사용법
  python scripts/heart_rate_parse.py <입력파일> [--out 결과폴더]

지원 입력
  - 애플 건강 앱 전체 내보내기: export.zip 또는 export.xml
    (HKQuantityTypeIdentifierHeartRate, HKQuantityTypeIdentifierRestingHeartRate,
     HKQuantityTypeIdentifierHeartRateVariabilitySDNN)
  - 삼성헬스 개인 데이터 다운로드: *.zip 또는 heart_rate*.csv
    (헤더 이름이 버전마다 달라서 'time'/'heart_rate' 포함 열을 자동 탐색)
  - Health Auto Export(iOS 앱) CSV / JSON: date, Min, Avg, Max
  - 범용 CSV: 시각 열 + bpm 열

출력 (결과폴더 기본값: ./hr_out)
  heart_rate_clean.csv   정규화된 원자료 (timestamp, bpm, source, kind)
  daily_summary.csv      일별 요약 (최소/평균/최대/안정시 추정/표본수)
  report.md              기준선 대비 판독 메모 (의료 진단이 아님)
"""
import argparse
import csv
import io
import json
import os
import re
import statistics
import sys
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from datetime import datetime, timezone

APPLE_TYPES = {
    "HKQuantityTypeIdentifierHeartRate": "hr",
    "HKQuantityTypeIdentifierRestingHeartRate": "resting",
    "HKQuantityTypeIdentifierHeartRateVariabilitySDNN": "hrv_sdnn",
}


def parse_ts(s):
    """여러 시각 표기를 datetime(로컬 naive)으로 통일."""
    s = s.strip()
    fmts = (
        "%Y-%m-%d %H:%M:%S %z",      # 애플: 2026-11-01 07:12:03 +0900
        "%Y-%m-%d %H:%M:%S.%f",      # 삼성: 2026-11-01 07:12:03.000
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
    )
    for f in fmts:
        try:
            dt = datetime.strptime(s, f)
            if dt.tzinfo:  # 기기가 적은 현지 시각 그대로 사용 (시간대 변환 안 함)
                dt = dt.replace(tzinfo=None)
            return dt
        except ValueError:
            continue
    if re.fullmatch(r"\d{13}", s):  # 밀리초 epoch (삼성 일부 버전)
        return datetime.fromtimestamp(int(s) / 1000)
    if re.fullmatch(r"\d{10}", s):
        return datetime.fromtimestamp(int(s))
    return None


# ---------- 애플 ----------
def parse_apple_xml(fp):
    rows = []
    for _, el in ET.iterparse(fp, events=("end",)):
        if el.tag != "Record":
            continue
        kind = APPLE_TYPES.get(el.get("type"))
        if kind:
            ts = parse_ts(el.get("startDate", ""))
            try:
                val = float(el.get("value"))
            except (TypeError, ValueError):
                val = None
            if ts and val is not None:
                rows.append((ts, val, el.get("sourceName", "apple"), kind))
        el.clear()
    return rows


# ---------- 삼성 / 범용 CSV ----------
def _find_col(header, *keys):
    for i, h in enumerate(header):
        hl = h.lower()
        if all(k in hl for k in keys):
            return i
    return None


def parse_generic_csv(text, source="csv"):
    lines = text.splitlines()
    # 삼성 CSV 첫 줄은 메타데이터(com.samsung...,버전,행수)라서 건너뜀.
    # 헤더 = 처음으로 'time' 열이 있고 열이 3개 이상인 줄
    start = 0
    for i, line in enumerate(lines[:5]):
        if "time" in line.lower() and line.count(",") >= 2:
            start = i
            break
    reader = csv.reader(lines[start:])
    header = next(reader, None)
    if not header:
        return []
    # Health Auto Export 형식
    if _find_col(header, "avg") is not None and _find_col(header, "date") is not None:
        di, ai = _find_col(header, "date"), _find_col(header, "avg")
        rows = []
        for r in reader:
            if len(r) <= max(di, ai):
                continue
            ts = parse_ts(r[di])
            try:
                rows.append((ts, float(r[ai]), source, "hr"))
            except ValueError:
                pass
        return [r for r in rows if r[0]]
    ti = (_find_col(header, "start_time") or _find_col(header, "start", "time")
          or _find_col(header, "time") or _find_col(header, "date"))
    bi = None
    for cand in ("heart_rate", "bpm", "value"):
        for i, h in enumerate(header):
            last = h.lower().split(".")[-1]  # 삼성 네임스페이스는 마지막 토큰으로 비교
            if last == cand:
                bi = i
                break
        if bi is not None:
            break
    if ti is None or bi is None:
        return []
    rows = []
    for r in reader:
        if len(r) <= max(ti, bi) or not r[bi]:
            continue
        ts = parse_ts(r[ti])
        try:
            val = float(r[bi])
        except ValueError:
            continue
        if ts and 25 <= val <= 250:
            rows.append((ts, val, source, "hr"))
    return rows


def parse_hae_json(text):
    data = json.loads(text)
    metrics = data.get("data", {}).get("metrics", [])
    rows = []
    for m in metrics:
        if m.get("name") != "heart_rate":
            continue
        for d in m.get("data", []):
            ts = parse_ts(d.get("date", ""))
            if ts and "Avg" in d:
                rows.append((ts, float(d["Avg"]), "health_auto_export", "hr"))
    return rows


def load(path):
    rows = []
    if path.endswith(".zip"):
        with zipfile.ZipFile(path) as z:
            for name in z.namelist():
                low = name.lower()
                if low.endswith("export.xml"):
                    with z.open(name) as fp:
                        rows += parse_apple_xml(fp)
                elif low.endswith(".csv") and "heart_rate" in low:
                    text = z.read(name).decode("utf-8", errors="replace")
                    rows += parse_generic_csv(text, source="samsung_health")
    elif path.endswith(".xml"):
        with open(path, "rb") as fp:
            rows = parse_apple_xml(fp)
    elif path.endswith(".json"):
        rows = parse_hae_json(open(path, encoding="utf-8").read())
    else:
        rows = parse_generic_csv(open(path, encoding="utf-8", errors="replace").read())
    return rows


# ---------- 요약 / 판독 ----------
def summarize(rows):
    by_day = defaultdict(list)
    resting_by_day = defaultdict(list)
    hrv_by_day = defaultdict(list)
    for ts, val, _, kind in rows:
        d = ts.date().isoformat()
        if kind == "hr":
            by_day[d].append((ts, val))
        elif kind == "resting":
            resting_by_day[d].append(val)
        elif kind == "hrv_sdnn":
            hrv_by_day[d].append(val)
    out = []
    for d in sorted(by_day):
        vals = [v for _, v in by_day[d]]
        # 안정시 추정: 기기 제공값 우선, 없으면 하루 중 가장 낮은 10% 평균 (단순 근사)
        if resting_by_day.get(d):
            resting = statistics.mean(resting_by_day[d])
            resting_src = "device"
        else:
            k = max(1, len(vals) // 10)
            resting = statistics.mean(sorted(vals)[:k])
            resting_src = "lowest10%"
        out.append({
            "date": d,
            "n": len(vals),
            "min": round(min(vals), 1),
            "avg": round(statistics.mean(vals), 1),
            "max": round(max(vals), 1),
            "resting": round(resting, 1),
            "resting_src": resting_src,
            "hrv_sdnn": round(statistics.mean(hrv_by_day[d]), 1) if hrv_by_day.get(d) else "",
        })
    return out


def interpret(daily):
    """개인 기준선 대비 판독. 임상 진단 아님."""
    notes = []
    if len(daily) < 7:
        notes.append("- 기록 일수가 7일 미만입니다. 기준선(baseline) 판독은 최소 2주 이상 쌓인 뒤 의미가 있습니다.")
    rest = [d["resting"] for d in daily]
    if rest:
        base = statistics.median(rest[:-7]) if len(rest) > 14 else statistics.median(rest)
        recent = rest[-7:]
        notes.append(f"- 안정시 심박 기준선(중앙값): {base:.0f} bpm, 최근 7일 평균: {statistics.mean(recent):.0f} bpm")
        for d in daily[-7:]:
            diff = d["resting"] - base
            if diff >= max(5, base * 0.08):
                notes.append(f"  - {d['date']}: 안정시 {d['resting']:.0f} bpm (기준선 +{diff:.0f}). 수면 부족·음주·감기 전조·과훈련 등을 함께 메모해 두세요.")
            if d["max"] >= 200:
                notes.append(f"  - {d['date']}: 최대 {d['max']:.0f} bpm. 운동 기록이 없다면 센서 오류(손목 미착용·광 노이즈) 가능성을 먼저 확인하세요.")
        if base > 100:
            notes.append("- 안정시 기준선이 100 bpm을 넘습니다. 일반 성인 참고 범위(60~100)를 벗어나므로 의료진 상담을 권합니다.")
        elif base < 50:
            notes.append("- 안정시 기준선이 50 bpm 미만입니다. 운동 선수가 아니라면 의료진과 상의하세요.")
    hrv = [d["hrv_sdnn"] for d in daily if d["hrv_sdnn"] != ""]
    if hrv:
        notes.append(f"- HRV(SDNN) 평균: {statistics.mean(hrv):.0f} ms. 손목 광학 센서 HRV는 수면 중 값만 비교적 신뢰할 수 있고, 절대값보다 본인 추세로 보세요.")
    notes.append("- 이 판독은 생활 기록 참고용이며 의료 진단이 아닙니다. 불규칙 리듬·흉통·실신이 있으면 바로 진료를 받으세요.")
    return notes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--out", default="hr_out")
    a = ap.parse_args()
    rows = load(a.path)
    if not rows:
        sys.exit("심박 레코드를 찾지 못했습니다. 파일 형식(export.zip / heart_rate*.csv)을 확인하세요.")
    rows.sort(key=lambda r: r[0])
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, "heart_rate_clean.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["timestamp", "value", "source", "kind"])
        for ts, v, s, k in rows:
            w.writerow([ts.isoformat(sep=" "), v, s, k])
    daily = summarize(rows)
    with open(os.path.join(a.out, "daily_summary.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(daily[0].keys()))
        w.writeheader()
        w.writerows(daily)
    notes = interpret(daily)
    with open(os.path.join(a.out, "report.md"), "w", encoding="utf-8") as f:
        f.write(f"# 심박 기록 판독 메모\n\n입력: `{os.path.basename(a.path)}`  \n")
        f.write(f"레코드 {len(rows):,}건, {daily[0]['date']} ~ {daily[-1]['date']} ({len(daily)}일)\n\n")
        f.write("| 날짜 | 표본 | 최소 | 평균 | 최대 | 안정시 | HRV(SDNN) |\n|---|---|---|---|---|---|---|\n")
        for d in daily[-14:]:
            f.write(f"| {d['date']} | {d['n']} | {d['min']} | {d['avg']} | {d['max']} | {d['resting']} ({d['resting_src']}) | {d['hrv_sdnn']} |\n")
        f.write("\n## 판독\n" + "\n".join(notes) + "\n")
    print(f"레코드 {len(rows):,}건 → {a.out}/ (daily_summary.csv, report.md)")
    print("\n".join(notes))


if __name__ == "__main__":
    main()
