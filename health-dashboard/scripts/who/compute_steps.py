"""WHO STEPS 공통 계산기 — 베트남·동티모르·우간다를 같은 코드로 계산한다(나라 설정만 다름).

  python3 scripts/who/compute_steps.py VNM <원자료 경로(.dta/.sav/.csv)> [--out 출력.json]
  python3 scripts/who/compute_steps.py --selftest

- 원자료(개인 레코드)는 저장소에 두지 않는다(health-dashboard/private/who/<iso3>/, .git/info/exclude).
- 출력은 집계만: 지표별 가중 유병률·95% CI·비가중 n·하위집단·공식값·차이·판정.
- 분산: 층화(stratum)·집락(psu) Taylor 선형화, PSU 복원추출 근사. PSU가 1개인 층은 전체 PSU 평균을 중심으로 한다.
- 정의는 data/global/schema.json, 검증 목표값은 scripts/who/targets/<iso3>.json(공개 보고서 수치).
- 이용 조건: WHO NCD Microdata Repository 공개 이용 자료 — 비상업·비영리 공중보건 연구·시연 목적. 원자료 재배포 없음.
"""
import json, math, sys, argparse
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = json.loads((ROOT / "data/global/schema.json").read_text(encoding="utf-8"))
TARGETS = ROOT / "scripts/who/targets"

# ── 분산·신뢰구간 ─────────────────────────────────────────────
def t_quantile(df, p=0.975):
    """t 분포 분위수 근사(Cornish–Fisher). 설계 자유도가 크면 1.96에 가깝다."""
    z = 1.959963984540054 if p == 0.975 else math.sqrt(2) * _erfinv(2 * p - 1)
    if not df or df <= 0 or df > 1e6:
        return z
    return z + (z**3 + z) / (4 * df) + (5 * z**5 + 16 * z**3 + 3 * z) / (96 * df**2) + (3 * z**7 + 19 * z**5 + 17 * z**3 - 15 * z) / (384 * df**3)

def _erfinv(x):
    a = 0.147
    ln = math.log(1 - x * x)
    s = 2 / (math.pi * a) + ln / 2
    return math.copysign(math.sqrt(math.sqrt(s * s - ln / a) - s), x)

def survey_prop(y, w, strata, psu, domain=None):
    """가중 비율과 선형화 표준오차. y: 0/1(결측 nan), domain: 하위집단 bool(없으면 전체).
    반환 dict(est, se, df, n, wsum)."""
    y = np.asarray(y, float); w = np.asarray(w, float)
    d = np.isfinite(y) & np.isfinite(w) & (w > 0)
    if domain is not None:
        d &= np.asarray(domain, bool)
    n = int(d.sum())
    if n == 0:
        return None
    W = w[d].sum()
    r = float((w[d] * y[d]).sum() / W)
    # 선형화 변수: 전체 표본에 대해 정의(하위집단 밖은 0) — 하위집단 분산을 올바르게 잡는다
    z = np.where(d, w * (np.nan_to_num(y) - r) / W, 0.0)
    strata = np.asarray(strata); psu = np.asarray(psu)
    keys = {}
    for h, c, zi in zip(strata, psu, z):
        keys[(h, c)] = keys.get((h, c), 0.0) + zi
    by_h = {}
    for (h, c), t in keys.items():
        by_h.setdefault(h, []).append(t)
    all_t = np.array(list(keys.values()))
    grand = all_t.mean()
    var = 0.0
    for h, ts in by_h.items():
        ts = np.array(ts); nh = len(ts)
        if nh > 1:
            var += nh / (nh - 1) * ((ts - ts.mean()) ** 2).sum()
        else:  # 단일 PSU 층: 전체 평균 중심(R survey 「adjust」와 같은 방식)
            var += ((ts - grand) ** 2).sum()
    df = len(keys) - len(by_h)
    return {"est": r, "se": math.sqrt(var), "df": df, "n": n, "wsum": float(W)}

def ci(res, method="wald"):
    if not res:
        return None, None
    p, se, t = res["est"], res["se"], t_quantile(res["df"])
    if method == "logit" and 0 < p < 1:
        l = math.log(p / (1 - p)); s = se / (p * (1 - p))
        lo, hi = 1 / (1 + math.exp(-(l - t * s))), 1 / (1 + math.exp(-(l + t * s)))
    else:
        lo, hi = max(0.0, p - t * se), min(1.0, p + t * se)
    return lo, hi

# ── 공통 정제 도우미 ─────────────────────────────────────────
def col(df, name):
    return df[name].astype(float).to_numpy() if name in df.columns else np.full(len(df), np.nan)

def rng(a, lo, hi):
    a = a.copy(); a[(a < lo) | (a > hi)] = np.nan
    return a

def yesno(a):
    """1=예, 2=아니오, 그 밖(77·88·99 등)=결측 → 1.0/0.0/nan"""
    out = np.full(len(a), np.nan); out[a == 1] = 1.0; out[a == 2] = 0.0
    return out

# ── 지표 정의 ───────────────────────────────────────────────
def ind_smoking(df, cfg, **_):
    return yesno(col(df, "t1")), "wstep1"

def _domain_minutes(df, q, days, hrs, mins, cap=960):
    """GPAQ 한 영역: q=예/아니오, days 1–7, 하루 분(시간·분). 「아니오」면 0, 하루 16시간 넘으면 결측."""
    a = yesno(col(df, q)); d = col(df, days); h = col(df, hrs); m = col(df, mins)
    d = rng(d, 1, 7); h = np.where(np.isnan(h), 0, h); m = np.where(np.isnan(m), 0, m)
    per = h * 60 + m
    per[(per <= 0) | (per > cap)] = np.nan
    out = np.where(a == 0, 0.0, np.where(a == 1, d * per, np.nan))
    return out

def ind_inactive(df, cfg, **_):
    mod = cfg["pa_module"]
    if mod.startswith("GPAQ"):
        parts = [(8, "p1", "p2", "p3a", "p3b"), (4, "p4", "p5", "p6a", "p6b"), (4, "p7", "p8", "p9a", "p9b"),
                 (8, "p10", "p11", "p12a", "p12b"), (4, "p13", "p14", "p15a", "p15b")]
    else:  # 동티모르 축약형: 격렬·중강도 두 문항
        parts = [(8, "px1", "px2", "px3hrs", "px3mins"), (4, "px4", "px5", "px6hrs", "px6mins")]
    met = np.zeros(len(df)); bad = np.zeros(len(df), bool)
    for mult, q, d, h, m in parts:
        v = _domain_minutes(df, q, d, h, m)
        bad |= np.isnan(v); met += np.nan_to_num(v) * mult
    y = np.where(bad, np.nan, (met < 600).astype(float))
    return y, "wstep1"

def ind_bmi25(df, cfg, **_):
    h = rng(col(df, "m11"), 100, 270); w = rng(col(df, "m12"), 20, 350)
    bmi = w / (h / 100) ** 2
    bmi = rng(bmi, 14, 60)
    preg = (col(df, "m8") == 1) & (col(df, "sex") == 2)
    y = np.where(np.isnan(bmi) | preg, np.nan, (bmi >= 25).astype(float))
    return y, "wstep2"

def ind_raisedbp(df, cfg, bp="avg23", **_):
    s = [rng(col(df, f"m{i}a"), 40, 300) for i in (4, 5, 6)]
    d = [rng(col(df, f"m{i}b"), 30, 200) for i in (4, 5, 6)]
    with np.errstate(invalid="ignore"):
        if bp == "avg23":   # STEPS 표준: 2·3회 평균(하나만 있으면 그 값, 둘 다 없으면 1회)
            sb = np.nanmean(np.vstack([s[1], s[2]]), axis=0); db = np.nanmean(np.vstack([d[1], d[2]]), axis=0)
            sb = np.where(np.isnan(sb), s[0], sb); db = np.where(np.isnan(db), d[0], db)
        else:               # 「세 번 평균」(베트남 보고서 문구)
            sb = np.nanmean(np.vstack(s), axis=0); db = np.nanmean(np.vstack(d), axis=0)
    med = col(df, "m7") == 1
    valid = np.isfinite(sb) & np.isfinite(db)
    y = np.where(valid, ((sb >= 140) | (db >= 90) | med).astype(float), np.nan)
    return y, "wstep2"

def ind_raisedglu(df, cfg, thr_mmol=7.0, **_):
    unit = cfg["glucose_unit"]
    g = col(df, "b5")
    g = g / 18.0 if unit.lower().startswith("mg") else g  # mg/dL → mmol/L
    g = rng(g, 1.0, 35.0)
    fasting = col(df, "b1") == 2
    med = (col(df, "h8") == 1) | (col(df, "b6") == 1)
    valid = fasting & np.isfinite(g)
    y = np.where(valid, ((g >= thr_mmol) | med).astype(float), np.nan)
    return y, "wstep3"

INDICATORS = {"smoking": ind_smoking, "inactive": ind_inactive, "bmi25": ind_bmi25, "raisedbp": ind_raisedbp, "raisedglu": ind_raisedglu}
# 정의가 갈리는 지표는 후보를 모두 계산해 공식값과 대조(어느 후보가 재현되는지 문서에 기록)
VARIANTS = {"raisedbp": [{"bp": "avg23"}, {"bp": "avg3"}], "raisedglu": [{"thr_mmol": 7.0}, {"thr_mmol": 6.1}]}

# ── 실행 ───────────────────────────────────────────────────
def load(path):
    p = Path(path)
    if p.suffix.lower() == ".csv":
        import pandas as pd
        df = pd.read_csv(p)
    else:
        import pyreadstat
        df, _ = (pyreadstat.read_dta if p.suffix.lower() == ".dta" else pyreadstat.read_sav)(str(p))
    df.columns = [c.lower() for c in df.columns]
    return df

def groups_for(df, cfg):
    age = col(df, "age"); sex = col(df, "sex")
    g = {"18-69": np.ones(len(df), bool), "men": sex == 1, "women": sex == 2}
    for lo, hi in cfg["age_groups"]:
        g[f"{lo}-{hi}"] = (age >= lo) & (age <= hi)
    if "urban_rural" in cfg.get("subgroups", []) and "urban_rural" in df.columns:
        ur = col(df, "urban_rural"); g["urban"] = ur == 1; g["rural"] = ur == 2
    return g

def judge(rep, off):
    """PASS: |차이| ≤ 1.0%p 또는 공식 95% CI 안"""
    if not off or off.get("pct") is None or rep is None:
        return None
    diff = rep - off["pct"]
    inside = off.get("lo") is not None and off["lo"] <= rep <= off["hi"]
    return {"official": off["pct"], "official_ci": [off.get("lo"), off.get("hi")], "diff_pp": round(diff, 2), "pass": abs(diff) <= 1.0 or bool(inside)}

def run(iso, path):
    cfg = SCHEMA["sources"][iso]
    tgt = json.loads((TARGETS / f"{iso.lower()}.json").read_text(encoding="utf-8"))
    df = load(path)
    info = {"rows": len(df), "variables": df.shape[1], "expected_rows": cfg["cases"], "expected_variables": cfg["variables"]}
    age = col(df, "age")
    df = df[(age >= 18) & (age <= 69)].reset_index(drop=True)
    st, ps = df["stratum"].to_numpy(), df["psu"].to_numpy()
    G = groups_for(df, cfg)
    out = {"iso3": iso, "survey_id": cfg["survey_id"], "year": cfg["year"], "age": "18-69", "file_check": info, "ci_method": cfg["ci"], "indicators": {}}
    for key, fn in INDICATORS.items():
        off_all = tgt["indicators"].get(key, {}).get("official", {})
        cands = VARIANTS.get(key, [{}])
        best = None
        for var in cands:
            y, wk = fn(df, cfg, **var)
            w = col(df, wk)
            res = {}
            for gname, mask in G.items():
                r = survey_prop(y, w, st, ps, mask)
                if not r:
                    continue
                lo, hi = ci(r, cfg["ci"])
                sex = "men" if gname == "men" else "women" if gname == "women" else "both"
                agek = "18-69" if gname in ("18-69", "men", "women") else gname
                off = (off_all.get(agek) or {}).get(sex)
                res[gname] = {"pct": round(100 * r["est"], 1), "lo": round(100 * lo, 1), "hi": round(100 * hi, 1), "n": r["n"], "se_pp": round(100 * r["se"], 2), "df": r["df"], "check": judge(100 * r["est"], off)}
            ok = [v["check"]["pass"] for v in res.values() if v.get("check")]
            score = (sum(ok), -abs((res.get("18-69", {}).get("check") or {}).get("diff_pp", 99)))
            cand = {"variant": var, "weight": wk, "groups": res, "checks_passed": sum(ok), "checks": len(ok)}
            if best is None or score > best[0]:
                best = (score, cand)
            out["indicators"].setdefault(key, {"candidates": []})["candidates"].append({"variant": var, "overall": res.get("18-69"), "checks_passed": sum(ok), "checks": len(ok)})
        b = best[1]
        main = b["groups"].get("18-69", {})
        verdict = "PASS" if main.get("check") and main["check"]["pass"] and b["checks_passed"] >= max(1, math.ceil(0.8 * b["checks"])) else ("NO_TARGET" if not main.get("check") else "FAIL")
        out["indicators"][key].update({"variant": b["variant"], "weight": b["weight"], "groups": b["groups"], "verdict": verdict, "checks_passed": b["checks_passed"], "checks": b["checks"]})
    return out

# ── 자체 시험(합성 자료) ────────────────────────────────────
def selftest():
    rs = np.random.default_rng(7)
    # 1) 단순임의(층 1·PSU=개인·가중치 같음) → 분산 = p(1−p)/(n−1)
    n = 400; y = (rs.random(n) < 0.3).astype(float)
    r = survey_prop(y, np.ones(n), np.zeros(n), np.arange(n))
    p = y.mean()
    assert abs(r["est"] - p) < 1e-12
    assert abs(r["se"] ** 2 - p * (1 - p) / (n - 1)) < 1e-12, (r["se"] ** 2, p * (1 - p) / (n - 1))
    # 2) 가중 평균
    w = rs.uniform(0.5, 3, n); r = survey_prop(y, w, np.zeros(n), np.arange(n))
    assert abs(r["est"] - (w * y).sum() / w.sum()) < 1e-12
    # 3) 하위집단 추정값 = 부분집합 가중평균, 결측은 분모에서 제외
    dom = rs.random(n) < 0.4; y2 = y.copy(); y2[:10] = np.nan
    r = survey_prop(y2, w, np.zeros(n), np.arange(n), dom)
    m = dom & np.isfinite(y2)
    assert abs(r["est"] - (w[m] * y2[m]).sum() / w[m].sum()) < 1e-12 and r["n"] == m.sum()
    # 4) 집락: PSU 안이 모두 같으면 분산이 커진다(설계효과 > 1), 단일 PSU 층도 오류 없음
    strata = np.repeat([0, 1, 2], [200, 190, 10]); psu = np.concatenate([np.repeat(np.arange(20), 10), np.repeat(np.arange(20, 39), 10), np.full(10, 99)])
    yc = np.concatenate([np.repeat((rs.random(39) < 0.3).astype(float), 10), np.ones(10)])
    rc = survey_prop(yc, np.ones(n), strata, psu); rsrs = survey_prop(yc, np.ones(n), np.zeros(n), np.arange(n))
    assert rc["se"] > rsrs["se"] * 2 and rc["df"] == 40 - 3
    lo, hi = ci(rc, "logit"); assert 0 < lo < rc["est"] < hi < 1
    # 5) t 분위수: 자유도 크면 1.96, 작으면 커진다
    assert abs(t_quantile(10**7) - 1.96) < 1e-3 and abs(t_quantile(30) - 2.042) < 0.002 and abs(t_quantile(10) - 2.228) < 0.01
    # 6) 지표 정의(작은 표)
    import pandas as pd
    toy = pd.DataFrame({
        "sex": [1, 2, 2, 1], "age": [30, 40, 50, 60],
        "t1": [1, 2, 77, 1],
        "m11": [170, 160, 160, 300], "m12": [80, 70, 70, 80], "m8": [np.nan, 1, 2, np.nan],
        "m4a": [150, 120, 130, 100], "m4b": [80, 70, 80, 60], "m5a": [138, 120, 145, 100], "m5b": [85, 70, 92, 60], "m6a": [136, 118, 141, 100], "m6b": [84, 70, 90, 60], "m7": [2, 1, 2, 2],
        "b1": [2, 2, 1, 2], "b5": [7.2, 5.0, 9.0, 6.5], "b6": [2, 2, 2, 2], "h8": [np.nan, np.nan, np.nan, 1],
        "p1": [2, 1, 2, 2], "p2": [np.nan, 3, np.nan, np.nan], "p3a": [np.nan, 1, np.nan, np.nan], "p3b": [np.nan, 0, np.nan, np.nan],
        **{k: [2, 2, 2, 2] for k in ("p4", "p7", "p10", "p13")},
    })
    gp = {"pa_module": "GPAQ", "glucose_unit": "mmol/L"}
    assert list(ind_smoking(toy, gp)[0][:2]) == [1.0, 0.0] and np.isnan(ind_smoking(toy, gp)[0][2])
    b = ind_bmi25(toy, gp)[0]; assert b[0] == 1.0 and np.isnan(b[1]) and b[2] == 1.0 and np.isnan(b[3])  # 임신부·키 범위 밖 제외
    bp = ind_raisedbp(toy, gp)[0]; assert list(bp) == [0.0, 1.0, 1.0, 0.0]  # 2·3회 평균 137/84.5 → 아님, 약 복용 → 해당
    bp3 = ind_raisedbp(toy, gp, bp="avg3")[0]; assert bp3[0] == 1.0  # 세 번 평균 141.3 → 해당
    gl = ind_raisedglu(toy, gp)[0]; assert gl[0] == 1.0 and gl[1] == 0.0 and np.isnan(gl[2]) and gl[3] == 1.0  # 공복 아님 제외, 약 복용
    pa = ind_inactive(toy, gp)[0]; assert list(pa) == [1.0, 0.0, 1.0, 1.0]  # 3일×60분×8 = 1,440 MET → 충분, 나머지는 활동 없음
    toy.loc[1, "p2"] = 1; toy.loc[1, "p3a"] = 1  # 1일×60분×8 = 480 < 600 → 부족
    assert ind_inactive(toy, gp)[0][1] == 1.0
    toy.loc[1, "p2"] = 2  # 2일×60×8 = 960 ≥ 600 → 충분
    assert ind_inactive(toy, gp)[0][1] == 0.0
    tl = pd.DataFrame({"b5": [126.0, 110.0, 100.0], "b1": [2, 2, 2], "b6": [2, 2, 2], "h8": [np.nan] * 3})
    gm = ind_raisedglu(tl, {"glucose_unit": "mg/dL"}, thr_mmol=7.0)[0]; assert list(gm) == [1.0, 0.0, 0.0]
    gm6 = ind_raisedglu(tl, {"glucose_unit": "mg/dL"}, thr_mmol=6.1)[0]; assert list(gm6) == [1.0, 1.0, 0.0]
    print("selftest OK — 분산 공식·가중·하위집단·집락·단일 PSU 층·t 분위수·5개 지표 정의")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("iso", nargs="?"); ap.add_argument("path", nargs="?"); ap.add_argument("--out"); ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest or not a.iso:
        selftest(); sys.exit(0)
    res = run(a.iso.upper(), a.path)
    txt = json.dumps(res, ensure_ascii=False, indent=1)
    if a.out:
        Path(a.out).parent.mkdir(parents=True, exist_ok=True); Path(a.out).write_text(txt, encoding="utf-8")
    for k, v in res["indicators"].items():
        o = v["groups"].get("18-69", {}); c = o.get("check") or {}
        print(f"{k:10s} {v['verdict']:9s} {o.get('pct')}% ({o.get('lo')}–{o.get('hi')}) n={o.get('n')} vs official {c.get('official')} diff {c.get('diff_pp')} · checks {v['checks_passed']}/{v['checks']} · {v['variant']}")
