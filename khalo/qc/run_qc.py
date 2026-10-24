"""K-HALO quality-control checks and figures. Usage: python run_qc.py ../data"""
import sys, os, json
import numpy as np, pandas as pd
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
D = sys.argv[1] if len(sys.argv) > 1 else '../data'
H = os.path.dirname(os.path.abspath(__file__)); os.makedirs(f'{H}/figures', exist_ok=True)
plt.rcParams.update({'font.family': 'DejaVu Serif', 'font.size': 9})
u = pd.read_csv(f'{D}/units.csv', dtype={'unit_id': str}); ind = pd.read_csv(f'{D}/indicators.csv')
L = pd.read_csv(f'{D}/chs_panel_long.csv', dtype={'unit_id': str})
hle = pd.read_csv(f'{D}/hle.csv', dtype={'unit_id': str}); dep = pd.read_csv(f'{D}/deprivation.csv', dtype={'unit_id': str})
bench = set(u[u.benchmark_unit == 1].unit_id)
out = {}
# 1 range check
out['rate_out_of_0_100'] = int(((L.age_std_rate < 0) | (L.age_std_rate > 100) | (L.crude_rate < 0) | (L.crude_rate > 100)).sum())
# 2 completeness on benchmark units within each indicator's published years
rows = []
for _, r in ind.iterrows():
    yrs = set(L[L.indicator_id == r.indicator_id].year)
    exp = len(bench) * len(yrs)
    got = L[(L.indicator_id == r.indicator_id) & L.unit_id.isin(bench) & L.age_std_rate.notna()].shape[0]
    rows.append({'indicator_id': r.indicator_id, 'name_en': r.name_en, 'years': len(yrs), 'expected_cells': exp, 'filled_cells': got, 'completeness_pct': round(got / exp * 100, 1)})
C = pd.DataFrame(rows); C.to_csv(f'{H}/completeness_by_indicator.csv', index=False)
out['completeness_benchmark_units_pct'] = round(C.filled_cells.sum() / C.expected_cells.sum() * 100, 2)
# 3 crude vs age-standardised agreement
both = L.dropna(subset=['crude_rate', 'age_std_rate'])
out['crude_vs_std_pearson_r'] = round(float(np.corrcoef(both.crude_rate, both.age_std_rate)[0, 1]), 4)
out['crude_vs_std_median_abs_diff_pp'] = round(float((both.crude_rate - both.age_std_rate).abs().median()), 2)
# 4 year-on-year jump screen (|Δ| > 4 SD of the indicator's Δ distribution)
S = L.dropna(subset=['age_std_rate']).sort_values(['unit_id', 'indicator_id', 'year'])
S['d'] = S.groupby(['unit_id', 'indicator_id']).age_std_rate.diff()
z = S.groupby('indicator_id').d.transform(lambda x: (x - x.mean()) / x.std())
out['yoy_jumps_over_4sd'] = int((z.abs() > 4).sum()); out['yoy_pairs'] = int(S.d.notna().sum())
out['yoy_jumps_over_4sd_pct'] = round(out['yoy_jumps_over_4sd'] / out['yoy_pairs'] * 100, 3)
# 5 HLE plausibility
hl = hle.dropna(subset=['healthy_life_expectancy', 'life_expectancy'])
out['hle_le_violations'] = int((hl.healthy_life_expectancy > hl.life_expectancy).sum())
out['hle_range'] = [float(hl.healthy_life_expectancy.min()), float(hl.healthy_life_expectancy.max())]
out['le_range'] = [float(hl.life_expectancy.min()), float(hl.life_expectancy.max())]
json.dump(out, open(f'{H}/qc_summary.json', 'w'), indent=1); print(json.dumps(out, indent=1))
# Figure 1: completeness heatmap indicators x years (benchmark units)
piv = L[L.unit_id.isin(bench) & L.age_std_rate.notna()].groupby(['indicator_id', 'year']).size().unstack().reindex(ind.indicator_id) / len(bench) * 100
fig, ax = plt.subplots(figsize=(7.2, 6.2), dpi=200)
im = ax.imshow(piv.values, aspect='auto', cmap='Greens', vmin=0, vmax=100)
ax.set_yticks(range(len(piv))); ax.set_yticklabels([n[:46] for n in ind.name_en], fontsize=6)
ax.set_xticks(range(len(piv.columns))); ax.set_xticklabels(piv.columns, rotation=90, fontsize=7)
fig.colorbar(im, ax=ax, shrink=0.6, label='% of 245 benchmark units with a value')
ax.set_title('Figure 1. Coverage of 41 indicators by year (blank = not surveyed that year)', fontsize=8.5)
fig.tight_layout(); fig.savefig(f'{H}/figures/fig1_coverage.png'); plt.close(fig)
# Figure 2: HLE vs deprivation (latest)
y = hle.year.max(); m = hle[hle.year == y].merge(dep, on='unit_id')
fig, ax = plt.subplots(figsize=(6.0, 3.6), dpi=200)
sc = ax.scatter(m.deprivation_index, m.healthy_life_expectancy, s=9, c=m.life_expectancy, cmap='viridis', alpha=0.85)
b = np.polyfit(m.deprivation_index, m.healthy_life_expectancy, 1); xs = np.linspace(m.deprivation_index.min(), m.deprivation_index.max(), 50)
ax.plot(xs, np.polyval(b, xs), color='#b9442c', lw=1.2)
r = np.corrcoef(m.deprivation_index, m.healthy_life_expectancy)[0, 1]
ax.set_xlabel('Area deprivation index (2020; higher = more deprived)'); ax.set_ylabel(f'Healthy life expectancy, {y} (years)')
fig.colorbar(sc, ax=ax, label='Life expectancy (years)')
ax.set_title(f'Figure 2. HLE vs. deprivation across {len(m)} districts (r = {r:.2f})', fontsize=8.5)
fig.tight_layout(); fig.savefig(f'{H}/figures/fig2_hle_deprivation.png'); plt.close(fig)
print('r_hle_dep', round(r, 3), 'n', len(m))
