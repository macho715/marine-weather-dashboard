# Marine Operations Analytics Toolkit

해양 운항 분석 툴킷 - 물류 제어 타워를 위한 해양 기상 데이터 처리 및 의사결정 시스템

Marine operations analytics toolkit for logistics control towers with marine weather data processing and decision making.

## 주요 기능 (Key Features)

- 🌊 **다중 공급자 해양 데이터**: Stormglass, Open-Meteo Marine, WorldTides 통합
- 🧭 **위험 평가**: 유의파고, 풍속/풍향, 너울 파라미터 기반
- 📅 **7일 항해 일정**: CSV 및 ICS 내보내기, 고정 2자리 메트릭
- 📣 **알림**: 이메일, Slack, Telegram 지원 (dry-run 모드)
- ⏱️ **자동화**: Asia/Dubai 기준 06:00/17:00 자동 체크
- 🤖 **AI 의사결정**: ADNOC + Al Bahar 데이터 융합 알고리즘

## 설치 (Installation)

```bash
# 가상환경 생성
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# 또는
.venv\Scripts\activate     # Windows

# 패키지 설치
pip install -e .

# 환경 변수 설정
cp .env.example .env
```

### 필수 환경 변수 (Required Environment Variables)

| 변수 | 설명 |
|------|------|
| `STORMGLASS_API_KEY` | Stormglass API 키 |
| `WORLDTIDES_API_KEY` | WorldTides API 키 |
| `OPEN_METEO_BASE` | Open-Meteo Marine 엔드포인트 (선택) |
| `OPEN_METEO_TIMEOUT` | 요청 타임아웃 (초) |
| `APP_LOG_LEVEL` | 로그 레벨 (기본: INFO) |
| `TZ` | 애플리케이션 타임존 (UTC로 설정) |

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