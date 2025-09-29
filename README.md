# Weather Vessel Logistics Control Tower

A Next.js web application for marine logistics operations, providing real-time vessel tracking, weather analysis, and automated reporting for maritime operations in the Middle East region.

## 🚀 Live Deployment

**Production URL**: https://weather-vessel-logistics.vercel.app

**Status**: ✅ Active | **Environment**: Production | **Duration**: 48s | **Last Deploy**: 2h ago

## 🌊 Quick Start

```bash
git clone https://github.com/macho715/marine-weather-dashboard.git
cd marine-weather-dashboard
npm install
npm run dev
```

Visit http://localhost:3000 to access the application.

## 🔧 API Endpoints

| Endpoint | Description | Status |
|----------|-------------|--------|
| `/api/health` | System health check | ✅ Active |
| `/api/marine` | Marine weather data + IOI calculation | ✅ Active |
| `/api/vessel` | Vessel information and tracking | ✅ Active |
| `/api/briefing` | AI-powered briefing generation | ✅ Active |
| `/api/report` | Automated report generation | ✅ Active |
| `/api/assistant` | AI assistant for logistics queries | ✅ Active |

## 📊 Features

- **Real-time Vessel Tracking**: AIS data integration for vessel monitoring
- **Weather Analysis**: Marine weather data with IOI (Index of Interest) scoring
- **Automated Reporting**: Twice-daily reports with Slack/Email notifications
- **AI-Powered Briefings**: Intelligent logistics briefings and recommendations
- **Multi-channel Alerts**: Slack, Email, and Telegram notifications

## 🏗️ Technology Stack

- **Frontend**: Next.js 15.2.4, React 19, TypeScript
- **Styling**: Tailwind CSS v4, Radix UI components
- **Deployment**: Vercel (Production)
- **Node.js**: 20.x (Fixed version)
- **Package Manager**: pnpm 10.x
- **Build Time**: ~48 seconds

## 🔧 Development

### Local Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests with coverage
```

### Environment Variables
```bash
# Notification settings
SLACK_WEBHOOK_URL=your_slack_webhook
RESEND_API_KEY=your_resend_api_key
REPORT_SENDER=no-reply@yourdomain.com
REPORT_RECIPIENTS=ops@yourdomain.com

# Optional: Custom timezone
REPORT_TIMEZONE=Asia/Dubai
```

## 📊 IOI (Index of Interest) Scoring

The system calculates IOI scores based on marine conditions:

- **GO (75+)**: Safe sailing conditions
- **WATCH (55-74)**: Monitor conditions closely  
- **NO-GO (<55)**: Unsafe for operations

Factors include wave height (Hs), wind speed (knots), and swell period.

## 🚀 Deployment Status

| Metric | Value |
|--------|-------|
| **Status** | ✅ Production Ready |
| **Build Time** | 48 seconds |
| **Node.js** | 20.x (Fixed) |
| **Package Manager** | pnpm 10.x |
| **Last Deploy** | 2 hours ago |
| **Commit** | 596436b |

## 📂 Project Structure

```
app/
├── api/                    # API routes
│   ├── health/            # System health
│   ├── marine/            # Weather data
│   ├── vessel/            # Vessel tracking
│   ├── briefing/          # AI briefings
│   └── report/            # Report generation
lib/
├── server/                # Server-side modules
│   ├── ioi.ts            # IOI calculations
│   ├── vessel-data.ts    # Vessel dataset
│   ├── report-state.ts   # Report management
│   └── notifier.ts       # Notifications
components/                # React components
public/                    # Static assets
```

## 🔧 Configuration

### Vercel Settings
- **Build Command**: Auto-detected (`next build`)
- **Output Directory**: Auto-detected (`.next`)
- **Install Command**: Auto-detected (`pnpm install`)
- **Node.js Version**: 20.x (Fixed)

### pnpm Configuration
```json
{
  "pnpm": {
    "onlyBuiltDependencies": [
      "@tailwindcss/oxide",
      "esbuild", 
      "sharp"
    ]
  }
}
```

## 📈 Performance

- **First Load JS**: 101-102 kB
- **API Response Time**: <100ms
- **Build Cache**: 172.95 MB
- **Edge Requests**: Monitored
- **Function Invocations**: Tracked

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.
