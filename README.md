# Weather Vessel Logistics Control Tower

A Next.js 15 application that powers a marine logistics control tower. It merges vessel scheduling, marine forecasts, and daily notifications to coordinate twice-daily operations in the Asia/Dubai timezone.

## ✨ Highlights

- **Stabilised APIs** – `/api/marine` now includes guarded fetch with timeout, retries, circuit breaker, and stale-cache fallback.
- **Automated Daily Reports** – `/api/report` fans out to Slack and email and records results for diagnostics.
- **Operations Dashboard** – `public/logistics-app.html` provides a pure-HTML fallback dashboard with sticky schedule header, resilient auto-scroll, and Leaflet mapping safeguards.
- **Scheduler Ready** – Vercel Cron triggers and a self-hosted Node scheduler script keep the 06:00 / 17:00 (Asia/Dubai) reporting cadence.

## 🛠️ Requirements

| Tool       | Version                        |
| ---------- | ------------------------------ |
| Node.js    | 18+ (tested on 20.x)           |
| npm / pnpm | npm 10+ or pnpm 8+             |
| TypeScript | Included via `devDependencies` |
| Vitest     | Included via `devDependencies` |

## 🚀 Getting Started

```bash
npm install
npm run dev
# visit http://localhost:3000
```

The static fallback dashboard is available at [`/public/logistics-app.html`](public/logistics-app.html). Open the file directly in a browser if you need an offline-ready control tower.

## 🔐 Environment Variables

Create a `.env.local` (for Next.js) or `.env` (for tooling) file based on `.env.example`.

```dotenv
SLACK_WEBHOOK_URL= # Incoming webhook for Slack notifications
RESEND_API_KEY=    # Resend API key for transactional email
REPORT_SENDER=no-reply@example.com
REPORT_RECIPIENTS=ops@example.com,owner@example.com
REPORT_TIMEZONE=Asia/Dubai
REPORT_ENDPOINT=http://localhost:3000/api/report
REPORT_LOCK_PATH=.report.lock
```

> ℹ️ `REPORT_TIMEZONE` defaults to Asia/Dubai. Keep Slack, email, scheduler, and dashboards aligned to this timezone for consistent reporting windows.

## 📡 Core Commands

```bash
npm run lint         # ESLint (Next.js configuration)
npm run typecheck    # tsc --noEmit
npm run test         # vitest run --coverage
npx prettier --check .
```

All four checks must succeed before deploying. Vitest coverage is kept ≥ 70% through dedicated tests for notifier success/failure paths, the report route, assistant/briefing flows, and the guarded fetch utility.

## 🧪 Local Verification

### Triggering a Report

```bash
curl -s http://localhost:3000/api/report?slot=am | jq
```

Expect a JSON payload with `ok`, `sent`, `slot`, `generatedAt`, and `sample` fields. Slack/email failures surface per channel without breaking the overall `ok` flag when at least one delivery succeeds.

### PowerShell Health Check

```powershell
pwsh ./scripts/health-check.ps1
pwsh ./scripts/health-check.ps1 -Path "http://localhost:3001/api/health"
```

The script auto-detects the listening Node port (via `WEATHER_PORT`, `Get-NetTCPConnection`, or `netstat` fallback). Responses are printed as JSON; failures show a warning and non-zero exit code.

## ⏰ Scheduling Options

### Vercel (Serverless)

`vercel.json` registers two Cron jobs:

| Local Slot       | UTC Cron     | Endpoint              |
| ---------------- | ------------ | --------------------- |
| 06:00 Asia/Dubai | `0 2 * * *`  | `/api/report?slot=am` |
| 17:00 Asia/Dubai | `0 13 * * *` | `/api/report?slot=pm` |

Deploying to Vercel automatically keeps the reporting rhythm without extra infrastructure.

### Self-hosted Node Scheduler

Use the provided script when running the app outside Vercel:

```bash
# Build once (optional)
npm run build

# Start the Next.js server (or ensure it is already running)
npm run start

# In a separate process
node scripts/scheduler.ts
```

The scheduler honours `REPORT_ENDPOINT`, `REPORT_TIMEZONE`, and writes a lock file (`REPORT_LOCK_PATH`) to avoid duplicate executions when a slot already ran within the TTL window.

## 🗺️ Dashboard Notes (`public/logistics-app.html`)

- Auto-scroll pauses for eight seconds whenever the user interacts (wheel, touch, pointer, or keyboard).
- Panel heights are recalculated with `requestIdleCallback` to keep sticky headers and schedule viewport stable across breakpoints.
- Leaflet maps hide the skeleton immediately, guard against routes shorter than two points, and clamp all coordinates.
- CSV/JSON uploads normalise column aliases (`id`, `voyage`, `VOYAGE`, etc.) with a shared `safeNumber` helper, ensuring IOI calculations never emit `NaN`.
- Modals implement focus trapping and ESC-close logic; drop zones resist flicker on drag leave/enter.

## 🧭 Operations Guide

1. **Before each shift** – Run the PowerShell health check (Windows) or `curl` the `/api/health` endpoint to ensure the deployment is reachable.
2. **Manual report** – Trigger `curl http://localhost:3000/api/report?slot=am` for ad-hoc dispatches; Slack/email partial failures surface within the `sent` array.
3. **Scheduler monitoring** – Watch the scheduler logs (`[scheduler]`) to confirm that both 06:00 and 17:00 slots fire. Delete the lock file if you intentionally need to rerun a slot.
4. **Fallback dashboard** – In case the React front-end is offline, open `public/logistics-app.html` locally to keep situational awareness.

## 📦 Project Structure

```
app/
├── api/
│   ├── assistant/      # Keyword-guided assistant endpoint + tests
│   ├── briefing/       # Daily briefing formatter + tests
│   ├── marine/         # Marine forecast aggregation + tests
│   └── report/         # Slack/email report dispatcher + tests
lib/server/
├── guarded-fetch.ts    # Timeout + retry + circuit breaker helper
├── notifier.ts         # Slack + Resend adapters
└── vessel-data.ts      # Fixture data used in tests and fallbacks
public/
└── logistics-app.html  # Offline-first dashboard
scripts/
├── health-check.ps1    # Port auto-detecting health probe
└── scheduler.ts        # node-cron based twice-daily runner
```

## 🧾 CHANGELOG

See [CHANGELOG.md](CHANGELOG.md) for release notes on stability fixes, layout improvements, and the new reporting workflow.
