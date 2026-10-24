"""data_dictionary.csv + Croissant (MLCommons) JSON-LD 메타데이터 생성"""
import csv, json, os, hashlib, sys
ROOT = sys.argv[1] if len(sys.argv) > 1 else 'khalo'
D = f'{ROOT}/data'
DESC = {
 'units.csv': ('Spatial units: 281 Community Health Survey (CHS) health-centre areas (districts and sub-districts)', {
  'unit_id': ('string', 'K-HALO unit identifier (stable across tables)'),
  'name_ko': ('string', 'Official Korean name'), 'name_en': ('string', 'Romanised name (Revised Romanization, official spellings where assimilation applies)'),
  'province_ko': ('string', 'Province/metropolitan city (Korean)'), 'province_en': ('string', 'Province/metropolitan city (English)'),
  'level': ('string', "'district' (si/gun/gu) or 'sub-district' (health-centre area inside a city)"),
  'parent_unit_id': ('string', 'Parent district for sub-districts; empty for districts'),
  'admin_type': ('string', "gu (urban ward), si (city), gun (county, mostly rural), or health-centre area"),
  'area_type': ('string', 'metropolitan / urban / rural / mixed (derived from admin_type and province)'),
  'kostat_sgg_code_2018': ('string', 'Statistics Korea 5-digit sigungu code(s), 2018 boundaries; ";"-separated when several map to one unit'),
  'first_year': ('integer', 'First survey year with data'), 'last_year': ('integer', 'Last survey year with data'),
  'status': ('string', 'active / started_later / ended / no_data (administrative changes)'),
  'has_subunits': ('integer', '1 if the district is surveyed through sub-district health centres'),
  'benchmark_unit': ('integer', '1 = included in the non-overlapping benchmark set (245 units)')}),
 'indicators.csv': ('Data dictionary of the 41 CHS indicators', {
  'indicator_id': ('string', 'KOSIS statistical table id (also the column name in the wide file)'),
  'name_en': ('string', 'Indicator name (English)'), 'name_ko': ('string', 'Indicator name (Korean, official)'),
  'domain_en': ('string', 'Domain (English)'), 'domain_ko': ('string', 'Domain (Korean)'), 'population': ('string', 'Denominator population'),
  'unit': ('string', 'Always percent'), 'higher_is_worse': ('integer', '1 = higher value is unfavourable, 0 = favourable, empty = neutral'),
  'first_year': ('integer', 'First year published'), 'last_year': ('integer', 'Last year published'), 'n_years': ('integer', 'Number of survey years'),
  'source_table_ko': ('string', 'Official KOSIS table title'), 'source': ('string', 'Producer and distributor')}),
 'chs_panel_long.csv': ('Long panel: one row per unit x year x indicator (2008-2025)', {
  'unit_id': ('string', 'FK to units.csv'), 'year': ('integer', 'Survey year'), 'indicator_id': ('string', 'FK to indicators.csv'),
  'crude_rate': ('float', 'Crude (survey-weighted) prevalence, %'), 'age_std_rate': ('float', 'Age-standardised prevalence, % (KDCA standard population)')}),
 'chs_panel_wide_std.csv': ('Wide panel of age-standardised rates: one row per unit x year, 41 indicator columns', {
  'unit_id': ('string', 'FK to units.csv'), 'year': ('integer', 'Survey year'), 'DT_*': ('float', 'Age-standardised rate (%) of the indicator named in indicators.csv; empty = not surveyed')}),
 'hle.csv': ('Life expectancy and healthy life expectancy (HLE) at birth, 3-year pooled, research estimates', {
  'unit_id': ('string', 'FK to units.csv'), 'year': ('integer', 'Centre year of the 3-year window'),
  'life_expectancy': ('float', 'Life expectancy at birth (years), Chiang abridged life table from deaths and mid-year population'),
  'healthy_life_expectancy': ('float', 'HLE at birth (years), Sullivan method, unhealthy share calibrated to Statistics Korea national subjective-health HLE'),
  'unhealthy_years': ('float', 'life_expectancy - healthy_life_expectancy'),
  'good_self_rated_health_3yr': ('float', '3-year mean age-standardised good self-rated health (%), the regional input to HLE'),
  'unhealthy_odds_ratio': ('float', 'Odds ratio of unhealthy state vs national, applied to the national age curve'),
  'deaths_3yr': ('integer', 'Deaths in the 3-year window (units with <150 deaths are not estimated)')}),
 'deprivation.csv': ('Area deprivation index (2020), reproduction of Kim et al. (2013) from census aggregates', {
  'unit_id': ('string', 'FK to units.csv (district level)'), 'year': ('integer', 'Census year'),
  'deprivation_index': ('float', 'Sum of z-scores of 7 census variables (higher = more deprived)'), 'deprivation_quintile': ('integer', '1 = least, 5 = most deprived'),
  'rank': ('integer', '1 = most deprived'), 'pct_edu': ('float', '% of ages 30-64 with less than high school'), 'pct_aged': ('float', '% aged 65+'),
  'pct_cls': ('float', '% of workers in low-skill occupations'), 'pct_one': ('float', '% one-person households'), 'pct_apt': ('float', '% not living in apartments'),
  'pct_fem': ('float', '% female-headed households'), 'pct_div': ('float', '% divorced or widowed'), 'z_*': ('float', 'z-score of each component')}),
 'population_age.csv': ('Mid-year resident population and older-adult counts, 2024', {
  'unit_id': ('string', 'FK to units.csv (district level)'), 'year': ('integer', 'Reference year'), 'population': ('integer', 'Total mid-year resident population'),
  'age65_plus': ('integer', 'Residents aged 65+'), 'age75_plus': ('integer', 'Residents aged 75+'), 'age85_plus': ('integer', 'Residents aged 85+'),
  'pct_age65_plus': ('float', 'Share aged 65+ (%)')}),
}
rows = []
for f, (fd, cols) in DESC.items():
    for c, (t, d) in cols.items(): rows.append({'file': f, 'column': c, 'type': t, 'description': d, 'file_description': fd})
w = csv.DictWriter(open(f'{ROOT}/metadata/data_dictionary.csv', 'w', newline='', encoding='utf-8'), list(rows[0]), lineterminator='\n'); w.writeheader(); w.writerows(rows)
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
TY = {'string': 'sc:Text', 'integer': 'sc:Integer', 'float': 'sc:Float'}
dist, rsets = [], []
for f, (fd, cols) in DESC.items():
    fid = f.replace('.csv', '')
    dist.append({'@type': 'cr:FileObject', '@id': fid, 'name': f, 'contentUrl': f'data/{f}', 'encodingFormat': 'text/csv', 'sha256': sha(f'{D}/{f}'), 'description': fd})
    fields = []
    hdr = next(csv.reader(open(f'{D}/{f}', encoding='utf-8')))
    for c in hdr:
        key = c if c in cols else ('DT_*' if c.startswith('DT_') else 'z_*' if c.startswith('z_') else None)
        t, d = cols[key] if key else ('string', '')
        if c.startswith('DT_'): d = f'Age-standardised rate (%) of {c}'
        fields.append({'@type': 'cr:Field', '@id': f'{fid}/{c}', 'name': c, 'description': d, 'dataType': TY[t], 'source': {'fileObject': {'@id': fid}, 'extract': {'column': c}}})
    rsets.append({'@type': 'cr:RecordSet', '@id': f'{fid}_records', 'name': fid, 'description': fd, 'field': fields})
dist.append({'@type': 'cr:FileObject', '@id': 'khalo_sqlite', 'name': 'khalo.sqlite', 'contentUrl': 'data/khalo.sqlite', 'encodingFormat': 'application/vnd.sqlite3', 'sha256': sha(f'{D}/khalo.sqlite'), 'description': 'All tables in one SQLite database'})
cro = {
 '@context': {'@language': 'en', '@vocab': 'https://schema.org/', 'sc': 'https://schema.org/', 'cr': 'http://mlcommons.org/croissant/', 'rai': 'http://mlcommons.org/croissant/RAI/',
              'dct': 'http://purl.org/dc/terms/', 'citeAs': 'cr:citeAs', 'column': 'cr:column', 'conformsTo': 'dct:conformsTo', 'data': {'@id': 'cr:data', '@type': '@json'},
              'dataType': {'@id': 'cr:dataType', '@type': '@vocab'}, 'extract': 'cr:extract', 'field': 'cr:field', 'fileObject': 'cr:fileObject', 'recordSet': 'cr:recordSet',
              'source': 'cr:source', 'contentUrl': 'sc:contentUrl', 'sha256': 'sc:sha256', 'encodingFormat': 'sc:encodingFormat'},
 '@type': 'sc:Dataset', 'conformsTo': 'http://mlcommons.org/croissant/1.0',
 'name': 'K-HALO', 'alternateName': 'Korea Healthy Ageing and Longevity district panel, 2008-2025',
 'description': 'An AI-ready, fully documented longitudinal panel of 41 health-behaviour, chronic-disease and preventive-care indicators for all 281 Community Health Survey areas of South Korea (2008-2025), linked to district life expectancy, healthy life expectancy, area deprivation and older-adult population, with three benchmark tasks (forecasting, HLE regression, equity audit) and baseline results.',
 'license': 'https://creativecommons.org/licenses/by/4.0/', 'version': '1.0.0', 'datePublished': '2026-10-30',
 'creator': {'@type': 'sc:Person', 'name': 'Soonryeo Seo', 'description': 'Independent researcher'},
 'keywords': ['healthy ageing', 'healthy life expectancy', 'AgeTech', 'panel data', 'small-area health', 'health equity', 'forecasting', 'South Korea'],
 'citeAs': 'Seo S. K-HALO: Korea Healthy Ageing and Longevity district panel, 2008-2025 (v1.0). IEEE DataPort, 2026.',
 'isAccessibleForFree': True, 'inLanguage': ['en', 'ko'], 'spatialCoverage': 'Republic of Korea (281 health-centre areas)', 'temporalCoverage': '2008/2025',
 'rai:dataCollection': 'Secondary compilation of official aggregate statistics published on KOSIS (Korea Disease Control and Prevention Agency Community Health Survey; Statistics Korea vital statistics, resident registration and census). No new data were collected from people.',
 'rai:personalSensitiveInformation': 'None. Only area-level aggregate statistics; no individual records.',
 'rai:dataBiases': 'Self-reported survey measures; healthy life expectancy is a research estimate driven mainly by self-rated health; sub-district units inherit census covariates from their parent city; 2020-2021 values affected by COVID-19.',
 'rai:dataUseCases': 'Small-area forecasting of ageing-related health indicators; explaining and predicting healthy life expectancy; auditing AI fairness across deprivation levels; prioritising AgeTech and preventive services.',
 'distribution': dist, 'recordSet': rsets}
json.dump(cro, open(f'{ROOT}/metadata/croissant.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('dictionary rows', len(rows), 'recordsets', len(rsets))
