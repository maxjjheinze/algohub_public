# AlgoHub Public

## Overview
Public-facing trading dashboard that proxies data from the private AlgoHub backend (VPS at 5.223.55.42:8000). All dollar values are scaled 5x for public display. Account numbers are obfuscated via deterministic hashing.

## Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Recharts
- **Data source**: Private AlgoHub API (proxied through Next.js API route)
- No local backend or database — all data comes from the private VPS

## Architecture
- `frontend/app/api/algohub/[...path]/route.ts` — API proxy that forwards requests to the private backend, intercepts JSON responses, and applies scaling/obfuscation via `transformResponse()`
- `frontend/lib/scaler.ts` — Core transformation module: 5x scaling for dollar values, deterministic account number obfuscation (djb2 hash)
- `frontend/lib/apiClient.ts` — Client-side data fetching, hero metric derivation, FX correction
- Frontend components are unchanged — they consume the already-transformed data

## Key Decisions
- **5x scaling at proxy layer**: Applied in the API route before data reaches the frontend. This means all frontend code (including FX conversion, percent_gain derivation) works correctly without changes.
- **Deterministic account obfuscation**: djb2 hash → 6-digit number. Consistent across all endpoints so the same real account always maps to the same fake number.
- **Ratios/percentages unchanged**: percent_gain, equity_curve, win_rate, profit_factor, daily_return_pct, max_drawdown_pct, recovery_factor are all ratios that naturally preserve under uniform scaling.
- **Broker names kept as-is**: Per user request.

## Current Status
- Proxy with 5x scaling: implemented
- Backend/seed/sqlite removed: done
- `.env.local` points to VPS but uses placeholder `dev-key` — needs real API key

## Known Issues
- `ALGOHUB_KEY` in `.env.local` is set to `dev-key` placeholder. Need to set the real private API key for the proxy to authenticate with the VPS.
