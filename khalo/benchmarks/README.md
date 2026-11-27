# K-HALO benchmark tasks
Benchmark units: the 245 rows of `data/units.csv` with `benchmark_unit = 1` (non-overlapping, continuously active).
All splits are fixed and stored in `splits/`. Run `python run_baselines.py ../data` (pandas, scikit-learn; seed 20261030).

## T1 — one-step-ahead forecasting
- Targets (age-standardised %): chewing difficulty 65+ (DT_H_OR_INCONV), hypertension and diabetes prevalence and treatment
  (DT_HYPER_DOCTOR, DT_HYPER_DOCTOR_DRUG, DT_DIA_DOCTOR, DT_DIA_TREAT), depressive mood (DT_H_MENTAL_DEPRESS),
  walking (DT_H_EX_WALK), obesity (DT_H_OBE_OBE), good self-rated health (DT_HEALTH_RECOG), influenza vaccination (DT_INFLUENZA).
- Input: all indicators up to year t-1 (lags 1-3), area type. Output: value in year t.
- Split: train target years 2010-2021, validation 2022-2023, test 2024-2025 (`splits/t1_temporal_split.csv`).
- Metric: MAE in percentage points; skill = 1 - MAE/MAE(persistence).

## T2 — healthy life expectancy regression
- Target: 2023 HLE at birth for 228 districts (`data/hle.csv`).
- Input: 2021-2023 mean of 40 indicators (self-rated health excluded: it is an input of the HLE estimate), deprivation index, % aged 65+.
- Validation: leave-one-province-out, 17 folds (`splits/t2_leave_one_province_out.csv`). Metrics: MAE (years), R².

## T3 — equity audit
- Report T1 and T2 errors by deprivation quintile (Q1 least, Q5 most deprived; sub-districts use their parent city's quintile)
  and the ratio Q5/Q1. A fair model keeps the ratio close to 1.

## Baseline results (v1.0)
See `results/t1_forecasting.csv`, `results/t2_hle_regression.csv`, `results/t3_equity_audit.csv`.
