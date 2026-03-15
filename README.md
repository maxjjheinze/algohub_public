# Algo Hub

A premium algo-trading analytics dashboard built with Next.js. This public version proxies live data from a private backend with scaled values.

![Dashboard](https://img.shields.io/badge/status-live-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Portfolio Overview** — aggregated balance, P&L, and return metrics across all accounts
- **Account Cards** — per-account performance with mini equity curves
- **Portfolio Analytics** — 15+ interactive charts (drawdown, win rate, heatmaps, distributions, etc.)
- **Account Detail Modals** — deep-dive stats for individual accounts
- **Live Market Ticker** — real-time FX rates and index prices
- **Time Range Filtering** — 3D / 7D / 14D / 1M / 3M / ALL range pills
- **Multi-Currency Support** — USD and AUD with live FX conversion
- **Dark Theme** — custom dark UI with neon orange accent

## Architecture

```
Private VPS (FastAPI) ◀── Next.js API Proxy (5x scaling) ◀── Frontend (React)
```

| Layer | Tech | Purpose |
|-------|------|---------|
| **API Proxy** | Next.js API Routes | Forwards requests to private backend, applies 5x scaling and account obfuscation |
| **Frontend** | Next.js 14, Tailwind, Recharts | Interactive dashboard UI |

## Quick Start

```bash
git clone https://github.com/maxjjheinze/algohub_public.git
cd algohub_public/frontend
cp .env.example .env.local
# Edit .env.local with your API URL and key
npm install
npm run dev
# Dashboard at http://localhost:3000
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ALGOHUB_API_BASE_URL` | Base URL of the private AlgoHub API |
| `ALGOHUB_KEY` | API key for authenticating with the private backend |

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts, Framer Motion

## License

MIT
