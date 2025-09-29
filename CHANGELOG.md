# Changelog

## [Unreleased]

### Added

- `/api/report` daily briefing automation now fans out to Slack and Resend with per-channel status reporting.
- PowerShell `scripts/health-check.ps1` auto-detects dev server ports and prints standardised JSON output.
- `public/logistics-app.html` logistics console with resilient auto scroll, dropzone parsing, and Leaflet stabilisation.
- `lib/server/guarded-fetch` utility with timeout, exponential backoff, and jittered retries (+ tests).
- Vercel cron schedules (UTC 02:00/13:00) and self-hosted `node-cron` runner with TTL locking.
- Vitest suites covering notifier channels, report success/partial flows, guarded fetch resilience, marine API caching, and briefing summaries.

### Changed

- `/api/marine` now uses guarded fetch with retries, circuit breaker, stale cache fallback, and safe numeric coercion.
- `/api/briefing` clamps IOI calculations, respects timezone payloads, and appends `[Marine Snapshot]` summary line.
- `/api/assistant` returns guided help when prompts lack recognised keywords or attachments.
- README refreshed with ops workflows, QA gates, and scheduler/health-check documentation.

### Fixed

- Marine fetch failures after cache expiry now serve the last snapshot (`stale: true`) instead of erroring.
- Modal focus trap, dropzone drag events, and Leaflet skeleton race conditions resolved in the dashboard.
- Scheduler prevents concurrent executions via in-memory guard plus TTL lock file.

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
