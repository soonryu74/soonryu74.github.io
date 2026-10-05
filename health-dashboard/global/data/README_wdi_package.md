# Health Equity Radar — World Bank WDI data package

Source file: WDI_CSV.zip supplied by user
WDI file date in archive: 2026-10-01
Selected indicators: 25
Economies/countries represented in latest dataset: 217
Latest observations: 4977
Time-series observations (2000+): 115457

## Files
- health_equity_wdi_indicator_metadata.csv — selected indicators, definitions, source and WDI license field
- health_equity_wdi_latest.csv — latest available observation by country/economy and indicator
- health_equity_wdi_latest.json — app-friendly latest dataset
- health_equity_wdi_timeseries_2000_latest.csv — time series from 2000 onward
- health_equity_wdi_coverage.csv — coverage / freshness audit

## License screening
Only indicators whose WDISeries.csv `License Type` equals `CC BY-4.0` were included in the first-pass product dataset.
This is a metadata-level screening, not a legal opinion. Preserve attribution and source metadata, and review any third-party source-specific terms before commercial launch.

## Important
Different indicators have different latest years. The UI should always display the observation year.
Do not label the dataset as real-time.
