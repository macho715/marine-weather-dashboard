# Changelog

## [Unreleased]

### Added

- Introduced `wv` Typer CLI with `check`, `schedule`, and `notify` workflows backed by Stormglass, Open-Meteo Marine, and NOAA WaveWatch III providers.
- Implemented disk-backed cache (`~/.wv/cache`) with three-hour TTL and provider fallback/resilience logic.
- Added weekly voyage planner that prints ASCII tables and exports CSV + ICS schedules with risk notes.
- Delivered email, Slack, and Telegram notification adapters plus twice-daily Asia/Dubai auto-check scheduler.
- Published `.env.example`, `plan.md`, and comprehensive pytest coverage for providers, risk rules, scheduler, notifications, and CLI.

### Changed

- Replaced legacy FastAPI usage docs with CLI-centric README guidance, including cron and Task Scheduler recipes.
- Centralized configuration via `pyproject.toml` with strict tooling defaults (`black`, `isort`, `flake8`, `mypy`).
- Normalized numeric outputs to two decimal places and ensured bilingual docstrings across new modules.

### Fixed

- Resolved timezone drift by hard-coding Asia/Dubai context inside scheduling and notification flows.
- Ensured provider outages (HTTP 429/timeout) automatically cascade to fallbacks or serve cached responses.

## 2025-03-18

### Added

- `public/logistics-app.html` offline dashboard with auto-scroll suppression, sticky schedule header, Leaflet safeguards, and expanded CSV/JSON ingestion.
- `lib/server/guarded-fetch` utility shared by `/api/marine` to deliver timeout, retry, and circuit breaker resilience with Vitest coverage.
- `/api/report` fan-out now dispatches Slack and email concurrently, recording partial success metadata.
- PowerShell `scripts/health-check.ps1` auto-detects listening ports and formats responses consistently.

### Changed

- `/api/marine` returns stale cache snapshots when fresh fetches fail after TTL expiry and clamps numeric parsing through `safeNumber` helpers.
- `/api/assistant` guidance now guards against null dataset references and provides richer help messaging when keywords/attachments are missing.
- `/api/briefing` appends marine summaries and prevents IOI `NaN` propagation with safe number parsing.
- Documentation refreshed with scheduling recipes, environment variables, health-check guidance, and dashboard notes.

### Fixed

- Leaflet map skeletons are hidden immediately on initialisation and dropzones no longer flicker during drag transitions.
- Briefing focus trap handles ESC and tab navigation reliably to avoid modal focus leaks.
- Scheduler cron configuration aligns UTC triggers (02:00 / 13:00) with Asia/Dubai (06:00 / 17:00) commitments.

## 2025-03-17

### Added

- Automated daily reporting pipeline with Slack and Resend delivery helpers.
- `/api/report` endpoint combining vessel, marine, and briefing data with marine snapshot summary.
- node-cron scheduler script for self-hosted deployments and Vercel cron definitions.
- Dashboard badge tooltip plus manual "Send Daily Report" control with event feed logging.

### Changed

- `/api/health` now surfaces last report metadata for UI consumption.
- Updated documentation and environment template for new integrations.

### Fixed

- Health badge no longer leaves stale text when API errors occur; report failures are highlighted as warnings.
