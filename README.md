# Weather Vessel Logistics Control Tower

A Next.js + TypeScript dashboard that delivers twice-daily marine briefings, automated notifications, and operational tooling for vessels serving the UAE corridor.

## ✨ Highlights

- **Stabilised dashboard** – sticky panels, interaction-aware auto scroll, resilient Leaflet map.
- **Resilient data plane** – marine fetch with timeout, exponential backoff, and stale cache fallback.
- **Daily reporting** – Slack + Resend email delivery, manual trigger endpoint, and cron scheduling (Vercel & self-hosted).
- **Operator toolkit** – PowerShell health check with auto port detection and logistics dropzone import.

## 🚀 Getting Started

```bash
git clone https://github.com/macho715/marine-weather-dashboard.git
cd marine-weather-dashboard
npm install
npm run dev
```

Visit <http://localhost:3000> (default) or override with `WEATHER_PORT`.

### Required Environment

Create `.env.local` using the template:

```bash
cp .env.example .env.local
```

| Key                 | Description                                                 |
| ------------------- | ----------------------------------------------------------- |
| `SLACK_WEBHOOK_URL` | Incoming webhook for daily briefings.                       |
| `RESEND_API_KEY`    | Resend API token for email delivery.                        |
| `REPORT_SENDER`     | Verified sender (e.g. `no-reply@example.com`).              |
| `REPORT_RECIPIENTS` | Comma/line separated recipient list.                        |
| `REPORT_TIMEZONE`   | Defaults to `Asia/Dubai` (UTC+04).                          |
| `REPORT_ENDPOINT`   | Override for self-hosted scheduler (defaults to local API). |
| `WEATHER_PORT`      | Optional custom dev port (used by health check).            |

## 🧪 Quality Gates

| Command                  | Purpose                          |
| ------------------------ | -------------------------------- |
| `npm run lint`           | ESLint (`--max-warnings=0`).     |
| `npx prettier --check .` | Formatting guard.                |
| `npm run typecheck`      | `tsc --noEmit`.                  |
| `npm run test`           | Vitest with V8 coverage (≥ 70%). |

Example full QA suite:

```bash
npm run lint
npx prettier --check .
npm run typecheck
npm run test
```

## 🛰️ API Surface

| Endpoint         | Notes                                                                             |
| ---------------- | --------------------------------------------------------------------------------- |
| `/api/marine`    | Open-Meteo Marine with timeout/backoff, cached snapshots, circuit breaker.        |
| `/api/report`    | Aggregates vessel + marine + briefing, sends Slack/Email, returns channel status. |
| `/api/briefing`  | Generates operational briefing and `[Marine Snapshot]` summary.                   |
| `/api/assistant` | Keyword-aware assistant; returns guided help when prompt lacks recognised intent. |
| `/api/health`    | Basic heartbeat used by PowerShell script.                                        |

## 🗺️ Dashboard (public/logistics-app.html)

- Sticky header/footer with dynamic `--panel-height` & `--schedule-max-height` recalculated via `requestIdleCallback`.
- Schedule auto scroll pauses for 8 seconds after any user input (scroll/keyboard/pointer/touch).
- Leaflet map removes skeleton immediately, guards short/invalid routes, and clamps IOI calculations.
- Dropzone imports CSV/JSON with flexible column aliases (`voyage`, `VOYAGE`, etc.) using `safeNumber` coercion.
- Modal implements ESC close, focus trap, and safe drop interactions.

## 📬 Daily Reporting

### Manual Trigger

```bash
curl http://localhost:3000/api/report?slot=am | jq
```

Response schema:

```json
{
  "ok": true,
  "slot": "am",
  "generatedAt": "2025-03-17T02:00:00.000Z",
  "sent": [
    { "channel": "slack", "ok": true },
    { "channel": "email", "ok": true }
  ],
  "sample": "...briefing text..."
}
```

Partial success surfaces `ok: true` with per-channel `error` descriptions.

### Serverless (Vercel)

`vercel.json` defines UTC cron triggers:

- `0 2 * * *` → `/api/report?slot=am` (06:00 Asia/Dubai)
- `0 13 * * *` → `/api/report?slot=pm` (17:00 Asia/Dubai)

Deploying to Vercel automatically activates these schedules.

### Self-hosted Scheduler

The Node cron runner prevents duplicate dispatches via file TTL + in-memory guard:

```bash
REPORT_ENDPOINT="https://ops.example.com/api/report" \
REPORT_TIMEZONE="Asia/Dubai" \
node scripts/scheduler.ts
```

Lock file defaults to `.weather-vessel-report.lock` (override with `REPORT_LOCK_FILE`).

## 🛠️ Operations Toolkit

### Health Check (PowerShell)

```powershell
pwsh scripts/health-check.ps1          # auto-detects listening node port
pwsh scripts/health-check.ps1 -Endpoint "https://staging.example.com/api/health"
```

The script prefers `WEATHER_PORT`, falls back to listening `node.exe` ports (3000/3001 priority), and prints JSON on success.

### Local Diagnostics

- `npm run dev` and open `public/logistics-app.html` in a browser for the static dashboard.
- Use the dropzone to import updated schedule CSV/JSON while auto scroll remains paused after manual interaction.

## 📄 CHANGELOG & PLAN

- See [`CHANGELOG.md`](./CHANGELOG.md) for release notes (“Stability & reporting automation” entry added).
- Development loops follow [`plan.md`](./plan.md) (RED → GREEN → REFACTOR cycles).

## 🤝 Contributing

1. Fork & branch (`codex/<feature>` naming).
2. Follow TDD loops, keep commits conventional.
3. Run the QA suite (lint, prettier, typecheck, test).
4. Submit PR with operational context and screenshots if UI changes.

## 📜 License

MIT License – see [LICENSE](./LICENSE).
