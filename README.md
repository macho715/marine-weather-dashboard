# Weather Vessel

Weather Vessel delivers marine weather intelligence, risk scoring, and voyage scheduling for logistics control towers. The CLI aggregates multiple providers (Stormglass, Open-Meteo Marine, NOAA WaveWatch III, Copernicus) with automatic fallback, disk caching, and timezone-safe scheduling in **Asia/Dubai**.

## Key Features

- 🌊 **Multi-provider marine data** with retries, quota-aware backoff, and cache fallback (≤3 h)
- 🧭 **Risk assessment** from significant wave height, wind speed/direction, and swell parameters
- 📅 **7-day voyage schedule** with CSV and ICS exports and fixed 2-decimal metrics
- 📣 **Notifications** via Email (default), Slack, and Telegram with dry-run support
- ⏱️ **Twice-daily checks** aligned to 06:00 / 17:00 Asia/Dubai for automated alerts
- 🚢 **Marine Operations Toolkit** (`marine_ops`) for hybrid AGI/DAS workflows
- 🔄 **ADNOC × Al Bahar Fusion** decision support with Go/Conditional/No-Go gates

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
| `STORMGLASS_API_KEY`                                 | Stormglass API key                                    |
| `WORLDTIDES_API_KEY`                                 | WorldTides API key                                    |
| `OPEN_METEO_BASE`                                    | Optional custom Open-Meteo base URL                    |
| `OPEN_METEO_TIMEOUT`                                 | Request timeout (seconds)                             |
| `APP_LOG_LEVEL`                                      | Log level (default: INFO)                             |
| `TZ`                                                 | Application timezone (set to UTC)                     |
| `WV_OPEN_METEO_ENDPOINT`                           | Optional custom Open-Meteo base URL                    |
| `WV_NOAA_WW3_ENDPOINT`                             | Optional NOAA WaveWatch III JSON endpoint              |
| `WV_COPERNICUS_ENDPOINT` / `WV_COPERNICUS_TOKEN` | Optional Copernicus API configuration                  |
| `WV_SMTP_*`                                        | SMTP host/port/credentials for email                   |
| `WV_EMAIL_RECIPIENTS`                              | Comma separated default recipients                     |
| `WV_SLACK_WEBHOOK`                                 | Slack webhook URL (optional)                           |
| `WV_TELEGRAM_TOKEN` / `WV_TELEGRAM_CHAT_ID`      | Telegram bot configuration                             |
| `WV_OUTPUT_DIR`                                    | Directory for generated CSV/ICS (default `outputs/`) |

 Risk thresholds can be tuned via `WV_MEDIUM_WAVE_THRESHOLD`, `WV_HIGH_WAVE_THRESHOLD`, `WV_MEDIUM_WIND_THRESHOLD`, and `WV_HIGH_WIND_THRESHOLD`.

### Marine Operations Toolkit (`marine_ops`)

The new `marine_ops` package provides a reusable toolkit for hybrid AGI/DAS workflows:

- **Connectors**: Stormglass, WorldTides, and Open-Meteo fallback clients that normalize responses into a common schema with ISO 8601 UTC timestamps and per-variable unit metadata.
- **Core utilities**: Unit conversions, quality control (physical bounds + IQR clipping), μ/σ bias correction, and weighted ensemble blending with 2-decimal precision.
- **ERI v0**: Externalized YAML rules converted into a 0–100 Environmental Readiness Index (ERI) score with quality badges highlighting data gaps and bias adjustments.
- **Settings + Fallback**: `MarineOpsSettings` bootstraps connectors from environment variables while `fetch_forecast_with_fallback` routes around Stormglass rate limits/timeouts using Open-Meteo Marine.

```python
import datetime as dt

from marine_ops.connectors import OpenMeteoFallback, StormglassConnector, fetch_forecast_with_fallback
from marine_ops.core import MarineOpsSettings
from marine_ops.eri import compute_eri_timeseries, load_rule_set

settings = MarineOpsSettings.from_env()
stormglass = settings.build_stormglass_connector()
fallback = settings.build_open_meteo_fallback()
start = dt.datetime.now(tz=dt.timezone.utc)
end = start + dt.timedelta(days=3)
series = fetch_forecast_with_fallback(25.0, 55.0, start, end, stormglass, fallback)
rules = load_rule_set("tests/marine_ops/fixtures/eri_rules.yaml")
eri_points = compute_eri_timeseries(series, rules)
```

### ADNOC × Al Bahar voyage fusion

- Harmonise **Combined(seas)**, onshore/offshore significant wave height, and wind guidance into a single decision.
- Apply **unit normalization** (ft→m, kt→m/s), **route weighting** (coastal/offshore), and **alert amplification** (rough at times, High seas).
- Compute **Go/Conditional/No-Go** gates with optional **coastal windowing** for sheltered routes.
- Estimate **ETA** with speed-loss models for wind and wave resistance.

```python
from wv.core.fusion import Inputs, decide_and_eta

inputs = Inputs(
    C_ft=3.5,  # ADNOC Combined(seas) in feet
    W_adnoc=15.0,  # ADNOC wind speed in knots
    Hs_on_ft=2.0,  # Al Bahar onshore significant wave height in feet
    Hs_off_ft=3.0,  # Al Bahar offshore significant wave height in feet
    W_albahar=18.0,  # Al Bahar wind speed in knots
    alert="rough at times westward",  # Al Bahar alert message
    w_off=0.35,  # Offshore weight (0-1)
    D_NM=120.0,  # Distance in nautical miles
    V_plan=12.0,  # Planned speed in knots
)

result = decide_and_eta(inputs)
print(f"Decision: {result.decision}")
print(f"Fused Hs: {result.Hs_fused_m:.2f}m")
print(f"Fused Wind: {result.W_fused_kt:.1f}kt")
print(f"ETA: {result.ETA_hours:.1f}h")
print(f"Buffer: {result.buffer_min}min")
```

## 사용법 (Usage)

### 해양 운항 의사결정

```python
from marine_ops.core.marine_decision import MarineInputs, decide_and_eta

# 입력 데이터
inputs = MarineInputs(
    combined_ft=3.5,           # ADNOC Combined 파고 (ft)
    wind_adnoc=15.0,           # ADNOC 풍속 (kt)
    hs_onshore_ft=2.0,         # Al Bahar 연안 파고 (ft)
    hs_offshore_ft=3.0,        # Al Bahar 외해 파고 (ft)
    wind_albahar=18.0,         # Al Bahar 풍속 (kt)
    alert="rough at times westward",  # 경보 메시지
    offshore_weight=0.35,      # 외해 가중치 (0-1)
    distance_nm=120.0,         # 항로 거리 (NM)
    planned_speed=12.0,        # 계획 속력 (kn)
)

# 의사결정 실행
result = decide_and_eta(inputs)
print(f"결정: {result.decision}")
print(f"융합 파고: {result.hs_fused_m}m")
print(f"융합 풍속: {result.wind_fused_kt}kt")
print(f"예상 소요시간: {result.eta_hours}시간")
```

### 해양 데이터 커넥터

```python
from marine_ops.core.settings import MarineOpsSettings
from marine_ops.connectors import fetch_forecast_with_fallback
import datetime as dt

# 설정 로드
settings = MarineOpsSettings.from_env()

# 커넥터 생성
stormglass = settings.build_stormglass_connector()
fallback = settings.build_open_meteo_fallback()

# 예보 조회 (폴백 포함)
start = dt.datetime.now(tz=dt.timezone.utc)
end = start + dt.timedelta(days=3)
series = fetch_forecast_with_fallback(25.0, 55.0, start, end, stormglass, fallback)
```

### 샘플 데이터 생성

```bash
# 샘플 CSV 생성
python scripts/generate_sample_csv.py --output .

# 헬스체크 (Windows)
powershell .\scripts\health_check.ps1
```

## 알고리즘 (Algorithm)

### 해양 운항 의사결정 알고리즘

1. **단위 통일**: 피트 → 미터 변환 (1 ft = 0.3048 m)
2. **NCM 혼합**: 연안/외해 가중 평균
3. **데이터 융합**: ADNOC + Al Bahar + 경보 가중치
4. **의사결정 게이트**:
   - **Go**: Hs ≤ 1.00m AND W ≤ 20kt AND 경보 없음
   - **Conditional Go**: 1.00 < Hs ≤ 1.20m OR 20 < W ≤ 22kt OR 경보 있음
   - **No-Go**: Hs > 1.20m OR W > 22kt OR High seas/Fog 경보
5. **ETA 계산**: 속력 손실 모델 적용

### 상수 (Constants)

- **α = 0.85**: Combined → 등가 Hs 축소계수
- **β = 0.80**: ADNOC 스무딩 보정
- **γ**: 경보 가중치 (없음=0.00, rough=0.15, High seas=0.30)
- **k_wind = 0.06**: 풍속 감속 계수
- **k_wave = 0.60**: 파고 감속 계수

## 테스트 (Testing)

```bash
# 모든 테스트 실행
pytest tests/ -v

# 특정 테스트 실행
pytest tests/marine_ops/test_marine_decision.py -v

# 커버리지 포함
pytest tests/ --cov=src/marine_ops --cov-report=html
```

## 개발 (Development)

```bash
# 개발 의존성 설치
pip install -e .[all]

# 코드 포맷팅
black src/ tests/
isort src/ tests/

# 린팅
flake8 src/ tests/
mypy src/
```

## 프로젝트 구조 (Project Structure)

```
src/marine_ops/
├── core/
│   ├── schema.py          # 데이터 모델
│   ├── settings.py        # 환경 설정
│   ├── units.py          # 단위 변환
│   └── marine_decision.py # 의사결정 알고리즘
├── connectors/
│   ├── stormglass.py     # Stormglass API
│   ├── open_meteo_fallback.py # Open-Meteo 폴백
│   └── worldtides.py     # WorldTides API
└── eri/                  # ERI 계산 (향후 구현)
```

## 라이선스 (License)

MIT License. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 기여 (Contributing)

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 지원 (Support)

문제가 있거나 질문이 있으시면 이슈를 생성해주세요.

---

**Marine Operations Analytics Toolkit v0.1.0**  
HVDC Project - Samsung C&T Logistics & ADNOC·DSV Strategic Partnership