diff --git a/CHANGELOG.md b/CHANGELOG.md
index f2378c8b11b0bb6253c7e21071d56ce5f4755231..f82091b469be9e3794f6382b68e1c4b1e4f254f0 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -1,19 +1,28 @@

# Changelog

## [Unreleased]

### Added

- feat(cli): introduce `wv check`, `wv schedule --week`, and `wv notify` commands with Asia/Dubai alignment
- feat(providers): integrate Stormglass, Open-Meteo Marine, NOAA WaveWatch III, Copernicus, and deterministic sample fallback with disk cache
- feat(scheduler): generate 7-day ETD/ETA slots, CSV/ICS exports, and risk annotations with cargo limit escalation
- feat(notify): deliver templated alerts via Email, Slack, and Telegram with dry-run mode and environment-based recipients
  +- feat(marine_ops): add `MarineOpsSettings` and `fetch_forecast_with_fallback` for resilient connector bootstrapping
  +- feat(core): provide ADNOC × Al Bahar fusion with `decide_and_eta` for Go/Conditional/No-Go and ETA buffers
- feat(docs): document cron/Task Scheduler automation, `.env` configuration, and developer workflow

### Changed

- refactor(core): centralize domain models with Pydantic `LogiBaseModel` and bilingual docstrings
- refactor(cli): adopt Typer-based modular layout with dependency injection hooks for testing
- refactor(config): move packaging to `pyproject.toml` with `[project.optional-dependencies].all`

### Fixed

- fix(cache): ensure last-known forecast (≤3 h) is returned when providers fail or rate-limit
- fix(risk): enforce 2-decimal rounding and environment-driven thresholds across CLI outputs

+## [0.1.0] - 2025-09-30
+
+### Added
+- feat(marine_ops): add Stormglass, WorldTides, and Open-Meteo fallback connectors normalized to a shared schema with unit metadata
+- feat(core): implement unit conversions, quality control, bias correction, and weighted ensemble utilities for marine datasets
+- feat(eri): deliver ERI v0 rule loader, computation pipeline, sample CSV generators, and PowerShell health check
diff --git a/README.md b/README.md
index 56e9fba3a74727a669adec26c329f30f839ce61e..5c4282ab11be5358cdfcbe4096e5186beeb897fa 100644
--- a/README.md
+++ b/README.md
@@ -3,62 +3,127 @@
 Weather Vessel delivers marine weather intelligence, risk scoring, and voyage scheduling for logistics control towers. The CLI aggregates multiple providers (Stormglass, Open-Meteo Marine, NOAA WaveWatch III, Copernicus) with automatic fallback, disk caching, and timezone-safe scheduling in **Asia/Dubai**.

## Key Features

- 🌊 **Multi-provider marine data** with retries, quota-aware backoff, and cache fallback (≤3 h)
- 🧭 **Risk assessment** from significant wave height, wind speed/direction, and swell parameters
- 📅 **7-day voyage schedule** with CSV and ICS exports and fixed 2-decimal metrics
- 📣 **Notifications** via Email (default), Slack, and Telegram with dry-run support
- ⏱️ **Twice-daily checks** aligned to 06:00 / 17:00 Asia/Dubai for automated alerts

## Installation

```bash
 python -m venv .venv
 source .venv/bin/activate
 pip install -e .[all]
 cp .env.example .env
```

 Set the relevant API keys and notification endpoints in `.env`. Never commit real credentials.

### Required Environment Variables

| Variable                                             | Description                                            |
| ---------------------------------------------------- | ------------------------------------------------------ |
| -                                                    | `WV_STORMGLASS_API_KEY`                              |
| +                                                    | `STORMGLASS_API_KEY`                                 |
| +                                                    | `WORLDTIDES_API_KEY`                                 |
| +                                                    | `OPEN_METEO_BASE`                                    |
| +                                                    | `OPEN_METEO_TIMEOUT`                                 |
| +                                                    | `APP_LOG_LEVEL`                                      |
| +                                                    | `TZ`                                                 |
| +                                                    | `WV_STORMGLASS_API_KEY`                              |
| `WV_OPEN_METEO_ENDPOINT`                           | Optional custom Open-Meteo base URL                    |
| `WV_NOAA_WW3_ENDPOINT`                             | Optional NOAA WaveWatch III JSON endpoint              |
| `WV_COPERNICUS_ENDPOINT` / `WV_COPERNICUS_TOKEN` | Optional Copernicus API configuration                  |
| `WV_SMTP_*`                                        | SMTP host/port/credentials for email                   |
| `WV_EMAIL_RECIPIENTS`                              | Comma separated default recipients                     |
| `WV_SLACK_WEBHOOK`                                 | Slack webhook URL (optional)                           |
| `WV_TELEGRAM_TOKEN` / `WV_TELEGRAM_CHAT_ID`      | Telegram bot configuration                             |
| `WV_OUTPUT_DIR`                                    | Directory for generated CSV/ICS (default `outputs/`) |

 Risk thresholds can be tuned via `WV_MEDIUM_WAVE_THRESHOLD`, `WV_HIGH_WAVE_THRESHOLD`, `WV_MEDIUM_WIND_THRESHOLD`, and `WV_HIGH_WIND_THRESHOLD`.

+### Marine Operations Toolkit (`marine_ops`)
+
+The new `marine_ops` package provides a reusable toolkit for hybrid AGI/DAS workflows:
+
+- **Connectors**: Stormglass, WorldTides, and Open-Meteo fallback clients that normalize responses into a common schema with ISO 8601 UTC timestamps and per-variable unit metadata.
+- **Core utilities**: Unit conversions, quality control (physical bounds + IQR clipping), μ/σ bias correction, and weighted ensemble blending with 2-decimal precision.
+- **ERI v0**: Externalized YAML rules converted into a 0–100 Environmental Readiness Index (ERI) score with quality badges highlighting data gaps and bias adjustments.
+- **Settings + Fallback**: `MarineOpsSettings` bootstraps connectors from environment variables while `fetch_forecast_with_fallback` routes around Stormglass rate limits/timeouts using Open-Meteo Marine.
+
+``python +import datetime as dt + +from marine_ops.connectors import OpenMeteoFallback, StormglassConnector, fetch_forecast_with_fallback +from marine_ops.core import MarineOpsSettings +from marine_ops.eri import compute_eri_timeseries, load_rule_set + +settings = MarineOpsSettings.from_env() +stormglass = settings.build_stormglass_connector() +fallback = settings.build_open_meteo_fallback() +start = dt.datetime.now(tz=dt.timezone.utc) +end = start + dt.timedelta(days=3) +series = fetch_forecast_with_fallback(25.0, 55.0, start, end, stormglass, fallback) +rules = load_rule_set("tests/marine_ops/fixtures/eri_rules.yaml") +eri_points = compute_eri_timeseries(series, rules) +``
+
+### ADNOC × Al Bahar voyage fusion
+
+- Harmonise **Combined(seas)**, onshore/offshore significant wave height, and wind guidance into a single decision.
+- Apply calibrated shrinkage (`α=0.85`, `β=0.80`) and alert weighting (`γ=0.15` for *rough at times*, `γ=0.30` for **High seas**).
+- Produce **Go / Conditional / No-Go** plus ETA and buffer minutes with a minimal speed-loss model (`f_wind`, `f_wave`).
+
+```python
+from wv.core.fusion import FusionInputs, decide_and_eta
+
+inputs = FusionInputs(

+ combined_ft=6.0,
+ wind_adnoc=20.0,
+ hs_onshore_ft=1.5,
+ hs_offshore_ft=3.0,
+ wind_albahar=20.0,
+ alert="rough at times westward",
+ offshore_weight=0.35,
+ distance_nm=35.0,
+ planned_speed_kt=12.0,
  +)
+ 

+decision = decide_and_eta(inputs)
+print(decision.model_dump())
+# {'hs_fused_m': 1.43, 'wind_fused_kt': 20.0, 'decision': 'Conditional Go (coastal window)',
+#  'eta_hours': 3.32, 'buffer_minutes': 45}
+```
+
+### Sample CSVs & Health Check
+
+- Generate RFC 4180 compliant samples: `python scripts/generate_sample_csv.py --output .`
+- Smoke test running services on ports **3000–3005**: `powershell .\scripts\health_check.ps1`
+- Sample outputs live at `sample_timeseries.csv` and `sample_jobs.csv`, ready for downstream ingestion tests.
+

## Usage

 All commands honor `.env` configuration and display values rounded to two decimal places.

### Immediate risk snapshot

```bash
 wv check --now --route MW4-AGI
 wv check --now --lat 24.40 --lon 54.70 --hours 72
```

### Weekly schedule generation

```bash
 wv schedule --week --route MW4-AGI --vessel DUNE_SAND --vessel-speed 12 --route-distance 120 --cargo-hs-limit 2.5
```

 Outputs:

- Table printed to STDOUT (Asia/Dubai timestamps)
- `outputs/schedule_week.csv`
- `outputs/schedule_week.ics`

 Override the export path with `WV_OUTPUT_DIR`.

@@ -80,40 +145,42 @@ Schedule the twice-daily checks at **06:00** and **17:00 Asia/Dubai**.

### Linux/macOS (cron)

```
 0 6,17 * * * /usr/local/bin/wv notify --route MW4-AGI >> /var/log/wv.log 2>&1
```

### Windows Task Scheduler

```
 schtasks /Create /SC DAILY /MO 1 /TN "WV_0600" /TR "wv notify --route MW4-AGI" /ST 06:00
 schtasks /Create /SC DAILY /MO 1 /TN "WV_1700" /TR "wv notify --route MW4-AGI" /ST 17:00
```

## Development

```bash
 pip install -e .[all]
 pytest -q --cov=src
 black --check .
 isort --check-only .
 flake8 .
 mypy --strict src
```

+The `tests/marine_ops` suite exercises connector normalization, unit conversion, QC/bias/ensemble pipelines, and end-to-end ERI scoring from the sample CSV fixtures (coverage ≥ 70%).
+

### Running Smoke Tests

```bash
 wv check --now --lat 24.40 --lon 54.70
 wv schedule --week --route MW4-AGI --vessel DUNE_SAND
 wv notify --dry-run --route MW4-AGI
```

## Caching Strategy

 Forecast results are cached on disk at `~/.wv/cache/` with a 3-hour TTL. Provider outages (timeouts, HTTP 429, 5xx) cause the manager to fall back to the next provider or last known cache hit.

## License

 MIT License. See `LICENSE` for details.
diff --git a/docs/en/usage.md b/docs/en/usage.md
index 4769a0f320e7a89a15ce454fe70822eb5e957c56..4533915da20b95beb392e2609a811d0668bc387d 100644
--- a/docs/en/usage.md
+++ b/docs/en/usage.md
@@ -1,8 +1,10 @@

# Weather Vessel Usage Guide

- Install dependencies with `pip install -e .[all]`.
- Configure providers and notifications via `.env` (see `.env.example`).
- Run `wv check --now --route MW4-AGI` for instant risk scoring.
- Run `wv schedule --week --route MW4-AGI` to emit STDOUT table, CSV, and ICS artefacts.
- Trigger alerts with `wv notify --route MW4-AGI --dry-run --slack --telegram`.
- Automate at 06:00 / 17:00 Asia/Dubai using cron or Windows Task Scheduler examples from the README.
  +- Bootstrap marine connectors with `MarineOpsSettings.from_env()` and call `fetch_forecast_with_fallback` when Stormglass is rate limited.
  +- Fuse ADNOC Combined(seas) and Al Bahar on/offshore guidance with `wv.core.fusion.decide_and_eta` for Go/Conditional/No-Go decisions.
  diff --git a/docs/kr/usage.md b/docs/kr/usage.md
  index 3641003a1f14c59b146e23d5d0f1f232e8cfe893..3e77b90081856ebcd659aa659d3ba6538a03a15c 100644
  --- a/docs/kr/usage.md
  +++ b/docs/kr/usage.md
  @@ -1,8 +1,10 @@

# 웨더 베슬 사용 가이드

- `pip install -e .[all]` 명령으로 의존성을 설치합니다.
- `.env.example`을 참고하여 `.env`에 공급자 및 알림 환경변수를 설정합니다.
- `wv check --now --route MW4-AGI`로 즉시 위험 평가를 확인합니다.
- `wv schedule --week --route MW4-AGI` 명령으로 주간 일정표, CSV, ICS를 생성합니다.
- `wv notify --route MW4-AGI --dry-run --slack --telegram`으로 채널별 알림을 검증합니다.
- README의 예시를 활용해 Asia/Dubai 기준 06:00/17:00 자동화를 cron 또는 Windows 작업 스케줄러에 등록합니다.
  +- `MarineOpsSettings.from_env()`로 커넥터를 초기화하고 Stormglass가 제한되면 `fetch_forecast_with_fallback`으로 Open-Meteo 폴백을 호출합니다.
  +- ADNOC Combined(seas)와 Al Bahar 연안/외해 지시를 `wv.core.fusion.decide_and_eta`로 융합해 Go/Conditional/No-Go 결정을 얻습니다.
  diff --git a/pyproject.toml b/pyproject.toml
  index 1b9295cbf2668f424f079d4b139b9a24a0452b99..a5c34616f091519f37c05c53b8fe271151f575fe 100644
  --- a/pyproject.toml
  +++ b/pyproject.toml
  @@ -1,51 +1,53 @@
  [build-system]
  requires = ["setuptools>=68", "wheel"]
  build-backend = "setuptools.build_meta"

 [project]
 name = "weather-vessel"
 version = "0.1.0"
 description = "Marine weather intelligence and scheduling CLI"
 readme = "README.md"
 requires-python = ">=3.11"
 authors = [{ name = "Weather Vessel Team" }]
 dependencies = [
     "httpx>=0.25",
     "pydantic>=2.5",
     "python-dotenv>=1.0",
     "typer>=0.9",
     "pytz>=2023.3",

+ "PyYAML>=6.0",
  ]

 [project.optional-dependencies]
 all = [
     "httpx>=0.25",
     "pydantic>=2.5",
     "python-dotenv>=1.0",
     "typer>=0.9",
     "pytz>=2023.3",

+ "PyYAML>=6.0",
  "pytest>=8.0",
  "pytest-cov>=4.1",
  "black>=24.0",
  "isort>=5.13",
  "flake8>=7.0",
  "mypy>=1.10",
  ]

 [project.scripts]
 wv = "wv.cli:main"

 [tool.black]
 line-length = 100
 target-version = ["py311"]

 [tool.isort]
 profile = "black"
 line_length = 100

 [tool.flake8]
 max-line-length = 100
 extend-ignore = ["E203"]

 [tool.mypy]
 python_version = "3.11"
diff --git a/sample_jobs.csv b/sample_jobs.csv
new file mode 100644
index 0000000000000000000000000000000000000000..fd86d231252231060238551743d2dcb0949d7da6
--- /dev/null
+++ b/sample_jobs.csv
@@ -0,0 +1,3 @@
+job_id,latitude,longitude,start,end
+demo-001,25.00,55.00,2025-01-01T00:00:00Z,2025-01-02T00:00:00Z
+demo-002,24.50,54.80,2025-01-01T12:00:00Z,2025-01-02T12:00:00Z
diff --git a/sample_timeseries.csv b/sample_timeseries.csv
new file mode 100644
index 0000000000000000000000000000000000000000..b718d3f8bab3840e7d9d35adff5c1c9a8cd01bf2
--- /dev/null
+++ b/sample_timeseries.csv
@@ -0,0 +1,25 @@
+timestamp,latitude,longitude,variable,value,unit,source,quality_flag,bias_corrected,ensemble_weight
+2025-01-01T00:00:00Z,25.00,55.00,Hs,1.20,m,sample,raw,false,
+2025-01-01T00:00:00Z,25.00,55.00,U10,8.00,m/s,sample,raw,false,
+2025-01-01T00:00:00Z,25.00,55.00,U10_DIR,180.00,deg,sample,raw,false,
+2025-01-01T00:00:00Z,25.00,55.00,Vis,15.00,km,sample,raw,false,
+2025-01-01T01:00:00Z,25.00,55.00,Hs,1.30,m,sample,raw,false,
+2025-01-01T01:00:00Z,25.00,55.00,U10,9.00,m/s,sample,raw,false,
+2025-01-01T01:00:00Z,25.00,55.00,U10_DIR,180.00,deg,sample,raw,false,
+2025-01-01T01:00:00Z,25.00,55.00,Vis,15.00,km,sample,raw,false,
+2025-01-01T02:00:00Z,25.00,55.00,Hs,1.40,m,sample,raw,false,
+2025-01-01T02:00:00Z,25.00,55.00,U10,10.00,m/s,sample,raw,false,
+2025-01-01T02:00:00Z,25.00,55.00,U10_DIR,180.00,deg,sample,raw,false,
+2025-01-01T02:00:00Z,25.00,55.00,Vis,15.00,km,sample,raw,false,
+2025-01-01T03:00:00Z,25.00,55.00,Hs,1.50,m,sample,raw,false,
+2025-01-01T03:00:00Z,25.00,55.00,U10,11.00,m/s,sample,raw,false,
+2025-01-01T03:00:00Z,25.00,55.00,U10_DIR,180.00,deg,sample,raw,false,
+2025-01-01T03:00:00Z,25.00,55.00,Vis,15.00,km,sample,raw,false,
+2025-01-01T04:00:00Z,25.00,55.00,Hs,1.60,m,sample,raw,false,
+2025-01-01T04:00:00Z,25.00,55.00,U10,12.00,m/s,sample,raw,false,
+2025-01-01T04:00:00Z,25.00,55.00,U10_DIR,180.00,deg,sample,raw,false,
+2025-01-01T04:00:00Z,25.00,55.00,Vis,15.00,km,sample,raw,false,
+2025-01-01T05:00:00Z,25.00,55.00,Hs,1.70,m,sample,raw,false,
+2025-01-01T05:00:00Z,25.00,55.00,U10,13.00,m/s,sample,raw,false,
+2025-01-01T05:00:00Z,25.00,55.00,U10_DIR,180.00,deg,sample,raw,false,
+2025-01-01T05:00:00Z,25.00,55.00,Vis,15.00,km,sample,raw,false,
diff --git a/scripts/generate_sample_csv.py b/scripts/generate_sample_csv.py
new file mode 100644
index 0000000000000000000000000000000000000000..c8eac932ce8fc7fa33851c29690680072207824b
--- /dev/null
+++ b/scripts/generate_sample_csv.py
@@ -0,0 +1,131 @@
+"""샘플 CSV 생성 스크립트. Sample CSV generation script."""
+
+from __future__ import annotations
+
+import argparse
+import csv
+import datetime as dt
+from pathlib import Path
+
+from marine_ops import (

+ CSV_HEADER,
+ CSV_TIMESTAMP_FORMAT,
+ MarineDataPoint,
+ MarineMeasurement,
+ MarineTimeseries,
+ MarineVariable,
+ Position,
+ TimeseriesMetadata,
+ UnitEnum,
  +)
+ 

+DEFAULT_OUTPUT = Path(__file__).resolve().parent.parent
+
+
+def build_sample_timeseries() -> MarineTimeseries:

+ """데모용 해양 시계열 구성. Build demo marine timeseries."""
+ 
+ base_time = dt.datetime(2025, 1, 1, 0, 0, tzinfo=dt.timezone.utc)
+ metadata = TimeseriesMetadata(
+ source="sample",
+ source_url=None,
+ units={
+ MarineVariable.SIGNIFICANT_WAVE_HEIGHT: UnitEnum.METERS,
+ MarineVariable.WIND_SPEED_10M: UnitEnum.METERS_PER_SECOND,
+ MarineVariable.WIND_DIRECTION_10M: UnitEnum.DEGREES,
+ MarineVariable.VISIBILITY: UnitEnum.KILOMETERS,
+ },
+ )
+ points: list[MarineDataPoint] = []
+ for hour in range(6):
+ timestamp = base_time + dt.timedelta(hours=hour)
+ measurements = [
+ MarineMeasurement(
+ variable=MarineVariable.SIGNIFICANT_WAVE_HEIGHT,
+ value=1.2 + 0.1 * hour,
+ unit=UnitEnum.METERS,
+ ),
+ MarineMeasurement(
+ variable=MarineVariable.WIND_SPEED_10M,
+ value=8.0 + hour,
+ unit=UnitEnum.METERS_PER_SECOND,
+ ),
+ MarineMeasurement(
+ variable=MarineVariable.WIND_DIRECTION_10M,
+ value=180.0,
+ unit=UnitEnum.DEGREES,
+ ),
+ MarineMeasurement(
+ variable=MarineVariable.VISIBILITY,
+ value=15.0,
+ unit=UnitEnum.KILOMETERS,
+ ),
+ ]
+ points.append(
+ MarineDataPoint(
+ timestamp=timestamp,
+ position=Position(latitude=25.0, longitude=55.0),
+ measurements=measurements,
+ metadata=metadata,
+ )
+ )
+ return MarineTimeseries(points=points)
+ 
+ 

+def write_timeseries_csv(timeseries: MarineTimeseries, path: Path) -> None:

+ """시계열 CSV 저장. Save timeseries CSV."""
+ 
+ with path.open("w", newline="", encoding="utf-8") as handle:
+ writer = csv.writer(handle)
+ writer.writerow(CSV_HEADER)
+ for row in timeseries.iter_rows():
+ writer.writerow(row)
+ 
+ 

+def write_jobs_csv(path: Path) -> None:

+ """작업 샘플 CSV 저장. Save jobs sample CSV."""
+ 
+ header = ("job_id", "latitude", "longitude", "start", "end")
+ base_time = dt.datetime(2025, 1, 1, tzinfo=dt.timezone.utc)
+ rows = [
+ (
+ "demo-001",
+ "25.00",
+ "55.00",
+ base_time.strftime(CSV_TIMESTAMP_FORMAT),
+ (base_time + dt.timedelta(hours=24)).strftime(CSV_TIMESTAMP_FORMAT),
+ ),
+ (
+ "demo-002",
+ "24.50",
+ "54.80",
+ (base_time + dt.timedelta(hours=12)).strftime(CSV_TIMESTAMP_FORMAT),
+ (base_time + dt.timedelta(hours=36)).strftime(CSV_TIMESTAMP_FORMAT),
+ ),
+ ]
+ with path.open("w", newline="", encoding="utf-8") as handle:
+ writer = csv.writer(handle)
+ writer.writerow(header)
+ writer.writerows(rows)
+ 
+ 

+def main() -> None:

+ """샘플 CSV 생성 실행. Execute sample CSV generation."""
+ 
+ parser = argparse.ArgumentParser(description="Generate sample marine operations CSV files")
+ parser.add_argument(
+ "--output", type=Path, default=DEFAULT_OUTPUT, help="Target directory for CSV files"
+ )
+ args = parser.parse_args()
+ output_dir = args.output
+ output_dir.mkdir(parents=True, exist_ok=True)
+ timeseries_path = output_dir / "sample_timeseries.csv"
+ jobs_path = output_dir / "sample_jobs.csv"
+ write_timeseries_csv(build_sample_timeseries(), timeseries_path)
+ write_jobs_csv(jobs_path)
+ print(f"Generated {timeseries_path}")
+ print(f"Generated {jobs_path}")
+ 
+ 

+if __name__ == "__main__":

+ main()
  diff --git a/scripts/health_check.ps1 b/scripts/health_check.ps1
  new file mode 100644
  index 0000000000000000000000000000000000000000..745e2ad6c15bc3db9e920930a4336c44beaa8784
  --- /dev/null
  +++ b/scripts/health_check.ps1
  @@ -0,0 +1,38 @@
  +param(
+ [string]$HostName = "localhost"
  +)
+ 

+Write-Host "Scanning ports 3000-3005 on $HostName..."
+$ports = 3000..3005
+$reachable = @()
+foreach ($port in $ports) {

+ $result = Test-NetConnection -ComputerName $HostName -Port $port -WarningAction SilentlyContinue
+ if ($result.TcpTestSucceeded) {
+ $reachable += $port
+ }
  +}
+ 

+if (-not $reachable) {

+ Write-Warning "No active ports discovered in range."
+ exit 1
  +}
+ 

+foreach ($port in $reachable) {

+ $uri = "http://$HostName:$port/api/health/connectors"
+ Write-Host "Testing $uri"
+ try {
+ $response = Invoke-WebRequest -Uri $uri -UseBasicParsing -TimeoutSec 5
+ if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
+ Write-Host "Port $port health check passed" -ForegroundColor Green
+ } else {
+ Write-Error "Health check failed on port $port with status $($response.StatusCode)"
+ exit 1
+ }
+ }
+ catch {
+ Write-Error "Failed to contact $uri. $_"
+ exit 1
+ }
  +}
+ 

+Write-Host "Connector smoke tests completed successfully."
diff --git a/src/marine_ops/__init__.py b/src/marine_ops/__init__.py
new file mode 100644
index 0000000000000000000000000000000000000000..7b29a4872b754cad404939cf0d8e40f736262f4a
--- /dev/null
+++ b/src/marine_ops/__init__.py
@@ -0,0 +1,43 @@
+"""해양 운항 분석 툴킷. Marine operations analytics toolkit."""
+
+from .core.schema import (

+ CSV_HEADER,
+ CSV_TIMESTAMP_FORMAT,
+ MarineDataPoint,
+ MarineMeasurement,
+ MarineTimeseries,
+ MarineVariable,
+ Position,
+ QualityFlag,
+ TimeseriesMetadata,
+ UnitEnum,
  +)
  +from .core.settings import MarineOpsSettings
  +from .core.units import (
+ feet_to_meters,
+ knots_to_meters_per_second,
+ meters_per_second_to_knots,
+ meters_to_feet,
  +)
  +from .eri.compute import compute_eri_timeseries
  +from .eri.rules import load_rule_set
+ 

+__all__ = [

+ "CSV_HEADER",
+ "CSV_TIMESTAMP_FORMAT",
+ "MarineDataPoint",
+ "MarineMeasurement",
+ "MarineTimeseries",
+ "MarineVariable",
+ "Position",
+ "QualityFlag",
+ "TimeseriesMetadata",
+ "UnitEnum",
+ "MarineOpsSettings",
+ "feet_to_meters",
+ "knots_to_meters_per_second",
+ "meters_per_second_to_knots",
+ "meters_to_feet",
+ "compute_eri_timeseries",
+ "load_rule_set",
  +]
  diff --git a/src/marine_ops/connectors/__init__.py b/src/marine_ops/connectors/__init__.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..70b080bf6fbb652caf9c6c3dbe93bc7ebb774821
  --- /dev/null
  +++ b/src/marine_ops/connectors/__init__.py
  @@ -0,0 +1,17 @@
  +"""커넥터 패키지. Connectors package."""
+ 

+from .open_meteo_fallback import (

+ FALLBACK_STATUS_CODES,
+ OpenMeteoFallback,
+ fetch_forecast_with_fallback,
  +)
  +from .stormglass import StormglassConnector
  +from .worldtides import WorldTidesConnector
+ 

+__all__ = [

+ "FALLBACK_STATUS_CODES",
+ "OpenMeteoFallback",
+ "StormglassConnector",
+ "WorldTidesConnector",
+ "fetch_forecast_with_fallback",
  +]
  diff --git a/src/marine_ops/connectors/open_meteo_fallback.py b/src/marine_ops/connectors/open_meteo_fallback.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..aaa7012db767c41031dea9145500fc761e7e4bda
  --- /dev/null
  +++ b/src/marine_ops/connectors/open_meteo_fallback.py
  @@ -0,0 +1,187 @@
  +"""Open-Meteo 폴백 커넥터. Open-Meteo fallback connector."""
+ 

+from __future__ import annotations
+
+import datetime as dt
+import logging
+from typing import TYPE_CHECKING, Any, Sequence, cast
+
+import httpx
+from pydantic import HttpUrl
+
+from ..core.schema import (

+ MarineDataPoint,
+ MarineMeasurement,
+ MarineTimeseries,
+ MarineVariable,
+ Position,
+ TimeseriesMetadata,
+ UnitEnum,
  +)
+ 

+if TYPE_CHECKING:

+ from .stormglass import StormglassConnector
+ 

+OPEN_METEO_URL = "https://marine-api.open-meteo.com/v1/marine"
+FALLBACK_STATUS_CODES: tuple[int, ...] = (408, 425, 429, 500, 502, 503, 504)
+
+logger = logging.getLogger(__name__)
+
+
+class OpenMeteoFallback:

+ """Open-Meteo 예보 폴백. Open-Meteo forecast fallback."""
+ 
+ def __init__(
+ self,
+ base_url: str = OPEN_METEO_URL,
+ client: httpx.Client | None = None,
+ timeout: float = 10.0,
+ ) -> None:
+ self.base_url = base_url
+ self.client = client or httpx.Client(timeout=timeout)
+ 
+ def fetch_forecast(
+ self,
+ latitude: float,
+ longitude: float,
+ start: dt.datetime,
+ end: dt.datetime,
+ ) -> MarineTimeseries:
+ """Open-Meteo 해양 예보 조회. Fetch Open-Meteo marine forecast."""
+ 
+ params: dict[str, str | float] = {
+ "latitude": latitude,
+ "longitude": longitude,
+ "hourly": "significant_wave_height,wave_direction,wave_period,wind_speed_10m,wind_direction_10m,visibility",  # noqa: E501
+ "start_date": start.date().isoformat(),
+ "end_date": end.date().isoformat(),
+ "timezone": "UTC",
+ }
+ response = self.client.get(self.base_url, params=params)
+ response.raise_for_status()
+ payload = response.json()
+ hourly = payload.get("hourly", {})
+ timestamps = hourly.get("time", [])
+ points: list[MarineDataPoint] = []
+ metadata_units = {
+ MarineVariable.SIGNIFICANT_WAVE_HEIGHT: UnitEnum.METERS,
+ MarineVariable.WIND_SPEED_10M: UnitEnum.METERS_PER_SECOND,
+ MarineVariable.WIND_DIRECTION_10M: UnitEnum.DEGREES,
+ MarineVariable.VISIBILITY: UnitEnum.KILOMETERS,
+ MarineVariable.SWELL_DIRECTION: UnitEnum.DEGREES,
+ MarineVariable.SWELL_PERIOD: UnitEnum.SECONDS,
+ }
+ for index, timestamp_str in enumerate(timestamps):
+ timestamp = dt.datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
+ if timestamp.tzinfo is None:
+ timestamp = timestamp.replace(tzinfo=dt.timezone.utc)
+ else:
+ timestamp = timestamp.astimezone(dt.timezone.utc)
+ measurements: list[MarineMeasurement] = []
+ self._append_measurement(
+ hourly,
+ "significant_wave_height",
+ index,
+ MarineVariable.SIGNIFICANT_WAVE_HEIGHT,
+ UnitEnum.METERS,
+ measurements,
+ )
+ self._append_measurement(
+ hourly,
+ "wave_direction",
+ index,
+ MarineVariable.SWELL_DIRECTION,
+ UnitEnum.DEGREES,
+ measurements,
+ )
+ self._append_measurement(
+ hourly,
+ "wave_period",
+ index,
+ MarineVariable.SWELL_PERIOD,
+ UnitEnum.SECONDS,
+ measurements,
+ )
+ self._append_measurement(
+ hourly,
+ "wind_speed_10m",
+ index,
+ MarineVariable.WIND_SPEED_10M,
+ UnitEnum.METERS_PER_SECOND,
+ measurements,
+ )
+ self._append_measurement(
+ hourly,
+ "wind_direction_10m",
+ index,
+ MarineVariable.WIND_DIRECTION_10M,
+ UnitEnum.DEGREES,
+ measurements,
+ )
+ self._append_measurement(
+ hourly,
+ "visibility",
+ index,
+ MarineVariable.VISIBILITY,
+ UnitEnum.KILOMETERS,
+ measurements,
+ )
+ if not measurements:
+ continue
+ metadata = TimeseriesMetadata(
+ source="open-meteo",
+ source_url=cast(HttpUrl, str(httpx.URL(self.base_url))),
+ units=metadata_units,
+ )
+ points.append(
+ MarineDataPoint(
+ timestamp=timestamp,
+ position=Position(latitude=latitude, longitude=longitude),
+ measurements=measurements,
+ metadata=metadata,
+ )
+ )
+ return MarineTimeseries(points=points)
+ 
+ @staticmethod
+ def _append_measurement(
+ hourly: dict[str, Any],
+ key: str,
+ index: int,
+ variable: MarineVariable,
+ unit: UnitEnum,
+ container: list[MarineMeasurement],
+ ) -> None:
+ values = hourly.get(key)
+ if not values:
+ return
+ try:
+ value = values[index]
+ except IndexError:
+ return
+ if value is None:
+ return
+ container.append(MarineMeasurement(variable=variable, value=float(value), unit=unit))
+ 
+ 

+def fetch_forecast_with_fallback(

+ latitude: float,
+ longitude: float,
+ start: dt.datetime,
+ end: dt.datetime,
+ primary: "StormglassConnector",
+ fallback: "OpenMeteoFallback",
+ retry_statuses: Sequence[int] = FALLBACK_STATUS_CODES,
  +) -> MarineTimeseries:
+ """Stormglass 장애 시 폴백. Use Open-Meteo when Stormglass fails."""
+ 
+ try:
+ return primary.fetch_forecast(latitude, longitude, start, end)
+ except httpx.HTTPStatusError as exc:
+ status = exc.response.status_code
+ if status not in retry_statuses:
+ raise
+ logger.warning("Stormglass HTTP %s triggered fallback: %s", status, exc.response.text)
+ except (httpx.TimeoutException, httpx.RequestError) as exc:
+ logger.warning("Stormglass request error triggered fallback: %s", exc)
+ return fallback.fetch_forecast(latitude, longitude, start, end)
  diff --git a/src/marine_ops/connectors/stormglass.py b/src/marine_ops/connectors/stormglass.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..a3bb13f186f7b0704ae27186a89ad68e983b2903
  --- /dev/null
  +++ b/src/marine_ops/connectors/stormglass.py
  @@ -0,0 +1,115 @@
  +"""Stormglass 커넥터. Stormglass connector."""
+ 

+from __future__ import annotations
+
+import datetime as dt
+from typing import Any, Sequence, cast
+
+import httpx
+from pydantic import HttpUrl
+
+from ..core.schema import (

+ MarineDataPoint,
+ MarineMeasurement,
+ MarineTimeseries,
+ MarineVariable,
+ Position,
+ TimeseriesMetadata,
+ UnitEnum,
  +)
+ 

+STORMGLASS_URL = "https://api.stormglass.io/v2/weather/point"
+STORMGLASS_PARAMS: tuple[tuple[str, MarineVariable, UnitEnum], ...] = (

+ ("waveHeight", MarineVariable.SIGNIFICANT_WAVE_HEIGHT, UnitEnum.METERS),
+ ("swellHeight", MarineVariable.SWELL_HEIGHT, UnitEnum.METERS),
+ ("swellPeriod", MarineVariable.SWELL_PERIOD, UnitEnum.SECONDS),
+ ("swellDirection", MarineVariable.SWELL_DIRECTION, UnitEnum.DEGREES),
+ ("windSpeed", MarineVariable.WIND_SPEED_10M, UnitEnum.METERS_PER_SECOND),
+ ("windDirection", MarineVariable.WIND_DIRECTION_10M, UnitEnum.DEGREES),
+ ("visibility", MarineVariable.VISIBILITY, UnitEnum.KILOMETERS),
  +)
+ 
+ 

+class StormglassConnector:

+ """Stormglass 해양 예보 수집기. Stormglass marine forecast fetcher."""
+ 
+ def __init__(
+ self,
+ api_key: str,
+ client: httpx.Client | None = None,
+ base_url: str = STORMGLASS_URL,
+ timeout: float = 10.0,
+ ) -> None:
+ self.api_key = api_key
+ self.base_url = base_url
+ self.timeout = timeout
+ self.client = client or httpx.Client(timeout=timeout)
+ 
+ def fetch_forecast(
+ self,
+ latitude: float,
+ longitude: float,
+ start: dt.datetime,
+ end: dt.datetime,
+ source_priority: Sequence[str] = ("sg", "noaa"),
+ ) -> MarineTimeseries:
+ """Stormglass 7-10일 예보 조회. Fetch 7-10 day Stormglass forecast."""
+ 
+ params: dict[str, str | float] = {
+ "lat": latitude,
+ "lng": longitude,
+ "params": ",".join(key for key, *_ in STORMGLASS_PARAMS),
+ "start": start.replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z"),
+ "end": end.replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z"),
+ "source": ",".join(source_priority),
+ }
+ headers = {"Authorization": self.api_key}
+ response = self.client.get(self.base_url, params=params, headers=headers)
+ response.raise_for_status()
+ payload = response.json()
+ hours: list[dict[str, Any]] = payload.get("hours", [])
+ metadata_units = {variable: unit for _, variable, unit in STORMGLASS_PARAMS}
+ points: list[MarineDataPoint] = []
+ for hour in hours:
+ timestamp = dt.datetime.fromisoformat(hour["time"].replace("Z", "+00:00"))
+ if timestamp.tzinfo is None:
+ timestamp = timestamp.replace(tzinfo=dt.timezone.utc)
+ else:
+ timestamp = timestamp.astimezone(dt.timezone.utc)
+ measurements: list[MarineMeasurement] = []
+ for key, variable, unit in STORMGLASS_PARAMS:
+ value_entry = hour.get(key)
+ if not isinstance(value_entry, dict):
+ continue
+ value = self._choose_source(value_entry, source_priority)
+ if value is None:
+ continue
+ measurements.append(
+ MarineMeasurement(variable=variable, value=float(value), unit=unit)
+ )
+ if not measurements:
+ continue
+ metadata = TimeseriesMetadata(
+ source="stormglass",
+ source_url=cast(HttpUrl, str(httpx.URL(self.base_url))),
+ units=metadata_units,
+ )
+ points.append(
+ MarineDataPoint(
+ timestamp=timestamp,
+ position=Position(latitude=latitude, longitude=longitude),
+ measurements=measurements,
+ metadata=metadata,
+ )
+ )
+ return MarineTimeseries(points=points)
+ 
+ @staticmethod
+ def _choose_source(value_entry: dict[str, Any], priority: Sequence[str]) -> float | None:
+ for source in priority:
+ if source in value_entry and value_entry[source] is not None:
+ return float(value_entry[source])
+ for value in value_entry.values():
+ if value is not None:
+ return float(value)
+ return None
  diff --git a/src/marine_ops/connectors/worldtides.py b/src/marine_ops/connectors/worldtides.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..f97f953160f54c65819ef108ac42ecdab8cb73de
  --- /dev/null
  +++ b/src/marine_ops/connectors/worldtides.py
  @@ -0,0 +1,89 @@
  +"""WorldTides 커넥터. WorldTides connector."""
+ 

+from __future__ import annotations
+
+import datetime as dt
+from typing import Any, cast
+
+import httpx
+from pydantic import HttpUrl
+
+from ..core.schema import (

+ MarineDataPoint,
+ MarineMeasurement,
+ MarineTimeseries,
+ MarineVariable,
+ Position,
+ TimeseriesMetadata,
+ UnitEnum,
  +)
+ 

+WORLDTIDES_URL = "https://www.worldtides.info/api"
+
+
+class WorldTidesConnector:

+ """WorldTides 수위 시계열 수집기. WorldTides tide timeseries fetcher."""
+ 
+ def __init__(
+ self,
+ api_key: str,
+ client: httpx.Client | None = None,
+ base_url: str = WORLDTIDES_URL,
+ timeout: float = 10.0,
+ ) -> None:
+ self.api_key = api_key
+ self.base_url = base_url
+ self.timeout = timeout
+ self.client = client or httpx.Client(timeout=timeout)
+ 
+ def fetch_heights(
+ self,
+ latitude: float,
+ longitude: float,
+ start: dt.datetime,
+ hours: int = 72,
+ ) -> MarineTimeseries:
+ """WorldTides 수위 30분 시계열 조회. Fetch 30-minute tide heights."""
+ 
+ params: dict[str, str | int | float] = {
+ "heights": "",
+ "extremes": "",
+ "lat": latitude,
+ "lon": longitude,
+ "key": self.api_key,
+ "step": 30,
+ "start": int(start.replace(tzinfo=dt.timezone.utc).timestamp()),
+ "length": hours,
+ }
+ response = self.client.get(self.base_url, params=params)
+ response.raise_for_status()
+ payload = response.json()
+ heights: list[dict[str, Any]] = payload.get("heights", [])
+ points: list[MarineDataPoint] = []
+ metadata_units = {MarineVariable.TIDE_HEIGHT: UnitEnum.METERS}
+ for height in heights:
+ timestamp = dt.datetime.fromisoformat(height["date"].replace("Z", "+00:00"))
+ if timestamp.tzinfo is None:
+ timestamp = timestamp.replace(tzinfo=dt.timezone.utc)
+ else:
+ timestamp = timestamp.astimezone(dt.timezone.utc)
+ value = float(height["height"])
+ measurement = MarineMeasurement(
+ variable=MarineVariable.TIDE_HEIGHT,
+ value=value,
+ unit=UnitEnum.METERS,
+ )
+ metadata = TimeseriesMetadata(
+ source="worldtides",
+ source_url=cast(HttpUrl, str(httpx.URL(self.base_url))),
+ units=metadata_units,
+ )
+ points.append(
+ MarineDataPoint(
+ timestamp=timestamp,
+ position=Position(latitude=latitude, longitude=longitude),
+ measurements=[measurement],
+ metadata=metadata,
+ )
+ )
+ return MarineTimeseries(points=points)
  diff --git a/src/marine_ops/core/__init__.py b/src/marine_ops/core/__init__.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..f58ad9fb248fb07b8e6baca9645c8b0064f0bbe0
  --- /dev/null
  +++ b/src/marine_ops/core/__init__.py
  @@ -0,0 +1,14 @@
  +"""코어 유틸리티 패키지. Core utilities package."""
+ 

+from .bias import apply_bias_correction
+from .ensemble import weighted_ensemble
+from .qc import apply_quality_controls, compute_iqr_bounds
+from .settings import MarineOpsSettings
+
+__all__ = [

+ "apply_bias_correction",
+ "apply_quality_controls",
+ "compute_iqr_bounds",
+ "MarineOpsSettings",
+ "weighted_ensemble",
  +]
  diff --git a/src/marine_ops/core/bias.py b/src/marine_ops/core/bias.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..eea7033bfad5fdbc2965bf341101658290cd1e4f
  --- /dev/null
  +++ b/src/marine_ops/core/bias.py
  @@ -0,0 +1,85 @@
  +"""편향 보정 모듈. Bias correction module."""
+ 

+from __future__ import annotations
+
+from math import isclose
+from statistics import mean, pstdev
+from typing import Mapping
+
+from .schema import (

+ MarineDataPoint,
+ MarineMeasurement,
+ MarineTimeseries,
+ MarineVariable,
+ TimeseriesMetadata,
  +)
+ 
+ 

+def _stats(values: list[float]) -> tuple[float, float]:

+ if not values:
+ return (0.0, 0.0)
+ mu = mean(values)
+ sigma = pstdev(values) if len(values) > 1 else 0.0
+ return (mu, sigma)
+ 
+ 

+def apply_bias_correction(

+ timeseries: MarineTimeseries,
+ background: Mapping[MarineVariable, list[float]],
+ enabled: bool = True,
  +) -> MarineTimeseries:
+ """μ/σ 기반 편향 보정. Mean/std based bias correction."""
+ 
+ if not enabled:
+ return timeseries
+ 
+ value_map: dict[MarineVariable, list[float]] = {}
+ for point in timeseries.points:
+ for measurement in point.measurements:
+ value_map.setdefault(measurement.variable, []).append(measurement.value)
+ 
+ series_stats: dict[MarineVariable, tuple[float, float]] = {}
+ background_stats: dict[MarineVariable, tuple[float, float]] = {}
+ 
+ for variable, values in value_map.items():
+ series_stats[variable] = _stats(values)
+ background_values = background.get(variable, [])
+ background_stats[variable] = _stats(list(background_values))
+ 
+ corrected_points: list[MarineDataPoint] = []
+ for point in timeseries.points:
+ new_measurements: list[MarineMeasurement] = []
+ for measurement in point.measurements:
+ mu_hat, sigma_hat = series_stats.get(measurement.variable, (0.0, 0.0))
+ mu_bg, sigma_bg = background_stats.get(measurement.variable, (0.0, 0.0))
+ value = measurement.value
+ if isclose(sigma_hat, 0.0) or isclose(sigma_bg, 0.0):
+ corrected = value
+ else:
+ normalized = (value - mu_hat) / sigma_hat
+ corrected = normalized * sigma_bg + mu_bg
+ new_measurements.append(
+ MarineMeasurement(
+ variable=measurement.variable,
+ value=corrected,
+ unit=measurement.unit,
+ quality_flag=measurement.quality_flag,
+ )
+ )
+ metadata = point.metadata
+ corrected_metadata = TimeseriesMetadata(
+ source=metadata.source,
+ source_url=metadata.source_url,
+ units=metadata.units,
+ bias_corrected=True,
+ ensemble_weight=metadata.ensemble_weight,
+ )
+ corrected_points.append(
+ MarineDataPoint(
+ timestamp=point.timestamp,
+ position=point.position,
+ measurements=new_measurements,
+ metadata=corrected_metadata,
+ )
+ )
+ return MarineTimeseries(points=corrected_points)
  diff --git a/src/marine_ops/core/ensemble.py b/src/marine_ops/core/ensemble.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..d2d70e345bb882cebcf056cf46272dd399c3e128
  --- /dev/null
  +++ b/src/marine_ops/core/ensemble.py
  @@ -0,0 +1,93 @@
  +"""가중 앙상블 계산. Weighted ensemble computation."""
+ 

+from __future__ import annotations
+
+from collections import defaultdict
+from typing import Mapping, Sequence
+
+from .schema import (

+ CSV_TIMESTAMP_FORMAT,
+ MarineDataPoint,
+ MarineMeasurement,
+ MarineTimeseries,
+ MarineVariable,
+ QualityFlag,
+ TimeseriesMetadata,
  +)
+ 
+ 

+def _normalize_weights(weights: Mapping[str, float]) -> dict[str, float]:

+ total = sum(weights.values())
+ if total == 0:
+ raise ValueError("Ensemble weights must have positive sum")
+ return {source: round(value / total, 4) for source, value in weights.items()}
+ 
+ 

+def weighted_ensemble(

+ series_list: Sequence[MarineTimeseries],
+ weights: Mapping[str, float],
  +) -> MarineTimeseries:
+ """가중 앙상블 시계열 계산. Compute weighted ensemble timeseries."""
+ 
+ normalized = _normalize_weights(weights)
+ value_bucket: dict[str, dict[MarineVariable, list[tuple[MarineMeasurement, float]]]] = (
+ defaultdict(lambda: defaultdict(list))
+ )
+ position_bucket: dict[str, MarineDataPoint] = {}
+ bias_flag: dict[str, bool] = defaultdict(bool)
+ 
+ for series in series_list:
+ for point in series.points:
+ source = point.metadata.source
+ weight = normalized.get(source)
+ if weight is None:
+ continue
+ key = point.timestamp.strftime(CSV_TIMESTAMP_FORMAT)
+ position_bucket.setdefault(key, point)
+ bias_flag[key] = bias_flag[key] or point.metadata.bias_corrected
+ for measurement in point.measurements:
+ value_bucket[key][measurement.variable].append((measurement, weight))
+ 
+ ensemble_points: list[MarineDataPoint] = []
+ for key, variable_map in sorted(value_bucket.items()):
+ base_point = position_bucket[key]
+ aggregated_measurements: list[MarineMeasurement] = []
+ for variable, measurements in variable_map.items():
+ weight_sum = sum(weight for _, weight in measurements)
+ if weight_sum == 0:
+ continue
+ value = (
+ sum(measurement.value * weight for measurement, weight in measurements) / weight_sum
+ )
+ flags = {measurement.quality_flag for measurement, _ in measurements}
+ if QualityFlag.CLIPPED in flags:
+ flag = QualityFlag.CLIPPED
+ elif QualityFlag.IMPUTED in flags:
+ flag = QualityFlag.IMPUTED
+ else:
+ flag = QualityFlag.RAW
+ aggregated_measurements.append(
+ MarineMeasurement(
+ variable=variable,
+ value=value,
+ unit=measurements[0][0].unit,
+ quality_flag=flag,
+ )
+ )
+ bias_corrected = bias_flag[key]
+ metadata = TimeseriesMetadata(
+ source="ensemble",
+ source_url=None,
+ units=base_point.metadata.units,
+ bias_corrected=bias_corrected,
+ ensemble_weight=1.0,
+ )
+ ensemble_points.append(
+ MarineDataPoint(
+ timestamp=base_point.timestamp,
+ position=base_point.position,
+ measurements=aggregated_measurements,
+ metadata=metadata,
+ )
+ )
+ return MarineTimeseries(points=ensemble_points)
  diff --git a/src/marine_ops/core/qc.py b/src/marine_ops/core/qc.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..e005c476e4519b11bf146471a000eb87fc25cafc
  --- /dev/null
  +++ b/src/marine_ops/core/qc.py
  @@ -0,0 +1,85 @@
  +"""해양 데이터 품질 관리. Marine data quality control."""
+ 

+from __future__ import annotations
+
+from collections import defaultdict
+from statistics import quantiles
+from typing import Mapping, Sequence
+
+from .schema import (

+ MarineDataPoint,
+ MarineMeasurement,
+ MarineTimeseries,
+ MarineVariable,
+ QualityFlag,
  +)
+ 
+ 

+def _clip_value(value: float, minimum: float | None, maximum: float | None) -> float:

+ if minimum is not None and value < minimum:
+ return minimum
+ if maximum is not None and value > maximum:
+ return maximum
+ return value
+ 
+ 

+def compute_iqr_bounds(values: Sequence[float], multiplier: float) -> tuple[float, float]:

+ """IQR 경계 계산. Compute IQR bounds."""
+ 
+ if len(values) < 4:
+ return (float("-inf"), float("inf"))
+ q1, q2, q3 = quantiles(values, n=4, method="inclusive")
+ iqr = q3 - q1
+ lower = q1 - multiplier * iqr
+ upper = q3 + multiplier * iqr
+ return (lower, upper)
+ 
+ 

+def apply_quality_controls(

+ timeseries: MarineTimeseries,
+ physical_bounds: Mapping[MarineVariable, tuple[float | None, float | None]],
+ iqr_multiplier: float = 1.5,
  +) -> MarineTimeseries:
+ """결측/이상치 품질 관리 적용. Apply missing/outlier quality controls."""
+ 
+ value_collector: dict[MarineVariable, list[float]] = defaultdict(list)
+ for point in timeseries.points:
+ for measurement in point.measurements:
+ value_collector[measurement.variable].append(measurement.value)
+ 
+ iqr_bounds: dict[MarineVariable, tuple[float, float]] = {}
+ for variable, values in value_collector.items():
+ lower, upper = compute_iqr_bounds(values, iqr_multiplier)
+ iqr_bounds[variable] = (lower, upper)
+ 
+ cleaned_points: list[MarineDataPoint] = []
+ for point in timeseries.points:
+ new_measurements: list[MarineMeasurement] = []
+ for measurement in point.measurements:
+ bounds = physical_bounds.get(measurement.variable, (None, None))
+ iqr_bound = iqr_bounds.get(measurement.variable, (float("-inf"), float("inf")))
+ min_bound = bounds[0]
+ max_bound = bounds[1]
+ value = measurement.value
+ clipped_value = _clip_value(value, min_bound, max_bound)
+ clipped_value = _clip_value(clipped_value, iqr_bound[0], iqr_bound[1])
+ flag = measurement.quality_flag
+ if round(clipped_value, 2) != round(value, 2):
+ flag = QualityFlag.CLIPPED
+ new_measurements.append(
+ MarineMeasurement(
+ variable=measurement.variable,
+ value=clipped_value,
+ unit=measurement.unit,
+ quality_flag=flag,
+ )
+ )
+ cleaned_points.append(
+ MarineDataPoint(
+ timestamp=point.timestamp,
+ position=point.position,
+ measurements=new_measurements,
+ metadata=point.metadata,
+ )
+ )
+ return MarineTimeseries(points=cleaned_points)
  diff --git a/src/marine_ops/core/schema.py b/src/marine_ops/core/schema.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..1a9fccac8ed40e9df5371ee16c3690e381f0d266
  --- /dev/null
  +++ b/src/marine_ops/core/schema.py
  @@ -0,0 +1,140 @@
  +"""해양 운항 표준 스키마. Marine operations standard schema."""
+ 

+from __future__ import annotations
+
+import datetime as dt
+from enum import Enum
+from typing import Iterable, Mapping, Sequence
+
+from pydantic import Field, HttpUrl, field_validator, model_validator
+
+from wv.core.models import LogiBaseModel
+
+CSV_TIMESTAMP_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
+CSV_HEADER: tuple[str, ...] = (

+ "timestamp",
+ "latitude",
+ "longitude",
+ "variable",
+ "value",
+ "unit",
+ "source",
+ "quality_flag",
+ "bias_corrected",
+ "ensemble_weight",
  +)
+ 
+ 

+class MarineVariable(str, Enum):

+ """해양 변수 식별자. Marine variable identifier."""
+ 
+ SIGNIFICANT_WAVE_HEIGHT = "Hs"
+ WIND_SPEED_10M = "U10"
+ WIND_DIRECTION_10M = "U10_DIR"
+ VISIBILITY = "Vis"
+ SWELL_HEIGHT = "SwellHs"
+ SWELL_PERIOD = "SwellTp"
+ SWELL_DIRECTION = "SwellDir"
+ TIDE_HEIGHT = "Tide"
+ 
+ 

+class UnitEnum(str, Enum):

+ """단위 열거형. Unit enumeration."""
+ 
+ METERS = "m"
+ METERS_PER_SECOND = "m/s"
+ DEGREES = "deg"
+ KILOMETERS = "km"
+ SECONDS = "s"
+ 
+ 

+class QualityFlag(str, Enum):

+ """품질 관리 플래그. Quality control flag."""
+ 
+ RAW = "raw"
+ CLIPPED = "clipped"
+ IMPUTED = "imputed"
+ 
+ 

+class Position(LogiBaseModel):

+ """위치 좌표. Position coordinates."""
+ 
+ latitude: float = Field(..., ge=-90.0, le=90.0)
+ longitude: float = Field(..., ge=-180.0, le=180.0)
+ 
+ 

+class MarineMeasurement(LogiBaseModel):

+ """해양 변수 관측값. Marine variable measurement."""
+ 
+ variable: MarineVariable
+ value: float
+ unit: UnitEnum
+ quality_flag: QualityFlag = QualityFlag.RAW
+ 
+ @model_validator(mode="after")
+ def _round_value(self) -> "MarineMeasurement":
+ object.__setattr__(self, "value", round(self.value, 2))
+ return self
+ 
+ 

+class TimeseriesMetadata(LogiBaseModel):

+ """시계열 메타데이터. Timeseries metadata."""
+ 
+ source: str
+ source_url: HttpUrl | None = None
+ units: Mapping[MarineVariable, UnitEnum]
+ bias_corrected: bool = False
+ ensemble_weight: float | None = None
+ 
+ @model_validator(mode="after")
+ def _round_weight(self) -> "TimeseriesMetadata":
+ if self.ensemble_weight is not None:
+ object.__setattr__(self, "ensemble_weight", round(float(self.ensemble_weight), 2))
+ return self
+ 
+ 

+class MarineDataPoint(LogiBaseModel):

+ """표준화된 해양 데이터 포인트. Standardized marine data point."""
+ 
+ timestamp: dt.datetime
+ position: Position
+ measurements: Sequence[MarineMeasurement]
+ metadata: TimeseriesMetadata
+ 
+ @field_validator("timestamp")
+ @classmethod
+ def _ensure_utc(cls, value: dt.datetime) -> dt.datetime:
+ if value.tzinfo is None:
+ value = value.replace(tzinfo=dt.timezone.utc)
+ else:
+ value = value.astimezone(dt.timezone.utc)
+ return value
+ 
+ 

+class MarineTimeseries(LogiBaseModel):

+ """표준 해양 시계열. Standard marine timeseries."""
+ 
+ points: Sequence[MarineDataPoint]
+ 
+ def iter_rows(self) -> Iterable[tuple[str, ...]]:
+ """RFC 4180 행 이터레이터. RFC 4180 row iterator."""
+ 
+ for point in self.points:
+ iso_time = point.timestamp.strftime(CSV_TIMESTAMP_FORMAT)
+ for measurement in point.measurements:
+ yield (
+ iso_time,
+ f"{point.position.latitude:.2f}",
+ f"{point.position.longitude:.2f}",
+ measurement.variable.value,
+ f"{measurement.value:.2f}",
+ measurement.unit.value,
+ point.metadata.source,
+ measurement.quality_flag.value,
+ "true" if point.metadata.bias_corrected else "false",
+ (
+ f"{point.metadata.ensemble_weight:.2f}"
+ if point.metadata.ensemble_weight is not None
+ else ""
+ ),
+ )
  diff --git a/src/marine_ops/core/settings.py b/src/marine_ops/core/settings.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..4f72f27d41d6472ac7750bb10c928f64c291dfd4
  --- /dev/null
  +++ b/src/marine_ops/core/settings.py
  @@ -0,0 +1,85 @@
  +"""해양 운항 설정. Marine operations settings."""
+ 

+from __future__ import annotations
+
+import os
+from typing import TYPE_CHECKING, Mapping
+
+import httpx
+
+from wv.core.models import LogiBaseModel
+
+DEFAULT_TIMEOUT = 10.0
+
+if TYPE_CHECKING:  # pragma: no cover - import-time typing only

+ from marine_ops.connectors.open_meteo_fallback import OpenMeteoFallback
+ from marine_ops.connectors.stormglass import StormglassConnector
+ from marine_ops.connectors.worldtides import WorldTidesConnector
+ 
+ 

+class MarineOpsSettings(LogiBaseModel):

+ """환경 변수 기반 설정. Settings derived from environment variables."""
+ 
+ stormglass_api_key: str | None = None
+ worldtides_api_key: str | None = None
+ open_meteo_base: str | None = None
+ open_meteo_timeout: float = DEFAULT_TIMEOUT
+ app_log_level: str = "INFO"
+ 
+ @classmethod
+ def from_env(cls, env: Mapping[str, str] | None = None) -> MarineOpsSettings:
+ """환경 변수에서 로드. Load settings from environment."""
+ 
+ source = os.environ if env is None else env
+ timeout_raw = source.get("OPEN_METEO_TIMEOUT")
+ timeout = DEFAULT_TIMEOUT
+ if timeout_raw:
+ try:
+ timeout = round(float(timeout_raw), 2)
+ except ValueError as exc:  # pragma: no cover - defensive branch
+ raise ValueError("OPEN_METEO_TIMEOUT must be numeric") from exc
+ return cls(
+ stormglass_api_key=source.get("STORMGLASS_API_KEY"),
+ worldtides_api_key=source.get("WORLDTIDES_API_KEY"),
+ open_meteo_base=source.get("OPEN_METEO_BASE"),
+ open_meteo_timeout=timeout,
+ app_log_level=source.get("APP_LOG_LEVEL", "INFO"),
+ )
+ 
+ def build_stormglass_connector(self, client: httpx.Client | None = None) -> StormglassConnector:
+ """Stormglass 커넥터 생성. Build Stormglass connector."""
+ 
+ from marine_ops.connectors.stormglass import StormglassConnector
+ 
+ if not self.stormglass_api_key:
+ raise ValueError("STORMGLASS_API_KEY is required for StormglassConnector")
+ return StormglassConnector(
+ api_key=self.stormglass_api_key,
+ client=client or httpx.Client(timeout=self.open_meteo_timeout),
+ timeout=self.open_meteo_timeout,
+ )
+ 
+ def build_worldtides_connector(self, client: httpx.Client | None = None) -> WorldTidesConnector:
+ """WorldTides 커넥터 생성. Build WorldTides connector."""
+ 
+ from marine_ops.connectors.worldtides import WorldTidesConnector
+ 
+ if not self.worldtides_api_key:
+ raise ValueError("WORLDTIDES_API_KEY is required for WorldTidesConnector")
+ return WorldTidesConnector(
+ api_key=self.worldtides_api_key,
+ client=client or httpx.Client(timeout=self.open_meteo_timeout),
+ timeout=self.open_meteo_timeout,
+ )
+ 
+ def build_open_meteo_fallback(self, client: httpx.Client | None = None) -> OpenMeteoFallback:
+ """Open-Meteo 폴백 생성. Build Open-Meteo fallback connector."""
+ 
+ from marine_ops.connectors.open_meteo_fallback import OPEN_METEO_URL, OpenMeteoFallback
+ 
+ base_url = self.open_meteo_base or OPEN_METEO_URL
+ return OpenMeteoFallback(
+ base_url=base_url,
+ client=client or httpx.Client(timeout=self.open_meteo_timeout),
+ timeout=self.open_meteo_timeout,
+ )
  diff --git a/src/marine_ops/core/units.py b/src/marine_ops/core/units.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..a848fed14d9296060d747207949fb0cc600d32fd
  --- /dev/null
  +++ b/src/marine_ops/core/units.py
  @@ -0,0 +1,32 @@
  +"""해양 단위 변환 유틸. Marine unit conversion utilities."""
+ 

+from __future__ import annotations
+
+KNOT_TO_METER_PER_SECOND = 0.514444
+METER_PER_SECOND_TO_KNOT = 1.943844
+FOOT_TO_METER = 0.3048
+METER_TO_FOOT = 3.28084
+
+
+def knots_to_meters_per_second(knots: float) -> float:

+ """노트→미터매초 변환. Convert knots to meters per second."""
+ 
+ return round(knots * KNOT_TO_METER_PER_SECOND, 2)
+ 
+ 

+def meters_per_second_to_knots(speed: float) -> float:

+ """미터매초→노트 변환. Convert meters per second to knots."""
+ 
+ return round(speed * METER_PER_SECOND_TO_KNOT, 2)
+ 
+ 

+def feet_to_meters(feet: float) -> float:

+ """피트→미터 변환. Convert feet to meters."""
+ 
+ return round(feet * FOOT_TO_METER, 2)
+ 
+ 

+def meters_to_feet(meters: float) -> float:

+ """미터→피트 변환. Convert meters to feet."""
+ 
+ return round(meters * METER_TO_FOOT, 2)
  diff --git a/src/marine_ops/eri/__init__.py b/src/marine_ops/eri/__init__.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..dc43ff744e8a0a5388b602353c57bce2e91fb782
  --- /dev/null
  +++ b/src/marine_ops/eri/__init__.py
  @@ -0,0 +1,13 @@
  +"""ERI 계산 패키지. ERI computation package."""
+ 

+from .compute import ERIPoint, QualityBadge, compute_eri_timeseries
+from .rules import ERIRuleSet, ThresholdRule, load_rule_set
+
+__all__ = [

+ "ERIPoint",
+ "ERIRuleSet",
+ "QualityBadge",
+ "ThresholdRule",
+ "compute_eri_timeseries",
+ "load_rule_set",
  +]
  diff --git a/src/marine_ops/eri/compute.py b/src/marine_ops/eri/compute.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..5f6d0b122382dc74b8eec45e9f663357e3875852
  --- /dev/null
  +++ b/src/marine_ops/eri/compute.py
  @@ -0,0 +1,80 @@
  +"""ERI 시계열 계산. ERI timeseries computation."""
+ 

+from __future__ import annotations
+
+import datetime as dt
+
+from wv.core.models import LogiBaseModel
+
+from ..core.schema import MarineDataPoint, MarineMeasurement, MarineTimeseries, MarineVariable
+from .rules import ERIRuleSet, ThresholdRule
+
+
+class QualityBadge(LogiBaseModel):

+ """ERI 품질 배지. ERI quality badge."""
+ 
+ source: str
+ has_missing: bool
+ bias_corrected: bool
+ 
+ 

+class ERIPoint(LogiBaseModel):

+ """ERI 시계열 포인트. ERI timeseries point."""
+ 
+ timestamp: dt.datetime
+ score: float
+ quality: QualityBadge
+ 
+ 

+def _score_for_measurement(value: float, rule: ThresholdRule) -> float:

+ if rule.direction == "max":
+ if value >= rule.danger:
+ return 2.0
+ if value >= rule.caution:
+ return 1.0
+ return 0.0
+ if value <= rule.danger:
+ return 2.0
+ if value <= rule.caution:
+ return 1.0
+ return 0.0
+ 
+ 

+def compute_eri_timeseries(timeseries: MarineTimeseries, rule_set: ERIRuleSet) -> list[ERIPoint]:

+ """ERI 규칙 기반 점수 계산. Compute ERI scores from rules."""
+ 
+ points: list[ERIPoint] = []
+ for point in timeseries.points:
+ penalty = 0.0
+ has_missing = False
+ for rule in rule_set.rules:
+ measurement = _find_measurement(point, rule.variable)
+ if measurement is None:
+ has_missing = True
+ penalty += rule.weight * rule_set.caution_penalty
+ continue
+ state = _score_for_measurement(measurement.value, rule)
+ if state == 2.0:
+ penalty += rule.weight * rule_set.danger_penalty
+ elif state == 1.0:
+ penalty += rule.weight * rule_set.caution_penalty
+ score = max(0.0, rule_set.base_score - penalty)
+ points.append(
+ ERIPoint(
+ timestamp=point.timestamp,
+ score=round(score, 2),
+ quality=QualityBadge(
+ source=point.metadata.source,
+ has_missing=has_missing,
+ bias_corrected=point.metadata.bias_corrected,
+ ),
+ )
+ )
+ return points
+ 
+ 

+def _find_measurement(point: MarineDataPoint, variable: MarineVariable) -> MarineMeasurement | None:

+ for measurement in point.measurements:
+ if measurement.variable == variable:
+ return measurement
+ return None
  diff --git a/src/marine_ops/eri/rules.py b/src/marine_ops/eri/rules.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..c46b3c9e9a40979afa17a374a322f5c3ebefdaab
  --- /dev/null
  +++ b/src/marine_ops/eri/rules.py
  @@ -0,0 +1,64 @@
  +"""ERI 규칙 로더. ERI rules loader."""
+ 

+from __future__ import annotations
+
+from pathlib import Path
+from typing import IO, Any, Iterable
+
+import yaml  # type: ignore[import-untyped]
+
+from wv.core.models import LogiBaseModel
+
+from ..core.schema import MarineVariable
+
+
+class ThresholdRule(LogiBaseModel):

+ """ERI 임계 규칙. ERI threshold rule."""
+ 
+ variable: MarineVariable
+ caution: float
+ danger: float
+ weight: float
+ direction: str = "max"
+ 
+ 

+class ERIRuleSet(LogiBaseModel):

+ """ERI 규칙 세트. ERI rule set."""
+ 
+ base_score: float
+ caution_penalty: float
+ danger_penalty: float
+ rules: tuple[ThresholdRule, ...]
+ 
+ 

+def _iter_rules(data: Iterable[dict[str, Any]]) -> list[ThresholdRule]:

+ rules: list[ThresholdRule] = []
+ for item in data:
+ rules.append(
+ ThresholdRule(
+ variable=MarineVariable(item["variable"]),
+ caution=float(item["caution"]),
+ danger=float(item["danger"]),
+ weight=float(item["weight"]),
+ direction=item.get("direction", "max"),
+ )
+ )
+ return rules
+ 
+ 

+def load_rule_set(resource: str | Path | IO[str]) -> ERIRuleSet:

+ """YAML/TOML 규칙 로드. Load ERI rules from YAML/TOML."""
+ 
+ if hasattr(resource, "read"):
+ raw = yaml.safe_load(resource)
+ else:
+ path = Path(resource)
+ with path.open("r", encoding="utf-8") as handle:
+ raw = yaml.safe_load(handle)
+ rules = _iter_rules(raw["rules"])
+ return ERIRuleSet(
+ base_score=float(raw["base_score"]),
+ caution_penalty=float(raw["caution_penalty"]),
+ danger_penalty=float(raw["danger_penalty"]),
+ rules=tuple(rules),
+ )
  diff --git a/src/wv/core/fusion.py b/src/wv/core/fusion.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..fdf6356fa2ab91b55edd5e03ef8f1a3c38f8e567
  --- /dev/null
  +++ b/src/wv/core/fusion.py
  @@ -0,0 +1,134 @@
  +"""ADNOC·Al Bahar 결합 의사결정. ADNOC and Al Bahar fused decision support."""
+ 

+from __future__ import annotations
+
+from typing import Final
+
+from pydantic import Field, field_validator, model_validator
+
+from wv.core.models import LogiBaseModel
+
+FT_TO_M: Final[float] = 0.3048
+_MIN_SPEED_KT: Final[float] = 0.1
+_ALERT_GAMMA: Final[dict[str, float]] = {

+ "": 0.0,
+ "rough at times westward": 0.15,
  +}
+ 
+ 

+class FusionCoefficients(LogiBaseModel):

+ """결합 계수 설정. Fusion coefficient configuration."""
+ 
+ alpha: float = Field(default=0.85, ge=0.0)
+ beta: float = Field(default=0.80, ge=0.0)
+ wind_factor: float = Field(default=0.06, ge=0.0)
+ wave_factor: float = Field(default=0.60, ge=0.0)
+ 
+ 

+class FusionInputs(LogiBaseModel):

+ """결합 입력 파라미터. Fusion input parameters."""
+ 
+ combined_ft: float = Field(..., ge=0.0)
+ wind_adnoc: float = Field(..., ge=0.0)
+ hs_onshore_ft: float = Field(..., ge=0.0)
+ hs_offshore_ft: float = Field(..., ge=0.0)
+ wind_albahar: float = Field(..., ge=0.0)
+ alert: str | None = None
+ offshore_weight: float = Field(..., ge=0.0, le=1.0)
+ distance_nm: float = Field(..., gt=0.0)
+ planned_speed_kt: float = Field(..., gt=0.0)
+ 
+ @field_validator("alert")
+ @classmethod
+ def _normalize_alert(cls, value: str | None) -> str | None:
+ if value is None:
+ return None
+ return value.strip()
+ 
+ 

+class FusionResult(LogiBaseModel):

+ """결합 결과. Fusion output summary."""
+ 
+ hs_fused_m: float
+ wind_fused_kt: float
+ decision: str
+ eta_hours: float
+ buffer_minutes: int
+ 
+ @model_validator(mode="after")
+ def _round(self) -> "FusionResult":
+ object.__setattr__(self, "hs_fused_m", round(self.hs_fused_m, 2))
+ object.__setattr__(self, "wind_fused_kt", round(self.wind_fused_kt, 2))
+ object.__setattr__(self, "eta_hours", round(self.eta_hours, 2))
+ return self
+ 
+ 

+def _alert_gamma(alert: str | None) -> float:

+ """경보 가중치를 계산. Compute gamma weight from alert."""
+ 
+ key = (alert or "").strip().casefold()
+ if key.startswith("high seas"):
+ return 0.30
+ if "rough at times" in key:
+ return 0.15
+ return _ALERT_GAMMA.get(key, 0.0)
+ 
+ 

+def _is_forced_no_go(alert: str | None) -> bool:

+ """강제 출항 금지 여부 확인. Determine forced no-go condition."""
+ 
+ key = (alert or "").strip().casefold()
+ return key.startswith("high seas") or key.startswith("fog")
+ 
+ 

+def decide_and_eta(

+ inputs: FusionInputs, coefficients: FusionCoefficients | None = None
  +) -> FusionResult:
+ """결합 의사결정 및 ETA 계산. Fuse signals and compute ETA."""
+ 
+ coeffs = coefficients or FusionCoefficients()
+ 
+ hs_on_m = inputs.hs_onshore_ft * FT_TO_M
+ hs_off_m = inputs.hs_offshore_ft * FT_TO_M
+ hs_from_adnoc = coeffs.alpha * (inputs.combined_ft * FT_TO_M)
+ 
+ hs_ncm = (1.0 - inputs.offshore_weight) * hs_on_m + inputs.offshore_weight * hs_off_m
+ gamma = _alert_gamma(inputs.alert)
+ hs_fused = max(hs_ncm, coeffs.beta * hs_from_adnoc) * (1.0 + gamma)
+ 
+ wind_fused = max(inputs.wind_adnoc, inputs.wind_albahar)
+ 
+ if _is_forced_no_go(inputs.alert):
+ decision = "No-Go"
+ elif hs_fused <= 1.0 and wind_fused <= 20.0 and gamma == 0.0:
+ decision = "Go"
+ elif hs_fused > 1.2 or wind_fused > 22.0:
+ decision = "No-Go"
+ else:
+ decision = "Conditional Go"
+ 
+ if decision == "No-Go" and inputs.offshore_weight <= 0.40 and hs_on_m <= 1.0 and gamma <= 0.15:
+ decision = "Conditional Go (coastal window)"
+ 
+ wind_penalty = coeffs.wind_factor * max(wind_fused - 10.0, 0.0)
+ wave_penalty = coeffs.wave_factor * hs_fused
+ effective_speed = max(inputs.planned_speed_kt - wind_penalty - wave_penalty, _MIN_SPEED_KT)
+ eta_hours = inputs.distance_nm / effective_speed
+ 
+ buffer_minutes = 45 if inputs.offshore_weight <= 0.40 else 60
+ 
+ return FusionResult(
+ hs_fused_m=hs_fused,
+ wind_fused_kt=wind_fused,
+ decision=decision,
+ eta_hours=eta_hours,
+ buffer_minutes=buffer_minutes,
+ )
+ 
+ 

+__all__ = [

+ "FusionCoefficients",
+ "FusionInputs",
+ "FusionResult",
+ "decide_and_eta",
  +]
  diff --git a/tests/marine_ops/fixtures/eri_rules.yaml b/tests/marine_ops/fixtures/eri_rules.yaml
  new file mode 100644
  index 0000000000000000000000000000000000000000..cc9104fe43c9dca726aaef9f8c4327039ccef61f
  --- /dev/null
  +++ b/tests/marine_ops/fixtures/eri_rules.yaml
  @@ -0,0 +1,24 @@
  +base_score: 100
  +caution_penalty: 20
  +danger_penalty: 50
  +rules:
+ - variable: Hs
+ caution: 1.5
+ danger: 3.0
+ weight: 0.4
+ direction: max
+ - variable: U10
+ caution: 10
+ danger: 15
+ weight: 0.3
+ direction: max
+ - variable: Vis
+ caution: 5
+ danger: 2
+ weight: 0.2
+ direction: min
+ - variable: Tide
+ caution: -0.5
+ danger: -1.0
+ weight: 0.1
+ direction: min
  diff --git a/tests/marine_ops/fixtures/open_meteo_response.json b/tests/marine_ops/fixtures/open_meteo_response.json
  new file mode 100644
  index 0000000000000000000000000000000000000000..39dc138f16727df47e2c2ee6bc4fbae82c1bb6dc
  --- /dev/null
  +++ b/tests/marine_ops/fixtures/open_meteo_response.json
  @@ -0,0 +1,14 @@
  +{
+ "hourly": {
+ "time": [
+ "2025-01-01T00:00",
+ "2025-01-01T01:00"
+ ],
+ "significant_wave_height": [1.1, 1.2],
+ "wave_direction": [175, 180],
+ "wave_period": [11, 12],
+ "wind_speed_10m": [7.5, 8.0],
+ "wind_direction_10m": [185, 190],
+ "visibility": [19, 18]
+ }
  +}
  diff --git a/tests/marine_ops/fixtures/stormglass_response.json b/tests/marine_ops/fixtures/stormglass_response.json
  new file mode 100644
  index 0000000000000000000000000000000000000000..1247cb694fb71a12731fc17b26d2875d11dcb87d
  --- /dev/null
  +++ b/tests/marine_ops/fixtures/stormglass_response.json
  @@ -0,0 +1,24 @@
  +{
+ "hours": [
+ {
+ "time": "2025-01-01T00:00:00+00:00",
+ "waveHeight": {"sg": 1.2},
+ "swellHeight": {"sg": 0.8},
+ "swellPeriod": {"sg": 12},
+ "swellDirection": {"sg": 180},
+ "windSpeed": {"sg": 8.4},
+ "windDirection": {"sg": 190},
+ "visibility": {"sg": 20}
+ },
+ {
+ "time": "2025-01-01T01:00:00+00:00",
+ "waveHeight": {"sg": 1.3},
+ "swellHeight": {"sg": 0.9},
+ "swellPeriod": {"sg": 11},
+ "swellDirection": {"sg": 185},
+ "windSpeed": {"sg": 8.8},
+ "windDirection": {"sg": 200},
+ "visibility": {"sg": 18}
+ }
+ ]
  +}
  diff --git a/tests/marine_ops/fixtures/worldtides_response.json b/tests/marine_ops/fixtures/worldtides_response.json
  new file mode 100644
  index 0000000000000000000000000000000000000000..c9085491ea8740eaee898814a7f75dcb80becdec
  --- /dev/null
  +++ b/tests/marine_ops/fixtures/worldtides_response.json
  @@ -0,0 +1,22 @@
  +{
+ "heights": [
+ {
+ "dt": 1735689600,
+ "date": "2025-01-01T00:00:00+00:00",
+ "height": 0.6
+ },
+ {
+ "dt": 1735691400,
+ "date": "2025-01-01T00:30:00+00:00",
+ "height": 0.65
+ }
+ ],
+ "extremes": [
+ {
+ "dt": 1735693200,
+ "date": "2025-01-01T01:00:00+00:00",
+ "height": 1.1,
+ "type": "High"
+ }
+ ]
  +}
  diff --git a/tests/marine_ops/test_connectors.py b/tests/marine_ops/test_connectors.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..91b381fbff466b517958bc0302023dc13d331e70
  --- /dev/null
  +++ b/tests/marine_ops/test_connectors.py
  @@ -0,0 +1,108 @@
  +"""커넥터 단위 테스트. Connector unit tests."""
+ 

+from __future__ import annotations
+
+import datetime as dt
+import json
+from pathlib import Path
+
+import httpx
+
+from marine_ops.connectors.open_meteo_fallback import (

+ OpenMeteoFallback,
+ fetch_forecast_with_fallback,
  +)
  +from marine_ops.connectors.stormglass import STORMGLASS_PARAMS, StormglassConnector
  +from marine_ops.connectors.worldtides import WorldTidesConnector
  +from marine_ops.core.schema import MarineVariable, UnitEnum
+ 

+FIXTURE_DIR = Path(__file__).parent / "fixtures"
+
+
+def load_fixture(name: str) -> dict:

+ path = FIXTURE_DIR / name
+ return json.loads(path.read_text(encoding="utf-8"))
+ 
+ 

+def make_client(payload: dict) -> httpx.Client:

+ transport = httpx.MockTransport(lambda request: httpx.Response(200, json=payload))
+ return httpx.Client(transport=transport)
+ 
+ 

+def test_stormglass_connector_parses_hours() -> None:

+ connector = StormglassConnector(
+ api_key="test",
+ client=make_client(load_fixture("stormglass_response.json")),
+ )
+ start = dt.datetime(2025, 1, 1, tzinfo=dt.timezone.utc)
+ end = start + dt.timedelta(days=1)
+ series = connector.fetch_forecast(25.0, 55.0, start, end)
+ assert len(series.points) == 2
+ first_point = series.points[0]
+ assert first_point.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ") == "2025-01-01T00:00:00Z"
+ variables = {measurement.variable for measurement in first_point.measurements}
+ assert {item[1] for item in STORMGLASS_PARAMS}.issubset(variables)
+ assert first_point.measurements[0].unit in {
+ UnitEnum.METERS,
+ UnitEnum.METERS_PER_SECOND,
+ UnitEnum.DEGREES,
+ }
+ 
+ 

+def test_worldtides_connector_heights() -> None:

+ connector = WorldTidesConnector(
+ api_key="dummy",
+ client=make_client(load_fixture("worldtides_response.json")),
+ )
+ start = dt.datetime(2025, 1, 1, tzinfo=dt.timezone.utc)
+ series = connector.fetch_heights(25.0, 55.0, start)
+ assert len(series.points) == 2
+ assert series.points[0].measurements[0].variable == MarineVariable.TIDE_HEIGHT
+ assert series.points[0].measurements[0].value == 0.6
+ 
+ 

+def test_open_meteo_fallback_transforms_response() -> None:

+ connector = OpenMeteoFallback(
+ client=make_client(load_fixture("open_meteo_response.json")),
+ )
+ start = dt.datetime(2025, 1, 1, tzinfo=dt.timezone.utc)
+ end = start + dt.timedelta(days=1)
+ series = connector.fetch_forecast(25.0, 55.0, start, end)
+ assert len(series.points) == 2
+ assert any(
+ m.variable == MarineVariable.SIGNIFICANT_WAVE_HEIGHT for m in series.points[0].measurements
+ )
+ assert series.points[0].measurements[0].value == 1.1
+ 
+ 

+def test_fetch_forecast_with_fallback_on_rate_limit() -> None:

+ start = dt.datetime(2025, 1, 1, tzinfo=dt.timezone.utc)
+ end = start + dt.timedelta(days=1)
+ 
+ def stormglass_handler(request: httpx.Request) -> httpx.Response:
+ return httpx.Response(429, json={"errors": ["rate limit"]}, request=request)
+ 
+ def open_meteo_handler(request: httpx.Request) -> httpx.Response:
+ payload = load_fixture("open_meteo_response.json")
+ return httpx.Response(200, json=payload, request=request)
+ 
+ stormglass_client = httpx.Client(transport=httpx.MockTransport(stormglass_handler))
+ open_meteo_client = httpx.Client(transport=httpx.MockTransport(open_meteo_handler))
+ 
+ stormglass = StormglassConnector(api_key="test", client=stormglass_client)
+ fallback = OpenMeteoFallback(client=open_meteo_client)
+ series = fetch_forecast_with_fallback(25.0, 55.0, start, end, stormglass, fallback)
+ assert series.points
+ assert series.points[0].metadata.source == "open-meteo"
+ 
+ 

+def test_stormglass_handles_missing_values() -> None:

+ payload = load_fixture("stormglass_response.json")
+ payload["hours"][0]["waveHeight"] = {}
+ connector = StormglassConnector(api_key="test", client=make_client(payload))
+ start = dt.datetime(2025, 1, 1, tzinfo=dt.timezone.utc)
+ end = start + dt.timedelta(days=1)
+ series = connector.fetch_forecast(25.0, 55.0, start, end)
+ assert any(
+ m.variable == MarineVariable.SIGNIFICANT_WAVE_HEIGHT for m in series.points[1].measurements
+ )
  diff --git a/tests/marine_ops/test_core_modules.py b/tests/marine_ops/test_core_modules.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..e3e121a73d89565339ed89d98d1a5cfdcaf2f8c4
  --- /dev/null
  +++ b/tests/marine_ops/test_core_modules.py
  @@ -0,0 +1,132 @@
  +"""코어 유틸리티 테스트. Core utility tests."""
+ 

+from __future__ import annotations
+
+import datetime as dt
+
+import httpx
+import pytest
+
+from marine_ops.core import MarineOpsSettings, bias, ensemble, qc
+from marine_ops.core.schema import (

+ MarineDataPoint,
+ MarineMeasurement,
+ MarineTimeseries,
+ MarineVariable,
+ Position,
+ QualityFlag,
+ TimeseriesMetadata,
+ UnitEnum,
  +)
  +from marine_ops.core.units import (
+ feet_to_meters,
+ knots_to_meters_per_second,
+ meters_per_second_to_knots,
  +)
+ 
+ 

+def make_point(

+ value: float,
+ timestamp: dt.datetime | None = None,
+ source: str = "stormglass",
  +) -> MarineDataPoint:
+ timestamp = timestamp or dt.datetime(2025, 1, 1, tzinfo=dt.timezone.utc)
+ metadata = TimeseriesMetadata(
+ source=source,
+ source_url=None,
+ units={MarineVariable.SIGNIFICANT_WAVE_HEIGHT: UnitEnum.METERS},
+ )
+ measurement = MarineMeasurement(
+ variable=MarineVariable.SIGNIFICANT_WAVE_HEIGHT,
+ value=value,
+ unit=UnitEnum.METERS,
+ )
+ return MarineDataPoint(
+ timestamp=timestamp,
+ position=Position(latitude=25.0, longitude=55.0),
+ measurements=[measurement],
+ metadata=metadata,
+ )
+ 
+ 

+def test_unit_conversions_round_trip() -> None:

+ speed_ms = knots_to_meters_per_second(10)
+ assert speed_ms == 5.14
+ assert abs(meters_per_second_to_knots(speed_ms) - 10.0) <= 0.02
+ assert feet_to_meters(10) == 3.05
+ 
+ 

+def test_quality_control_clips_outliers() -> None:

+ raw_series = MarineTimeseries(
+ points=[
+ make_point(0.5),
+ make_point(5.0, dt.datetime(2025, 1, 1, 1, tzinfo=dt.timezone.utc)),
+ ]
+ )
+ cleaned = qc.apply_quality_controls(
+ raw_series,
+ physical_bounds={MarineVariable.SIGNIFICANT_WAVE_HEIGHT: (0.0, 4.0)},
+ )
+ assert cleaned.points[1].measurements[0].value == 4.0
+ assert cleaned.points[1].measurements[0].quality_flag == QualityFlag.CLIPPED
+ 
+ 

+def test_bias_correction_adjusts_mean() -> None:

+ series = MarineTimeseries(points=[make_point(1.0), make_point(1.5)])
+ background = {MarineVariable.SIGNIFICANT_WAVE_HEIGHT: [0.8, 0.9, 1.0]}
+ corrected = bias.apply_bias_correction(series, background)
+ values = [point.measurements[0].value for point in corrected.points]
+ assert corrected.points[0].metadata.bias_corrected is True
+ assert round(sum(values) / len(values), 2) == 0.9
+ 
+ 

+def test_weighted_ensemble_combines_series() -> None:

+ point_a = make_point(1.0, source="stormglass")
+ point_b = make_point(2.0, source="open-meteo")
+ series_a = MarineTimeseries(points=[point_a])
+ series_b = MarineTimeseries(points=[point_b])
+ blended = ensemble.weighted_ensemble(
+ [series_a, series_b], {"stormglass": 0.7, "open-meteo": 0.3}
+ )
+ assert len(blended.points) == 1
+ assert blended.points[0].measurements[0].value == 1.3
+ 
+ 

+def test_settings_from_env_parses_timeout() -> None:

+ env = {
+ "STORMGLASS_API_KEY": "storm",
+ "WORLDTIDES_API_KEY": "tide",
+ "OPEN_METEO_BASE": "https://example.com/api",
+ "OPEN_METEO_TIMEOUT": "12.75",
+ "APP_LOG_LEVEL": "DEBUG",
+ }
+ settings = MarineOpsSettings.from_env(env)
+ assert settings.stormglass_api_key == "storm"
+ assert settings.worldtides_api_key == "tide"
+ assert settings.open_meteo_base == "https://example.com/api"
+ assert settings.open_meteo_timeout == 12.75
+ assert settings.app_log_level == "DEBUG"
+ 
+ 

+def test_settings_builders_require_keys() -> None:

+ settings = MarineOpsSettings.from_env({})
+ with pytest.raises(ValueError):
+ settings.build_stormglass_connector()
+ with pytest.raises(ValueError):
+ settings.build_worldtides_connector()
+ 
+ 

+def test_settings_builders_use_env_base() -> None:

+ env = {
+ "STORMGLASS_API_KEY": "storm",
+ "WORLDTIDES_API_KEY": "tide",
+ "OPEN_METEO_BASE": "https://alt.example/marine",
+ }
+ settings = MarineOpsSettings.from_env(env)
+ fallback = settings.build_open_meteo_fallback(
+ client=httpx.Client(transport=httpx.MockTransport(lambda request: httpx.Response(200)))
+ )
+ try:
+ assert fallback.base_url == "https://alt.example/marine"
+ finally:
+ fallback.client.close()
  diff --git a/tests/marine_ops/test_eri_compute.py b/tests/marine_ops/test_eri_compute.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..c4fc9cbc022ec5c82f3fd75be2916bc7744227d5
  --- /dev/null
  +++ b/tests/marine_ops/test_eri_compute.py
  @@ -0,0 +1,87 @@
  +"""ERI 규칙 및 통합 테스트. ERI rules and integration tests."""
+ 

+from __future__ import annotations
+
+import csv
+import datetime as dt
+from collections import defaultdict
+from pathlib import Path
+
+from marine_ops.core.bias import apply_bias_correction
+from marine_ops.core.qc import apply_quality_controls
+from marine_ops.core.schema import (

+ MarineDataPoint,
+ MarineMeasurement,
+ MarineTimeseries,
+ MarineVariable,
+ Position,
+ QualityFlag,
+ TimeseriesMetadata,
+ UnitEnum,
  +)
  +from marine_ops.eri.compute import compute_eri_timeseries
  +from marine_ops.eri.rules import load_rule_set
+ 

+FIXTURE_DIR = Path(__file__).parent / "fixtures"
+ROOT_DIR = Path(__file__).resolve().parents[2]
+
+
+def parse_sample_timeseries(path: Path) -> MarineTimeseries:

+ """샘플 CSV 파싱. Parse sample CSV."""
+ 
+ groups: dict[str, list[dict[str, str]]] = defaultdict(list)
+ with path.open("r", encoding="utf-8") as handle:
+ reader = csv.DictReader(handle)
+ for row in reader:
+ groups[row["timestamp"]].append(row)
+ points: list[MarineDataPoint] = []
+ for timestamp_str, rows in groups.items():
+ timestamp = dt.datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%SZ").replace(
+ tzinfo=dt.timezone.utc
+ )
+ latitude = float(rows[0]["latitude"])
+ longitude = float(rows[0]["longitude"])
+ unit_map = {MarineVariable(row["variable"]): UnitEnum(row["unit"]) for row in rows}
+ metadata = TimeseriesMetadata(
+ source=rows[0]["source"],
+ source_url=None,
+ units=unit_map,
+ bias_corrected=rows[0]["bias_corrected"].lower() == "true",
+ )
+ measurements: list[MarineMeasurement] = []
+ for row in rows:
+ variable = MarineVariable(row["variable"])
+ unit = UnitEnum(row["unit"])
+ flag = QualityFlag(row["quality_flag"])
+ measurements.append(
+ MarineMeasurement(
+ variable=variable,
+ value=float(row["value"]),
+ unit=unit,
+ quality_flag=flag,
+ )
+ )
+ points.append(
+ MarineDataPoint(
+ timestamp=timestamp,
+ position=Position(latitude=latitude, longitude=longitude),
+ measurements=measurements,
+ metadata=metadata,
+ )
+ )
+ return MarineTimeseries(points=sorted(points, key=lambda item: item.timestamp))
+ 
+ 

+def test_eri_computation_from_sample_csv(tmp_path: Path) -> None:

+ rules = load_rule_set(FIXTURE_DIR / "eri_rules.yaml")
+ sample_csv = ROOT_DIR / "sample_timeseries.csv"
+ timeseries = parse_sample_timeseries(sample_csv)
+ qc_series = apply_quality_controls(
+ timeseries, {MarineVariable.SIGNIFICANT_WAVE_HEIGHT: (0.0, 4.0)}
+ )
+ background = {MarineVariable.SIGNIFICANT_WAVE_HEIGHT: [1.0, 1.1, 1.2]}
+ corrected = apply_bias_correction(qc_series, background, enabled=True)
+ eri_points = compute_eri_timeseries(corrected, rules)
+ assert len(eri_points) == len(corrected.points)
+ assert all(0 <= point.score <= 100 for point in eri_points)
+ assert any(point.quality.bias_corrected for point in eri_points)
  diff --git a/tests/test_fusion.py b/tests/test_fusion.py
  new file mode 100644
  index 0000000000000000000000000000000000000000..f768f45fe2181483c978e32115da3e53a3716603
  --- /dev/null
  +++ b/tests/test_fusion.py
  @@ -0,0 +1,68 @@
  +"""Fusion decision tests."""
+ 

+from __future__ import annotations
+
+from wv.core.fusion import FusionInputs, decide_and_eta
+
+
+def test_coastal_route_conditional_window() -> None:

+ inputs = FusionInputs(
+ combined_ft=6.0,
+ wind_adnoc=20.0,
+ hs_onshore_ft=1.5,
+ hs_offshore_ft=3.0,
+ wind_albahar=20.0,
+ alert="rough at times westward",
+ offshore_weight=0.35,
+ distance_nm=35.0,
+ planned_speed_kt=12.0,
+ )
+ result = decide_and_eta(inputs)
+ 
+ assert result.decision == "Conditional Go (coastal window)"
+ assert result.hs_fused_m == 1.43
+ assert result.wind_fused_kt == 20.0
+ assert result.eta_hours == 3.32
+ assert result.buffer_minutes == 45
+ 
+ 

+def test_high_seas_forces_no_go() -> None:

+ inputs = FusionInputs(
+ combined_ft=8.0,
+ wind_adnoc=24.0,
+ hs_onshore_ft=4.0,
+ hs_offshore_ft=6.0,
+ wind_albahar=26.0,
+ alert="High seas westward",
+ offshore_weight=0.65,
+ distance_nm=80.0,
+ planned_speed_kt=14.0,
+ )
+ result = decide_and_eta(inputs)
+ 
+ assert result.decision == "No-Go"
+ assert result.hs_fused_m == 2.16
+ assert result.wind_fused_kt == 26.0
+ assert result.eta_hours == 6.81
+ assert result.buffer_minutes == 60
+ 
+ 

+def test_clear_conditions_go() -> None:

+ inputs = FusionInputs(
+ combined_ft=2.5,
+ wind_adnoc=12.0,
+ hs_onshore_ft=1.0,
+ hs_offshore_ft=1.2,
+ wind_albahar=11.0,
+ alert=None,
+ offshore_weight=0.30,
+ distance_nm=20.0,
+ planned_speed_kt=13.0,
+ )
+ result = decide_and_eta(inputs)
+ 
+ assert result.decision == "Go"
+ assert result.hs_fused_m == 0.52
+ assert result.wind_fused_kt == 12.0
+ assert result.eta_hours == 1.59
+ assert result.buffer_minutes == 45