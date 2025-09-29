# Weather Vessel CLI - Usage Guide

This guide covers installation, configuration, and usage of the Weather Vessel CLI for marine weather intelligence and voyage scheduling.

## Installation

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Install from Source

```bash
# Clone the repository
git clone <repository-url>
cd weather-vessel

# Install in development mode with all dependencies
pip install -e .[all]

# Or install only core dependencies
pip install -e .
```

### Verify Installation

```bash
wv --version
```

## Configuration

### Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` with your API keys and settings:

```bash
# Provider API keys
WV_STORMGLASS_API_KEY=your-stormglass-key
WV_STORMGLASS_ENDPOINT=https://api.stormglass.io/v2/weather/point
WV_OPEN_METEO_ENDPOINT=https://marine-api.open-meteo.com/v1/marine
WV_NOAA_WW3_ENDPOINT=
WV_COPERNICUS_ENDPOINT=
WV_COPERNICUS_TOKEN=

# Notification settings
WV_SMTP_HOST=smtp.gmail.com
WV_SMTP_PORT=587
WV_SMTP_USERNAME=your-email@gmail.com
WV_SMTP_PASSWORD=your-app-password
WV_EMAIL_SENDER=your-email@gmail.com
WV_EMAIL_RECIPIENTS=ops@example.com,alerts@example.com
WV_SLACK_WEBHOOK=https://hooks.slack.com/services/...
WV_TELEGRAM_TOKEN=your-bot-token
WV_TELEGRAM_CHAT_ID=your-chat-id

# Risk thresholds
WV_MEDIUM_WAVE_THRESHOLD=2.0
WV_HIGH_WAVE_THRESHOLD=3.0
WV_MEDIUM_WIND_THRESHOLD=22.0
WV_HIGH_WIND_THRESHOLD=28.0
```

### Provider Setup

#### Stormglass
1. Sign up at [Stormglass.io](https://stormglass.io/)
2. Get your API key from the dashboard
3. Set `WV_STORMGLASS_API_KEY` in your `.env` file

#### Open-Meteo Marine
- No API key required
- Uses the default endpoint: `https://marine-api.open-meteo.com/v1/marine`

#### NOAA WaveWatch III
- No API key required
- Set `WV_NOAA_WW3_ENDPOINT` if using a custom endpoint

#### Copernicus Marine
1. Register at [Copernicus Marine](https://marine.copernicus.eu/)
2. Get your access token
3. Set `WV_COPERNICUS_TOKEN` in your `.env` file

## Usage

### Instant Risk Check

Check current weather conditions and risk level for a specific location:

```bash
# Check using predefined route
wv check --route MW4-AGI --now

# Check specific coordinates
wv check --lat 25.2048 --lon 55.2708 --now

# Check with custom time
wv check --route MW4-AGI --time "2024-01-15T12:00:00+04:00"
```

**Output:**
```
🌊 Weather Vessel Risk Check
📍 Route: MW4-AGI (25.2048°N, 55.2708°E)
🕐 Time: 2024-01-15 12:00:00+04:00

📊 Forecast Data:
  Wave Height: 1.2m
  Wind Speed: 15.3 m/s
  Wind Direction: 245°
  Swell Height: 0.8m

⚠️  Risk Level: MEDIUM
   Wave height exceeds 2.0m threshold
   Wind speed within normal range
```

### Weekly Schedule Generation

Generate a 7-day voyage schedule with risk assessment:

```bash
# Generate schedule for the week
wv schedule --week --route MW4-AGI

# Export to CSV
wv schedule --week --route MW4-AGI --output outputs/schedule.csv

# Export to ICS (calendar format)
wv schedule --week --route MW4-AGI --ics outputs/schedule.ics

# Export both formats
wv schedule --week --route MW4-AGI --output outputs/schedule.csv --ics outputs/schedule.ics
```

**Output:**
```
📅 Weekly Schedule Generated
📍 Route: MW4-AGI
📊 Risk Summary:
  Low Risk: 5 days
  Medium Risk: 2 days
  High Risk: 0 days

📁 Exports:
  CSV: outputs/schedule.csv
  ICS: outputs/schedule.ics
```

### Notifications

Send alerts via multiple channels:

```bash
# Dry run (preview without sending)
wv notify --dry-run --route MW4-AGI

# Send via email only
wv notify --email --route MW4-AGI

# Send via all configured channels
wv notify --email --slack --telegram --route MW4-AGI

# Send with custom message
wv notify --message "Custom alert message" --route MW4-AGI
```

## Automation

### Cron Jobs

Set up automated checks using cron:

```bash
# Edit crontab
crontab -e

# Add twice-daily checks (06:00 / 17:00 Asia/Dubai)
0 6,17 * * * cd /path/to/weather-vessel && wv check --route MW4-AGI --notify

# Weekly schedule generation (Mondays at 08:00)
0 8 * * 1 cd /path/to/weather-vessel && wv schedule --week --route MW4-AGI --notify
```

### Systemd Service (Linux)

Create a systemd service for continuous monitoring:

```bash
# Create service file
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
# Enable and start service
sudo systemctl enable weather-vessel
sudo systemctl start weather-vessel
```

## Advanced Usage

### Custom Routes

Define custom routes in the configuration:

```python
# Add to your configuration
custom_routes = {
    "CUSTOM-ROUTE": {
        "name": "Custom Route",
        "coordinates": [(25.2048, 55.2708), (26.2048, 56.2708)],
        "description": "Custom voyage route"
    }
}
```

### Risk Threshold Customization

Adjust risk thresholds in your `.env` file:

```bash
# Wave height thresholds (meters)
WV_MEDIUM_WAVE_THRESHOLD=2.0
WV_HIGH_WAVE_THRESHOLD=3.0

# Wind speed thresholds (m/s)
WV_MEDIUM_WIND_THRESHOLD=22.0
WV_HIGH_WIND_THRESHOLD=28.0
```

### Cache Management

The CLI uses disk caching to reduce API calls:

```bash
# Cache location (default)
~/.cache/weather-vessel/

# Clear cache manually
rm -rf ~/.cache/weather-vessel/
```

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Verify API keys are correctly set in `.env`
   - Check API key permissions and quotas

2. **Network Issues**
   - Ensure internet connectivity
   - Check firewall settings for outbound HTTPS

3. **Timezone Issues**
   - Verify system timezone is set correctly
   - Use `timedatectl` on Linux to check timezone

4. **Permission Errors**
   - Ensure write permissions for output directories
   - Check cache directory permissions

### Debug Mode

Enable verbose logging:

```bash
# Set log level to DEBUG
export WV_LOG_LEVEL=DEBUG

# Run with verbose output
wv check --route MW4-AGI --now
```

### Log Files

Check log files for detailed error information:

```bash
# Log location
~/.cache/weather-vessel/logs/

# View recent logs
tail -f ~/.cache/weather-vessel/logs/weather-vessel.log
```

## Support

For additional help:

1. Check the [README.md](../README.md) for general information
2. Review the [Korean usage guide](kr/usage.md) for Korean documentation
3. Check the [CHANGELOG.md](../CHANGELOG.md) for recent updates
4. Open an issue on the project repository

## Examples

### Complete Workflow

```bash
# 1. Check current conditions
wv check --route MW4-AGI --now

# 2. Generate weekly schedule
wv schedule --week --route MW4-AGI --output outputs/schedule.csv

# 3. Send notifications
wv notify --email --slack --route MW4-AGI

# 4. Set up automation
echo "0 6,17 * * * cd /path/to/weather-vessel && wv check --route MW4-AGI --notify" | crontab -
```

This completes the Weather Vessel CLI setup and usage guide. The system is now ready for marine weather monitoring and voyage scheduling.
