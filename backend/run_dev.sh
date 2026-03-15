#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -r requirements.txt >/dev/null

export ALGOHUB_DB_PATH="${ALGOHUB_DB_PATH:-../data/trading_statements.sqlite3}"
export ALGOHUB_API_KEY="${ALGOHUB_API_KEY:-dev-key}"
export ALGOHUB_FX_AUDUSD="${ALGOHUB_FX_AUDUSD:-0.66}"

exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}" --reload
