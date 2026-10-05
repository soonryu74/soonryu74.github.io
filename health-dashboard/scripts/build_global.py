"""Global Health Equity Radar(/global/) 빌드 — World Bank WDI 경량 패키지에서 화면용 파생 파일을 만들고 원본과 전수 대조한다.

입력(제공 원본, 수정하지 않음): global/data/health_equity_wdi_latest.json · global/data/indicator_metadata.csv
산출: global/data/wdi_compact.json(값·연도 그대로) · global/data/indicators.json(라벨·단위·영역·방향·출처 요약)
      global/data/world_110m.json(Natural Earth 110m, 퍼블릭 도메인 — 원본 geojson 이 scratchpad 등에 있을 때만 갱신)
      global/js/app.js(global/src/main.js 를 esbuild 로 묶음 — 한국 엔진 app/src/lib/equity 를 함께 묶는다)
검증: 원본 레코드 전부가 compact 에 같은 값·연도로 있는지, 결측이 0 으로 바뀌지 않았는지, 라이선스 필드가 CC BY-4.0 인지.
사용: python3 scripts/build_global.py [--world <ne_110m_admin_0_countries.geojson>]
"""
import csv, json, sys, subprocess, re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
G = ROOT / "global"
D = G / "data"

# 지표 방향 — 코드에 명시하고 방법론 페이지에 그대로 공개한다(추측 금지: 목록에 없으면 context)
HIGHER_IS_CONCERN = ["SH.DYN.MORT", "SP.DYN.IMRT.IN", "SH.STA.MMRT", "SH.TBS.INCD", "SH.XPD.OOPC.CH.ZS", "SI.POV.DDAY", "SL.UEM.TOTL.ZS"]
LOWER_IS_CONCERN = ["SP.DYN.LE00.IN", "SH_UHC_SCI", "SH.MED.PHYS.ZS", "SH.MED.NUMW.P3", "SH.IMM.MEAS", "SE.SEC.ENRR", "SH.H2O.SMDW.ZS", "SH.STA.SMSS.ZS", "EG.ELC.ACCS.ZS"]
CONTEXT_WHY = {
    "NY.GDP.PCAP.CD": "economic context; not a health target",
    "SH.XPD.CHEX.GD.ZS": "spending level is not good or bad by itself",
    "SH.XPD.CHEX.PC.CD": "spending level is not good or bad by itself",
    "SP.DYN.CBRT.IN": "demographic context",
    "SP.DYN.CDRT.IN": "strongly driven by population age structure",
    "SP.DYN.TFRT.IN": "demographic context",
    "SP.POP.65UP.TO.ZS": "population ageing is context, not a deficit",
    "SP.POP.TOTL": "size only",
    "SP.URB.TOTL.IN.ZS": "urbanisation is context",
}
DOMAIN = {  # 제품 영역(지시서 3절). TB 1개뿐인 영역은 'Disease burden' 으로만 부른다(NCD 전체 아님)
    "SP.DYN.LE00.IN": "Health outcomes", "SH.DYN.MORT": "Health outcomes", "SP.DYN.IMRT.IN": "Health outcomes", "SH.STA.MMRT": "Health outcomes", "SP.DYN.CDRT.IN": "Health outcomes",
    "SH.TBS.INCD": "Disease burden",
    "SH_UHC_SCI": "Health system", "SH.XPD.CHEX.GD.ZS": "Health system", "SH.XPD.CHEX.PC.CD": "Health system", "SH.XPD.OOPC.CH.ZS": "Health system",
    "SH.MED.PHYS.ZS": "Health system", "SH.MED.NUMW.P3": "Health system", "SH.IMM.MEAS": "Health system",
    "NY.GDP.PCAP.CD": "Social determinants", "SI.POV.DDAY": "Social determinants", "SL.UEM.TOTL.ZS": "Social determinants", "SE.SEC.ENRR": "Social determinants",
    "SP.URB.TOTL.IN.ZS": "Social determinants", "SP.POP.65UP.TO.ZS": "Social determinants", "SH.H2O.SMDW.ZS": "Social determinants", "SH.STA.SMSS.ZS": "Social determinants", "EG.ELC.ACCS.ZS": "Social determinants",
    "SP.POP.TOTL": "Demographic context", "SP.DYN.CBRT.IN": "Demographic context", "SP.DYN.TFRT.IN": "Demographic context",
}
# 화면용 짧은 단위(값 옆에 붙임). 정의상의 단위는 metadata 의 Unit of measure 를 그대로 함께 보관
UNIT_SHORT = {"%": "%", "years": "years", "per 1000 live births": "per 1,000 live births", "per 100,000 live births": "per 100,000 live births",
              "per 100,000 people": "per 100,000", "per 1000 people": "per 1,000 people", "current us$": "US$", "index": "index (0–100)", "births per woman": "births per woman", "unit": "people"}

def short_unit(code, unit):
    u = unit.strip().lower()
    if code in ("SH.XPD.CHEX.GD.ZS", "SH.XPD.OOPC.CH.ZS", "SH.IMM.MEAS", "SP.POP.65UP.TO.ZS", "SP.URB.TOTL.IN.ZS") or u.startswith("%") or u == "percentage":
        return "%"
    for k, v in UNIT_SHORT.items():
        if u == k:
            return v
    return unit

def short_source(src):
    """'A, publisher: …;\\nB, uri: …' → 'A; B'(기관 이름만, 최대 3개)"""
    parts = [p.strip() for p in re.split(r";\s*\n|\n", src) if p.strip()]
    out = []
    for p in parts:
        p = re.split(r",\s*(?:uri|note|publisher|type|date accessed|date published):", p)[0].strip().rstrip(",")
        if p and p not in out:
            out.append(p)
    return "; ".join(out[:3])

def main():
    world_src = None
    if "--world" in sys.argv:
        world_src = Path(sys.argv[sys.argv.index("--world") + 1])
    raw = json.loads((D / "health_equity_wdi_latest.json").read_text(encoding="utf-8"))
    meta = list(csv.DictReader(open(D / "indicator_metadata.csv", encoding="utf-8-sig")))
    mby = {m["Series Code"]: m for m in meta}

    # ── 원본 점검 ──
    keys = Counter(tuple(sorted(r)) for r in raw)
    assert len(keys) == 1, f"레코드 키가 섞여 있음: {keys}"
    bad = [r for r in raw if r["License Type"] != "CC BY-4.0"]
    assert not bad, f"CC BY-4.0 이 아닌 레코드 {len(bad)}개 — 제외 규칙 확인 필요"
    dup = len(raw) - len({(r["Country Code"], r["Indicator Code"]) for r in raw})
    assert dup == 0, f"국가×지표 중복 {dup}"
    codes = sorted({r["Indicator Code"] for r in raw})
    missing_meta = [c for c in codes if c not in mby]
    assert not missing_meta, f"metadata 없는 지표 {missing_meta}"
    nonpass = [c for c in codes if mby[c]["License Type"] != "CC BY-4.0" or mby[c]["license_check"] != "PASS"]
    assert not nonpass, f"metadata 라이선스 확인 실패 {nonpass}"
    for c in codes:
        assert c in DOMAIN, f"영역 미지정 지표 {c}"
        assert (c in HIGHER_IS_CONCERN) + (c in LOWER_IS_CONCERN) + (c in CONTEXT_WHY) == 1, f"방향 지정 오류 {c}"

    # ── indicators.json ──
    inds = {}
    for c in codes:
        m = mby[c]
        direction = "higher_is_concern" if c in HIGHER_IS_CONCERN else "lower_is_concern" if c in LOWER_IS_CONCERN else "context"
        yrs = [r["year"] for r in raw if r["Indicator Code"] == c]
        inds[c] = {
            "code": c, "label": m["radar_label"], "name": m["Indicator Name"], "domain": DOMAIN[c], "wdi_domain": m["domain"],
            "unit": short_unit(c, m["Unit of measure"]), "unit_full": m["Unit of measure"], "direction": direction,
            "context_note": CONTEXT_WHY.get(c), "source": short_source(m["Source"]), "source_full": m["Source"].strip(),
            "definition": m["Long definition"].strip(), "limitations": re.sub(r"\s*\n\s*", " ", m["Limitations and exceptions"]).strip(),
            "license": m["License Type"], "n": len(yrs), "year_min": min(yrs), "year_max": max(yrs),
        }

    # ── wdi_compact.json(값·연도 그대로) ──
    countries, values = {}, {}
    for r in raw:
        cc = r["Country Code"]
        countries.setdefault(cc, {"name": r["Country Name"], "region": r["Region"], "income": r["Income Group"]})
        assert countries[cc] == {"name": r["Country Name"], "region": r["Region"], "income": r["Income Group"]}, f"국가 속성 불일치 {cc}"
        values.setdefault(cc, {})[r["Indicator Code"]] = [r["value"], r["year"]]
    years = [r["year"] for r in raw]
    compact = {
        "source": "World Bank, World Development Indicators (WDI) — Health Equity Radar extract; WDI file date 2026-10-01",
        "license": "CC BY-4.0 (per WDI series metadata, screened indicator by indicator)",
        "built_from": "health_equity_wdi_latest.json (unmodified)",
        "n_records": len(raw), "n_countries": len(countries), "n_indicators": len(codes), "year_min": min(years), "year_max": max(years),
        "countries": dict(sorted(countries.items())), "values": dict(sorted(values.items())),
    }
    (D / "wdi_compact.json").write_text(json.dumps(compact, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (D / "indicators.json").write_text(json.dumps(inds, ensure_ascii=False, indent=1), encoding="utf-8")

    # ── 전수 대조: 다시 읽어서 원본과 비교 ──
    back = json.loads((D / "wdi_compact.json").read_text(encoding="utf-8"))
    mism = 0
    for r in raw:
        v = back["values"][r["Country Code"]].get(r["Indicator Code"])
        if v is None or v[0] != r["value"] or v[1] != r["year"]:
            mism += 1
    n_back = sum(len(x) for x in back["values"].values())
    zeros_from_null = sum(1 for r in raw if r["value"] is None)
    assert mism == 0 and n_back == len(raw), f"대조 실패: 불일치 {mism}, 레코드 {n_back}/{len(raw)}"
    print(f"원본 {len(raw)}개 레코드 = compact {n_back}개, 값·연도 불일치 0, 원본 결측 {zeros_from_null}개(0 으로 바꾸지 않음)")
    print(f"국가/경제권 {len(countries)} · 지표 {len(codes)}(방향 {len(HIGHER_IS_CONCERN)}+{len(LOWER_IS_CONCERN)}, 맥락 {len(CONTEXT_WHY)}) · 관측연도 {min(years)}–{max(years)}")

    # ── 세계 지도(Natural Earth 110m, 퍼블릭 도메인) ──
    if world_src and world_src.exists():
        ne = json.loads(world_src.read_text(encoding="utf-8"))
        feats = []
        def rnd(c):
            return [rnd(x) for x in c] if isinstance(c[0], list) else [round(c[0], 2), round(c[1], 2)]
        for f in ne["features"]:
            p = f["properties"]
            if p.get("ADM0_A3") == "ATA":  # 남극 제외
                continue
            iso = p.get("ISO_A3") if p.get("ISO_A3") not in (None, "-99") else p.get("ISO_A3_EH")
            if iso in (None, "-99"):
                iso = p.get("ADM0_A3")
            iso = {"KOS": "XKX", "SDS": "SSD"}.get(iso, iso)  # WDI 코드에 맞춤(코소보 XKX, 남수단 SSD)
            feats.append({"type": "Feature", "id": iso, "properties": {"name": p.get("NAME_EN") or p.get("NAME")}, "geometry": {"type": f["geometry"]["type"], "coordinates": rnd(f["geometry"]["coordinates"])}})
        out = {"type": "FeatureCollection", "source": "Natural Earth 1:110m Admin 0 – Countries (public domain), naturalearthdata.com", "features": feats}
        (D / "world_110m.json").write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
        matched = sum(1 for f in feats if f["id"] in countries)
        print(f"지도: 국가 경계 {len(feats)}개, WDI 국가와 일치 {matched}/{len(countries)}")
    elif not (D / "world_110m.json").exists():
        print("지도 파일 없음 — --world <ne_110m_admin_0_countries.geojson> 로 한 번 만들 것")

    # ── JS 묶기(esbuild) ──
    esb = ROOT / "app" / "node_modules" / ".bin" / "esbuild"
    subprocess.run([str(esb), str(G / "src" / "main.js"), "--bundle", "--format=esm", "--minify", "--target=es2019", f"--outfile={G / 'js' / 'app.js'}", "--log-level=warning"], check=True)
    print(f"번들: global/js/app.js {(G / 'js' / 'app.js').stat().st_size:,} bytes")

if __name__ == "__main__":
    main()
