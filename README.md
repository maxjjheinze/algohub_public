# Algo Hub

A premium algo-trading analytics dashboard built with Next.js and FastAPI. This is a public demo version powered by synthetic data — the real version tracks live trading accounts via an ETL pipeline.

![Dashboard](https://img.shields.io/badge/status-demo-orange)
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
seed.py ──▶ SQLite ◀── Backend (FastAPI) ◀── Frontend (Next.js)
```

| Layer | Tech | Purpose |
|-------|------|---------|
| **Seed** | Python (stdlib) | Generates synthetic trading data |
| **Backend** | FastAPI + SQLite | REST API serving dashboard data |
| **Frontend** | Next.js 14, Tailwind, Recharts | Interactive dashboard UI |

## Quick Start

### 1. Clone and seed

```bash
git clone https://github.com/maxjjheinze/algohub_public.git
cd algohub_public
python3 seed/seed.py
```

### 2. Start the backend

```bash
cd backend
./run_dev.sh
# API running at http://localhost:8000
```

### 3. Start the frontend

```bash
cd frontend
cp ../.env.example .env.local
npm install
npm run dev
# Dashboard at http://localhost:3000
```

## Demo Accounts

| Broker | Account | Strategy | Currency | Style |
|--------|---------|----------|----------|-------|
| Apex Trading | 100234 | Trend Rider v3 | USD | Steady grower, ~55% win rate |
| Apex Trading | 100567 | Scalper Pro | USD | Volatile, ~65% win rate |
| Nova Markets | 200891 | Grid Master | AUD | Consistent with a major drawdown |
| Titan FX | 300456 | Momentum Alpha | USD | Aggressive, 90-day track record |

## API Endpoints

All endpoints require `X-ALGOHUB-KEY` header (default: `dev-key`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/accounts?range=all` | Account cards with time series |
| GET | `/cleaned` | Cleaned daily data |
| GET | `/stats` | Computed statistics |
| GET | `/raw` | Raw daily statements |
| GET | `/views` | View counter |
| POST | `/views/increment` | Increment view counter |

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts, Framer Motion
- **Backend:** FastAPI, Pydantic, SQLite, python-dateutil
- **Seed:** Python stdlib (`random`, `sqlite3`)

## License

MIT
