"""K-HALO benchmark tasks and baseline results.
T1  one-step-ahead forecasting of 10 ageing-related indicators (age-standardised %), temporal split
T2  healthy life expectancy (HLE) regression from determinants, leave-one-province-out
T3  equity audit: T1/T2 errors by area deprivation quintile
Usage: python run_baselines.py ../data  → results/*.csv, splits/*.csv
"""
import sys, os, json
import numpy as np, pandas as pd
from sklearn.linear_model import RidgeCV
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
D = sys.argv[1] if len(sys.argv) > 1 else '../data'
HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(f'{HERE}/results', exist_ok=True); os.makedirs(f'{HERE}/splits', exist_ok=True)
SEED = 20261030
units = pd.read_csv(f'{D}/units.csv', dtype={'unit_id': str, 'parent_unit_id': str})
wide = pd.read_csv(f'{D}/chs_panel_wide_std.csv', dtype={'unit_id': str})
dep = pd.read_csv(f'{D}/deprivation.csv', dtype={'unit_id': str})
hle = pd.read_csv(f'{D}/hle.csv', dtype={'unit_id': str})
pop = pd.read_csv(f'{D}/population_age.csv', dtype={'unit_id': str})
bench = units[units.benchmark_unit == 1].copy()
# sub-districts inherit census-district covariates (deprivation, population) from their parent city
bench['census_unit'] = np.where(bench.level == 'sub-district', bench.parent_unit_id, bench.unit_id)
q = dep.set_index('unit_id').deprivation_quintile
bench['dep_quintile'] = bench.census_unit.map(q)
IND = [c for c in wide.columns if c.startswith('DT_')]
TARGETS = ['DT_H_OR_INCONV', 'DT_HYPER_DOCTOR', 'DT_DIA_DOCTOR', 'DT_H_MENTAL_DEPRESS', 'DT_H_EX_WALK',
           'DT_H_OBE_OBE', 'DT_HEALTH_RECOG', 'DT_INFLUENZA', 'DT_HYPER_DOCTOR_DRUG', 'DT_DIA_TREAT']
W = wide[wide.unit_id.isin(bench.unit_id)].set_index(['unit_id', 'year']).sort_index()

# ---------- T1 forecasting ----------
def split_of(y): return 'train' if y <= 2021 else 'val' if y <= 2023 else 'test'
rows = []
years = sorted(W.index.get_level_values(1).unique())
lag1 = W.groupby(level=0).shift(1); lag2 = W.groupby(level=0).shift(2); lag3 = W.groupby(level=0).shift(3)
area = bench.set_index('unit_id').area_type
feat = pd.concat([lag1.add_suffix('_l1'), lag2[TARGETS].add_suffix('_l2'), lag3[TARGETS].add_suffix('_l3')], axis=1)
feat['year'] = feat.index.get_level_values(1)
for a in ['metropolitan', 'urban', 'rural', 'mixed']:
    feat[f'area_{a}'] = (feat.index.get_level_values(0).map(area) == a).astype(int)
split = pd.Series([split_of(y) for y in feat.index.get_level_values(1)], index=feat.index)
split.rename('split').reset_index().to_csv(f'{HERE}/splits/t1_temporal_split.csv', index=False)
res, preds = [], []
for t in TARGETS:
    y = W[t]; m = y.notna() & lag1[t].notna() & (feat.year >= 2010)
    X, Y, S = feat[m], y[m], split[m]
    tr, te = S == 'train', S == 'test'
    cand = {
        'persistence (last value)': lag1[t][m],
        'mean of last 3 years': pd.concat([lag1[t], lag2[t], lag3[t]], axis=1)[m].mean(axis=1),
    }
    ridge = make_pipeline(SimpleImputer(strategy='median'), StandardScaler(), RidgeCV(alphas=np.logspace(-2, 3, 12)))
    ridge.fit(X[tr | (S == 'val')], Y[tr | (S == 'val')]); cand['ridge (lags of all 41 indicators)'] = pd.Series(ridge.predict(X), index=X.index)
    gbm = HistGradientBoostingRegressor(max_iter=400, learning_rate=0.05, max_leaf_nodes=31, random_state=SEED)
    gbm.fit(X[tr | (S == 'val')], Y[tr | (S == 'val')]); cand['gradient boosting (lags of all 41 indicators)'] = pd.Series(gbm.predict(X), index=X.index)
    base = None
    for name, p in cand.items():
        e = (p[te] - Y[te]).abs()
        mae = e.mean()
        if base is None: base = mae
        res.append({'task': 'T1', 'target': t, 'model': name, 'test_years': '2024-2025', 'n_test': int(te.sum()), 'MAE_pp': round(mae, 3),
                    'RMSE_pp': round(float(np.sqrt(((p[te] - Y[te]) ** 2).mean())), 3), 'skill_vs_persistence': round(1 - mae / base, 3)})
        preds.append(pd.DataFrame({'unit_id': e.index.get_level_values(0), 'year': e.index.get_level_values(1), 'target': t, 'model': name, 'abs_err': e.values}))
t1 = pd.DataFrame(res); t1.to_csv(f'{HERE}/results/t1_forecasting.csv', index=False)
P = pd.concat(preds)

# ---------- T2 HLE regression ----------
H = hle[hle.year == hle.year.max()].set_index('unit_id')
hy = int(hle.year.max())
cand_units = units[(units.level == 'district')].set_index('unit_id')
X2 = W.reset_index()
X2 = X2[(X2.year >= hy - 2) & (X2.year <= hy)]
# district-level rows only (HLE is computed for districts; cities with sub-districts use the city row)
avg = wide[(wide.year >= hy - 2) & (wide.year <= hy)].groupby('unit_id')[IND].mean()
FE = [c for c in IND if c != 'DT_HEALTH_RECOG']  # self-rated health enters the HLE estimate → excluded to avoid leakage
df2 = avg[FE].join(H[['healthy_life_expectancy']], how='inner')
df2 = df2.join(dep.set_index('unit_id')[['deprivation_index']]).join(pop.set_index('unit_id')[['pct_age65_plus']])
df2 = df2[df2.index.isin(cand_units.index)].dropna(subset=['healthy_life_expectancy'])
prov = cand_units.province_en.reindex(df2.index)
pd.DataFrame({'unit_id': df2.index, 'fold_province': prov.values}).to_csv(f'{HERE}/splits/t2_leave_one_province_out.csv', index=False)
Xc, Yc = df2.drop(columns='healthy_life_expectancy'), df2.healthy_life_expectancy
models = {'mean (province-agnostic)': None,
          'ridge': make_pipeline(SimpleImputer(strategy='median'), StandardScaler(), RidgeCV(alphas=np.logspace(-2, 3, 12))),
          'gradient boosting': HistGradientBoostingRegressor(max_iter=300, learning_rate=0.05, max_leaf_nodes=15, random_state=SEED)}
res2, p2 = [], {}
for name, mdl in models.items():
    pr = pd.Series(index=Xc.index, dtype=float)
    for pv in prov.unique():
        te = prov == pv; tr = ~te
        if mdl is None: pr[te] = Yc[tr].mean()
        else: mdl.fit(Xc[tr], Yc[tr]); pr[te] = mdl.predict(Xc[te])
    e = (pr - Yc).abs(); p2[name] = e
    ss = ((Yc - Yc.mean()) ** 2).sum()
    res2.append({'task': 'T2', 'target': f'healthy_life_expectancy_{hy}', 'model': name, 'cv': 'leave-one-province-out (17 folds)',
                 'n': len(Yc), 'MAE_years': round(e.mean(), 3), 'R2': round(1 - ((pr - Yc) ** 2).sum() / ss, 3)})
t2 = pd.DataFrame(res2); t2.to_csv(f'{HERE}/results/t2_hle_regression.csv', index=False)

# ---------- T3 equity audit ----------
qmap = bench.set_index('unit_id').dep_quintile
P['dep_quintile'] = P.unit_id.map(qmap)
best = 'gradient boosting (lags of all 41 indicators)'
t3a = (P[P.model.isin(['persistence (last value)', best])].groupby(['model', 'dep_quintile']).abs_err.mean().unstack().round(3))
t3a.insert(0, 'task', 'T3 (on T1 test, all 10 targets)')
qd = dep.set_index('unit_id').deprivation_quintile
t3b = pd.DataFrame({n: e.groupby(qd.reindex(e.index)).mean() for n, e in p2.items()}).T.round(3)
t3b.insert(0, 'task', 'T3 (on T2 LOPO)')
t3 = pd.concat([t3a, t3b]); t3.columns = ['task'] + [f'Q{int(c)}' for c in t3.columns[1:]]
t3['Q5_over_Q1'] = (t3['Q5'] / t3['Q1']).round(2)
t3.to_csv(f'{HERE}/results/t3_equity_audit.csv')
summary = t1.groupby('model').agg(MAE_pp=('MAE_pp', 'mean'), skill=('skill_vs_persistence', 'mean')).round(3)
print(summary.to_string()); print(t2.to_string(index=False)); print(t3.to_string())
