# K-HALO — Korea Healthy Ageing and Longevity District Panel, 2008–2025 (v1.0)

An AI-ready, fully documented longitudinal panel for **healthy ageing at small-area level** in South Korea, a country that became a super-aged society (≥20 % aged 65+) in December 2024.

- **41 health indicators**: smoking, alcohol, physical activity, obesity, mental health, oral health (incl. chewing difficulty at 65+), hypertension and diabetes (diagnosis, treatment, complication screening), preventive care, unmet medical need, self-rated health. Crude and age-standardised rates.
- **281 spatial units**: every Community Health Survey (CHS) health-centre area (235 districts + 46 sub-districts). A non-overlapping **benchmark set of 245 units** covers the whole country.
- **18 survey years** (2008–2025), 154,691 unit-year-indicator values.
- **Linked longevity and context tables**: district life expectancy and healthy life expectancy (2017–2023, research estimates), area deprivation index (2020), older-adult population (2024).
- **Three benchmark tasks with baselines**: T1 forecasting, T2 healthy-life-expectancy regression, T3 equity audit.
- **No personal data**: area-level aggregate statistics only.

## Files
| Path | Content |
|---|---|
| `data/units.csv` | 281 units: names (KO/EN), province, level, area type, Statistics Korea 2018 codes, benchmark flag |
| `data/indicators.csv` | 41 indicators: EN/KO names, domain, denominator, direction, years, source table |
| `data/chs_panel_long.csv` | unit × year × indicator, crude and age-standardised rate |
| `data/chs_panel_wide_std.csv` | unit × year, 41 age-standardised columns (ML-ready) |
| `data/hle.csv` | life expectancy, healthy life expectancy, unhealthy years (3-year pooled) |
| `data/deprivation.csv` | deprivation index, quintile and 7 census components (2020) |
| `data/population_age.csv` | population and 65+/75+/85+ counts (2024) |
| `data/khalo.sqlite` | all tables in one SQLite database |
| `metadata/data_dictionary.csv` | every column of every file |
| `croissant.json` | MLCommons Croissant 1.0 metadata (with Responsible-AI fields) |
| `DATASHEET.md` | Datasheet for Datasets (motivation, composition, collection, uses, limitations) |
| `benchmarks/` | task definitions, fixed splits, `run_baselines.py`, results |
| `qc/` | quality-control script, completeness table, figures |
| `tools/` | scripts that rebuild the package from the source statistics |

## Quick start
```python
import pandas as pd
wide  = pd.read_csv("data/chs_panel_wide_std.csv", dtype={"unit_id": str})
units = pd.read_csv("data/units.csv", dtype={"unit_id": str})
bench = wide[wide.unit_id.isin(units.loc[units.benchmark_unit == 1, "unit_id"])]
print(bench.groupby("year").DT_H_OR_INCONV.mean())   # chewing difficulty (65+), national trend
```
Reproduce the baselines: `pip install pandas scikit-learn && python benchmarks/run_baselines.py data`

## Benchmark tasks (baseline results in `benchmarks/results/`)
| Task | Definition | Best baseline (test) |
|---|---|---|
| T1 Forecasting | Predict next-year age-standardised rate of 10 ageing-related indicators from past values; train ≤2021, validation 2022–23, test 2024–25 | Ridge: mean MAE 2.96 pp, 14 % better than persistence |
| T2 HLE regression | Predict 2023 district healthy life expectancy from 40 determinants (self-rated health excluded to prevent leakage), deprivation and ageing share; leave-one-province-out | Ridge: MAE 1.00 year, R² 0.51 |
| T3 Equity audit | Error of T1/T2 models by deprivation quintile | Gradient boosting T1 error is 27 % higher in the most deprived quintile |

## Licence and attribution
Released under **CC BY-NC 4.0**: free for research, education and other non-commercial use with attribution; contact the author for commercial licensing. The underlying official statistics remain freely available from KOSIS. Source statistics are official open data distributed on KOSIS (kosis.kr) under the Korea Open Government Licence Type 1 (attribution). Please cite K-HALO and the original producers: Korea Disease Control and Prevention Agency (Community Health Survey) and Statistics Korea (vital statistics, resident registration population, Population and Housing Census). Healthy life expectancy and the deprivation index are derived research estimates, not official statistics.

## Citation
Seo S. *K-HALO: Korea Healthy Ageing and Longevity district panel, 2008–2025* (v1.0). IEEE DataPort, 2026.
