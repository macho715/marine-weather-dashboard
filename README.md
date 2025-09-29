# Weather Vessel - Marine Operations CLI

Weather Vessel delivers twice-daily marine risk intelligence for Abu Dhabi corridors. The new CLI orchestrates multi-provider marine forecasts, structured risk scoring, voyage schedule suggestions, and multi-channel alerting while preserving the existing UX expectations from previous releases.

## 🌊 Quick Start

```bash
git clone https://github.com/macho715/WEATHER-VESSEL.git
cd WEATHER-VESSEL
python -m venv .venv
source .venv/bin/activate
pip install -e .[all]
cp .env.example .env
```

Edit `.env` with the credentials you have available:

- `STORMGLASS_API_KEY` for premium wave/wind data
- Optional fallbacks: `OPEN_METEO_ENDPOINT`, `NOAA_WW3_ENDPOINT`
- SMTP/Slack/Telegram settings for downstream notifications
- Risk threshold overrides (`WV_MEDIUM_HS`, `WV_HIGH_HS`, `WV_MEDIUM_WIND`, `WV_HIGH_WIND`)

The CLI automatically loads `.env` values via `python-dotenv` and keeps sensitive tokens out of logs.

## ☁️ Providers & Cache

| Provider | Purpose | Environment keys |
| --- | --- | --- |
| Stormglass | Primary wave & wind source | `STORMGLASS_API_KEY`, `STORMGLASS_ENDPOINT` |
| Open-Meteo Marine | Fallback wave/wind | `OPEN_METEO_ENDPOINT` |
| NOAA WaveWatch III | Long-range swell backup | `NOAA_WW3_ENDPOINT` |

All responses are normalized to `ForecastPoint` objects and cached for **3 hours** at `~/.wv/cache`. When APIs return `429` or time out, the service automatically rotates to the next provider or replays the freshest cache hit.

## ⚓ CLI Commands

| Command | Description |
| --- | --- |
| `wv check --now --lat 24.40 --lon 54.70` | Pulls the latest forecast (≥6 h window) and prints risk summary with 2-decimal metrics. |
| `wv schedule --week --route MW4-AGI --vessel DUNE_SAND` | Generates a 7-day plan, prints a table, and saves `outputs/schedule_week.csv` + `outputs/schedule_week.ics`. |
| `wv notify --route MW4-AGI` | Sends the most recent risk digest via configured channels; `--dry-run` previews without sending. |

### Risk Model

Default rules (overridable via `.env`):

- **Medium**: Hs > 2.00 m **or** wind > 22.00 kt
- **High**: Hs > 3.00 m **or** wind > 28.00 kt
- Missing swell period/direction escalates conservatively.

Output strings always show fixed two decimal places (`format_metric`).

## 📅 Scheduling Auto Alerts

Asia/Dubai time windows are enforced internally. To mirror ops practice, schedule jobs at 06:00 and 17:00 local time.

**Linux/macOS (cron):**
```cron
0 6,17 * * * /usr/local/bin/wv notify --route MW4-AGI >> /var/log/wv.log 2>&1
```

**Windows Task Scheduler:**
```powershell
schtasks /Create /SC DAILY /MO 1 /TN "WV_0600" /TR "wv notify --route MW4-AGI" /ST 06:00
schtasks /Create /SC DAILY /MO 1 /TN "WV_1700" /TR "wv notify --route MW4-AGI" /ST 17:00
```

Under the hood, `AutoCheckScheduler` ensures local-time alignment and composes the alert body with headline metrics and rule-based reasons.

## ✉️ Notification Channels

- **Email** (default): configure `WV_EMAIL_SENDER`, `WV_EMAIL_RECIPIENTS`, and SMTP credentials.
- **Slack**: provide `WV_SLACK_WEBHOOK` for channel posts.
- **Telegram**: set `WV_TELEGRAM_BOT_TOKEN` and `WV_TELEGRAM_CHAT_ID`.

`NotificationManager` fans out messages with retry-safe logging, and `--dry-run` suppresses delivery while echoing the composed payload.

## 🗓 Weekly Voyage Planner

`VoyageScheduler` groups 168 hours of forecast data into daily ETD/ETA slots. The service:

1. Computes average Hs/Wind per day in Asia/Dubai.
2. Applies cargo handling limits (`--cargo-hs-limit`) to escalate risk.
3. Emits ASCII tables, CSV exports, and ICS calendar events (UTC timestamps) to `outputs/`.

## 🧪 Quality Gates

Run the full suite before committing:

```bash
pytest -q --cov=src
black --check .
isort --check-only .
flake8 .
mypy --strict src
```

Coverage must remain ≥ 70%. Typing runs in strict mode; all new code ships with annotations and bilingual one-line docstrings.

## 📂 Project Layout

```
src/wv/core/       # Domain models, risk logic, cache
src/wv/providers/  # Stormglass/Open-Meteo/NOAA adapters
src/wv/services/   # Marine service, scheduler, auto checks
src/wv/notify/     # Email/Slack/Telegram channels
src/wv/cli.py      # Typer CLI entrypoint
```

## 📄 Additional Docs

- `.env.example` – authoritative list of environment variables
- `CHANGELOG.md` – release notes (updated for this feature set)
- `plan.md` – TDD loops followed in this change

For legacy FastAPI UI, refer to earlier tags (`v2.5`) or contact the platform team.

## Installation

```bash
# Clone and install
git clone <repo-url>
cd weather-vessel
pip install -e .[all]

# Copy environment template
cp .env.example .env
# Edit .env with your API keys
```

## Environment Variables

```bash
# Weather Vessel environment configuration
# Provider API keys
WV_STORMGLASS_API_KEY=your-stormglass-key
WV_STORMGLASS_ENDPOINT=https://api.stormglass.io/v2/weather/point
WV_OPEN_METEO_ENDPOINT=https://marine-api.open-meteo.com/v1/marine
WV_NOAA_WW3_ENDPOINT=
WV_COPERNICUS_ENDPOINT=
WV_COPERNICUS_TOKEN=

# Notification settings
WV_SMTP_HOST=
WV_SMTP_PORT=587
WV_SMTP_USERNAME=
WV_SMTP_PASSWORD=
WV_EMAIL_SENDER=
WV_EMAIL_RECIPIENTS=ops@example.com
WV_SLACK_WEBHOOK=
WV_TELEGRAM_TOKEN=
WV_TELEGRAM_CHAT_ID=

# Scheduler options
WV_OUTPUT_DIR=outputs
WV_LOG_LEVEL=INFO
WV_MEDIUM_WAVE_THRESHOLD=2.0
WV_HIGH_WAVE_THRESHOLD=3.0
WV_MEDIUM_WIND_THRESHOLD=22.0
WV_HIGH_WIND_THRESHOLD=28.0
```

## Usage

### Instant Risk Check

```bash
# Check current conditions for a route
wv check --route MW4-AGI --now

# Check specific coordinates
wv check --lat 25.2048 --lon 55.2708 --now
```

### Weekly Schedule Generation

```bash
# Generate 7-day schedule
wv schedule --week --route MW4-AGI

# Export to CSV and ICS
wv schedule --week --route MW4-AGI --output outputs/schedule.csv --ics outputs/schedule.ics
```

### Notifications

```bash
# Send alerts (dry-run first)
wv notify --dry-run --route MW4-AGI

# Send via specific channels
wv notify --email --slack --route MW4-AGI
```

### Automation

```bash
# Twice-daily checks (06:00 / 17:00 Asia/Dubai)
# Add to crontab:
0 6,17 * * * cd /path/to/weather-vessel && wv check --route MW4-AGI --notify

# Weekly schedule generation
0 8 * * 1 cd /path/to/weather-vessel && wv schedule --week --route MW4-AGI --notify
```

## Caching Strategy

- **Disk cache**: 3-hour TTL for forecast data
- **Provider fallback**: Sequential fallback on API failures
- **Retry logic**: Exponential backoff with jitter
- **Quota awareness**: Respects provider rate limits

## Development

```bash
# Install development dependencies
pip install -e .[dev]

# Run tests
pytest -q --cov=src

# Code formatting
black --check .
isort --check-only .

# Linting
flake8 .
mypy --strict src
```

## Architecture

### Core Components
- **CLI**: Typer-based command interface
- **Providers**: Modular weather data sources
- **Risk Engine**: Configurable risk assessment
- **Scheduler**: Timezone-aware voyage planning
- **Notifications**: Multi-channel alert system

### Data Flow
1. **Fetch**: Multiple providers with fallback
2. **Assess**: Risk scoring based on thresholds
3. **Schedule**: 7-day voyage planning
4. **Notify**: Multi-channel alerts
5. **Cache**: Disk-based data persistence

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all checks pass: `pytest && black . && isort . && flake8 . && mypy src`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
