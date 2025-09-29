# Weather Vessel CLI - 사용 가이드

이 가이드는 해양 기상 정보 및 항해 일정 관리를 위한 Weather Vessel CLI의 설치, 설정 및 사용법을 다룹니다.

## 설치

### 사전 요구사항

- Python 3.8 이상
- pip 패키지 매니저

### 소스에서 설치

```bash
# 저장소 클론
git clone <repository-url>
cd weather-vessel

# 모든 의존성과 함께 개발 모드로 설치
pip install -e .[all]

# 또는 핵심 의존성만 설치
pip install -e .
```

### 설치 확인

```bash
wv --version
```

## 설정

### 환경 설정

1. 환경 템플릿 복사:
```bash
cp .env.example .env
```

2. `.env` 파일에 API 키와 설정을 입력:

```bash
# 프로바이더 API 키
WV_STORMGLASS_API_KEY=your-stormglass-key
WV_STORMGLASS_ENDPOINT=https://api.stormglass.io/v2/weather/point
WV_OPEN_METEO_ENDPOINT=https://marine-api.open-meteo.com/v1/marine
WV_NOAA_WW3_ENDPOINT=
WV_COPERNICUS_ENDPOINT=
WV_COPERNICUS_TOKEN=

# 알림 설정
WV_SMTP_HOST=smtp.gmail.com
WV_SMTP_PORT=587
WV_SMTP_USERNAME=your-email@gmail.com
WV_SMTP_PASSWORD=your-app-password
WV_EMAIL_SENDER=your-email@gmail.com
WV_EMAIL_RECIPIENTS=ops@example.com,alerts@example.com
WV_SLACK_WEBHOOK=https://hooks.slack.com/services/...
WV_TELEGRAM_TOKEN=your-bot-token
WV_TELEGRAM_CHAT_ID=your-chat-id

# 위험도 임계값
WV_MEDIUM_WAVE_THRESHOLD=2.0
WV_HIGH_WAVE_THRESHOLD=3.0
WV_MEDIUM_WIND_THRESHOLD=22.0
WV_HIGH_WIND_THRESHOLD=28.0
```

### 프로바이더 설정

#### Stormglass
1. [Stormglass.io](https://stormglass.io/)에서 가입
2. 대시보드에서 API 키 획득
3. `.env` 파일에 `WV_STORMGLASS_API_KEY` 설정

#### Open-Meteo Marine
- API 키 불필요
- 기본 엔드포인트 사용: `https://marine-api.open-meteo.com/v1/marine`

#### NOAA WaveWatch III
- API 키 불필요
- 사용자 정의 엔드포인트 사용 시 `WV_NOAA_WW3_ENDPOINT` 설정

#### Copernicus Marine
1. [Copernicus Marine](https://marine.copernicus.eu/)에 등록
2. 액세스 토큰 획득
3. `.env` 파일에 `WV_COPERNICUS_TOKEN` 설정

## 사용법

### 즉시 위험도 확인

특정 위치의 현재 기상 조건과 위험도를 확인:

```bash
# 미리 정의된 경로로 확인
wv check --route MW4-AGI --now

# 특정 좌표로 확인
wv check --lat 25.2048 --lon 55.2708 --now

# 사용자 정의 시간으로 확인
wv check --route MW4-AGI --time "2024-01-15T12:00:00+04:00"
```

**출력:**
```
🌊 Weather Vessel 위험도 확인
📍 경로: MW4-AGI (25.2048°N, 55.2708°E)
🕐 시간: 2024-01-15 12:00:00+04:00

📊 예보 데이터:
  파고: 1.2m
  풍속: 15.3 m/s
  풍향: 245°
  스웰 높이: 0.8m

⚠️  위험도: 중간
   파고가 2.0m 임계값을 초과
   풍속은 정상 범위 내
```

### 주간 일정 생성

위험도 평가가 포함된 7일 항해 일정 생성:

```bash
# 주간 일정 생성
wv schedule --week --route MW4-AGI

# CSV로 내보내기
wv schedule --week --route MW4-AGI --output outputs/schedule.csv

# ICS (캘린더 형식)로 내보내기
wv schedule --week --route MW4-AGI --ics outputs/schedule.ics

# 두 형식 모두 내보내기
wv schedule --week --route MW4-AGI --output outputs/schedule.csv --ics outputs/schedule.ics
```

**출력:**
```
📅 주간 일정 생성 완료
📍 경로: MW4-AGI
📊 위험도 요약:
  낮은 위험: 5일
  중간 위험: 2일
  높은 위험: 0일

📁 내보내기:
  CSV: outputs/schedule.csv
  ICS: outputs/schedule.ics
```

### 알림

여러 채널을 통해 알림 전송:

```bash
# 드라이 런 (전송 없이 미리보기)
wv notify --dry-run --route MW4-AGI

# 이메일만 전송
wv notify --email --route MW4-AGI

# 모든 설정된 채널로 전송
wv notify --email --slack --telegram --route MW4-AGI

# 사용자 정의 메시지로 전송
wv notify --message "사용자 정의 알림 메시지" --route MW4-AGI
```

## 자동화

### Cron 작업

cron을 사용한 자동화된 확인 설정:

```bash
# crontab 편집
crontab -e

# 하루 두 번 확인 (06:00 / 17:00 Asia/Dubai)
0 6,17 * * * cd /path/to/weather-vessel && wv check --route MW4-AGI --notify

# 주간 일정 생성 (월요일 08:00)
0 8 * * 1 cd /path/to/weather-vessel && wv schedule --week --route MW4-AGI --notify
```

### Systemd 서비스 (Linux)

지속적인 모니터링을 위한 systemd 서비스 생성:

```bash
# 서비스 파일 생성
sudo nano /etc/systemd/system/weather-vessel.service
```

```ini
[Unit]
Description=Weather Vessel CLI Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/weather-vessel
ExecStart=/usr/bin/python3 -m wv.cli check --route MW4-AGI --notify
Restart=always
RestartSec=3600

[Install]
WantedBy=multi-user.target
```

```bash
# 서비스 활성화 및 시작
sudo systemctl enable weather-vessel
sudo systemctl start weather-vessel
```

## 고급 사용법

### 사용자 정의 경로

설정에서 사용자 정의 경로 정의:

```python
# 설정에 추가
custom_routes = {
    "CUSTOM-ROUTE": {
        "name": "사용자 정의 경로",
        "coordinates": [(25.2048, 55.2708), (26.2048, 56.2708)],
        "description": "사용자 정의 항해 경로"
    }
}
```

### 위험도 임계값 사용자 정의

`.env` 파일에서 위험도 임계값 조정:

```bash
# 파고 임계값 (미터)
WV_MEDIUM_WAVE_THRESHOLD=2.0
WV_HIGH_WAVE_THRESHOLD=3.0

# 풍속 임계값 (m/s)
WV_MEDIUM_WIND_THRESHOLD=22.0
WV_HIGH_WIND_THRESHOLD=28.0
```

### 캐시 관리

CLI는 API 호출을 줄이기 위해 디스크 캐싱을 사용:

```bash
# 캐시 위치 (기본값)
~/.cache/weather-vessel/

# 수동으로 캐시 삭제
rm -rf ~/.cache/weather-vessel/
```

## 문제 해결

### 일반적인 문제

1. **API 키 오류**
   - `.env`에서 API 키가 올바르게 설정되었는지 확인
   - API 키 권한 및 할당량 확인

2. **네트워크 문제**
   - 인터넷 연결 확인
   - 아웃바운드 HTTPS에 대한 방화벽 설정 확인

3. **시간대 문제**
   - 시스템 시간대가 올바르게 설정되었는지 확인
   - Linux에서 `timedatectl`로 시간대 확인

4. **권한 오류**
   - 출력 디렉토리에 대한 쓰기 권한 확인
   - 캐시 디렉토리 권한 확인

### 디버그 모드

상세 로깅 활성화:

```bash
# 로그 레벨을 DEBUG로 설정
export WV_LOG_LEVEL=DEBUG

# 상세 출력으로 실행
wv check --route MW4-AGI --now
```

### 로그 파일

상세한 오류 정보를 위해 로그 파일 확인:

```bash
# 로그 위치
~/.cache/weather-vessel/logs/

# 최근 로그 보기
tail -f ~/.cache/weather-vessel/logs/weather-vessel.log
```

## 지원

추가 도움이 필요한 경우:

1. 일반 정보는 [README.md](../README.md) 확인
2. 한국어 문서는 [영어 사용 가이드](en/usage.md) 참조
3. 최근 업데이트는 [CHANGELOG.md](../CHANGELOG.md) 확인
4. 프로젝트 저장소에서 이슈 열기

## 예제

### 완전한 워크플로우

```bash
# 1. 현재 조건 확인
wv check --route MW4-AGI --now

# 2. 주간 일정 생성
wv schedule --week --route MW4-AGI --output outputs/schedule.csv

# 3. 알림 전송
wv notify --email --slack --route MW4-AGI

# 4. 자동화 설정
echo "0 6,17 * * * cd /path/to/weather-vessel && wv check --route MW4-AGI --notify" | crontab -
```

이것으로 Weather Vessel CLI 설정 및 사용 가이드가 완료됩니다. 시스템이 이제 해양 기상 모니터링 및 항해 일정 관리에 준비되었습니다.
