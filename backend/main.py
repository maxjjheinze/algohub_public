from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from dateutil import parser as date_parser
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from cleaner import CleanedRow, clean_daily_data
from stats import StatsRow, compute_stats

DB_PATH = os.getenv("ALGOHUB_DB_PATH", os.path.join("data", "trading_statements.sqlite3"))
API_KEY = os.getenv("ALGOHUB_API_KEY")
FX_AUDUSD = float(os.getenv("ALGOHUB_FX_AUDUSD", "0.66"))

# Accounts used exclusively for internal transfers — exclude from deposit/withdrawal totals
INTERNAL_TRANSFER_ACCOUNTS: set[tuple[str, str]] = set()

TRANSFER_EXCLUSIONS_DDL = """
CREATE TABLE IF NOT EXISTS transfer_exclusions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  broker TEXT NOT NULL,
  account_number TEXT NOT NULL,
  statement_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  note TEXT,
  transfer_group INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE(broker, account_number, statement_date)
);
"""


def ensure_transfer_exclusions_table() -> None:
    with get_conn() as conn:
        conn.executescript(TRANSFER_EXCLUSIONS_DDL)
        conn.commit()


def load_transfer_exclusions() -> set[tuple[str, str, str]]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT broker, account_number, statement_date FROM transfer_exclusions"
        ).fetchall()
    return {(r["broker"], r["account_number"], r["statement_date"]) for r in rows}


class ViewsModel(BaseModel):
  total_views: int


class AccountSeriesPoint(BaseModel):
  date: str
  balance_usd: float
  balance_native: float = 0.0
  deposit_withdrawal_usd: float = 0.0


class AccountCard(BaseModel):
  broker: str
  account_number: str
  platform: str
  base_currency: str
  initiation_date: str
  days_active: int
  balance_usd: float
  balance_native: float = 0.0
  closed_pnl_usd: float
  closed_pnl_native: float = 0.0
  net_contributions_usd: float
  net_contributions_native: float = 0.0
  total_deposits_usd: float = 0.0
  total_deposits_native: float = 0.0
  total_withdrawals_usd: float = 0.0
  total_withdrawals_native: float = 0.0
  percent_gain: float
  series: List[AccountSeriesPoint]


RawRow = Dict[str, Any]


app = FastAPI(title="Algo Hub API", version="0.1.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:3000"],
  allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
  allow_credentials=True,
  allow_methods=["GET", "POST"],
  allow_headers=["Content-Type", "X-ALGOHUB-KEY"],
)


def require_api_key(x_algohub_key: Optional[str] = Header(default=None)) -> None:
  if not API_KEY:
    raise HTTPException(status_code=401, detail="API key not configured")
  if not x_algohub_key or x_algohub_key != API_KEY:
    raise HTTPException(status_code=401, detail="Invalid API key")


@contextmanager
def get_conn() -> sqlite3.Connection:
  conn = sqlite3.connect(DB_PATH, check_same_thread=False)
  conn.row_factory = sqlite3.Row
  try:
    yield conn
  finally:
    conn.close()


def ensure_views_table() -> None:
  with get_conn() as conn:
    conn.execute(
      """
      CREATE TABLE IF NOT EXISTS views (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_views INTEGER NOT NULL DEFAULT 0
      )
      """
    )
    conn.execute("INSERT OR IGNORE INTO views (id, total_views) VALUES (1, 0)")
    conn.commit()


def fetch_daily_rows() -> List[sqlite3.Row]:
  with get_conn() as conn:
    rows = conn.execute(
      """
      SELECT statement_date, broker, account_number, balance, closed_pnl, deposit_withdrawal,
             COALESCE(currency, 'USD') AS currency
      FROM daily_statements
      ORDER BY statement_date ASC
      """
    ).fetchall()
  return list(rows)


def convert_to_usd(balance: float, closed_pnl: float, deposit_withdrawal: float, currency: str) -> Tuple[float, float, float]:
  cur = (currency or "USD").upper()
  if cur == "AUD":
    fx = FX_AUDUSD
  else:
    fx = 1.0
  return balance * fx, closed_pnl * fx, deposit_withdrawal * fx


def build_account_time_series(rows: List[sqlite3.Row]) -> Dict[Tuple[str, str], Dict[str, Any]]:
  exclusions = load_transfer_exclusions()
  per_acct: Dict[Tuple[str, str], Dict[str, Any]] = {}
  for r in rows:
    acct_key = (r["broker"], r["account_number"])
    acct = per_acct.setdefault(
      acct_key,
      {
        "currency": r["currency"],
        "rows": [],
      },
    )
    acct["rows"].append(r)

  result: Dict[Tuple[str, str], Dict[str, Any]] = {}
  for key, data in per_acct.items():
    broker, account_number = key
    rlist: List[sqlite3.Row] = data["rows"]
    dates = [date_parser.parse(r["statement_date"]).date() for r in rlist]
    start = min(dates)
    end = max(dates)
    by_date: Dict[date, sqlite3.Row] = {date_parser.parse(r["statement_date"]).date(): r for r in rlist}

    cur_balance = 0.0
    cur_balance_native = 0.0
    cur_closed_cum = 0.0
    cur_closed_cum_native = 0.0
    series: List[Dict[str, Any]] = []
    net_contrib = 0.0
    net_contrib_native = 0.0
    total_deposits = 0.0
    total_deposits_native = 0.0
    total_withdrawals = 0.0
    total_withdrawals_native = 0.0

    # Prepend a zero-balance day one day before the first real entry
    zero_day = start - timedelta(days=1)
    series.append(
      {
        "date": zero_day.isoformat(),
        "balance_usd": 0.0,
        "balance_native": 0.0,
        "closed_cum_usd": 0.0,
        "deposit_withdrawal_usd": 0.0,
      }
    )

    # Infer missing initial deposit: if first statement has dw=0 but balance > 0,
    # the balance IS the initial deposit.
    first_row = by_date[start]
    if float(first_row["deposit_withdrawal"]) == 0.0 and float(first_row["balance"]) > 0:
      inferred_initial_deposit = float(first_row["balance"])
    else:
      inferred_initial_deposit = 0.0

    is_internal = (broker, account_number) in INTERNAL_TRANSFER_ACCOUNTS

    d = start
    while d <= end:
      day_dw_usd = 0.0
      if d in by_date:
        row = by_date[d]
        raw_dw = float(row["deposit_withdrawal"])
        # Apply inferred initial deposit on the first day
        if d == start and inferred_initial_deposit > 0:
          raw_dw = inferred_initial_deposit
        # Zero out deposits for internal transfer accounts (keep withdrawals —
        # money leaving the ecosystem still counts)
        if is_internal and raw_dw > 0:
          raw_dw = 0.0
        bal_usd, closed_usd, dw_usd = convert_to_usd(
          float(row["balance"]),
          float(row["closed_pnl"]),
          raw_dw,
          row["currency"],
        )
        cur_balance = bal_usd
        cur_balance_native = float(row["balance"])
        cur_closed_cum += closed_usd
        cur_closed_cum_native += float(row["closed_pnl"])
        if (broker, account_number, d.isoformat()) not in exclusions:
          net_contrib += dw_usd
          net_contrib_native += raw_dw
          if dw_usd > 0:
            total_deposits += dw_usd
            total_deposits_native += raw_dw
          elif dw_usd < 0:
            total_withdrawals += dw_usd
            total_withdrawals_native += raw_dw
        day_dw_usd = dw_usd
      series.append(
        {
          "date": d.isoformat(),
          "balance_usd": cur_balance,
          "balance_native": cur_balance_native,
          "closed_cum_usd": cur_closed_cum,
          "deposit_withdrawal_usd": day_dw_usd,
        }
      )
      d += timedelta(days=1)

    # initiation_date = zero-balance day (one day before first real entry)
    initiation_date = zero_day

    # percent_gain = cumulative closed P&L / net contributions
    percent_gain = cur_closed_cum / net_contrib if net_contrib > 0 else 0.0

    current_balance_native = series[-1]["balance_native"] if series else 0.0

    result[key] = {
      "broker": broker,
      "account_number": account_number,
      "currency": data["currency"],
      "series": series,
      "initiation_date": initiation_date.isoformat(),
      "days_active": (end - initiation_date).days + 1,
      "balance_usd": cur_balance,
      "balance_native": current_balance_native,
      "closed_pnl_usd": series[-1]["closed_cum_usd"] if series else 0.0,
      "closed_pnl_native": cur_closed_cum_native,
      "net_contributions_usd": net_contrib,
      "net_contributions_native": net_contrib_native,
      "total_deposits_usd": total_deposits,
      "total_deposits_native": total_deposits_native,
      "total_withdrawals_usd": total_withdrawals,
      "total_withdrawals_native": total_withdrawals_native,
      "percent_gain": percent_gain,
    }
  return result


def filter_range(dates: List[str], range_key: str) -> List[str]:
  if range_key == "all":
    return dates
  today = date.today()
  days_map = {
    "3d": 3,
    "7d": 7,
    "14d": 14,
    "1m": 30,
    "3m": 90,
  }
  days = days_map.get(range_key)
  if days is None:
    return dates
  cutoff = today - timedelta(days=days)
  return [d for d in dates if date_parser.parse(d).date() >= cutoff]


@app.on_event("startup")
def _startup() -> None:
  ensure_views_table()
  ensure_transfer_exclusions_table()


@app.get("/health")
def health() -> Dict[str, bool]:
  return {"ok": True}


@app.post("/views/increment", response_model=ViewsModel, dependencies=[Depends(require_api_key)])
def increment_views() -> ViewsModel:
  ensure_views_table()
  with get_conn() as conn:
    conn.execute("UPDATE views SET total_views = total_views + 1 WHERE id = 1")
    conn.commit()
    row = conn.execute("SELECT total_views FROM views WHERE id = 1").fetchone()
  return ViewsModel(total_views=int(row["total_views"]))


@app.get("/views", response_model=ViewsModel, dependencies=[Depends(require_api_key)])
def get_views() -> ViewsModel:
  ensure_views_table()
  with get_conn() as conn:
    row = conn.execute("SELECT total_views FROM views WHERE id = 1").fetchone()
  return ViewsModel(total_views=int(row["total_views"]))


@app.get("/accounts", response_model=List[AccountCard], dependencies=[Depends(require_api_key)])
def get_accounts(range: str = Query("all", pattern="^(3d|7d|14d|1m|3m|all)$")) -> List[AccountCard]:
  rows = fetch_daily_rows()
  series_by_acct = build_account_time_series(rows)
  filtered: List[AccountCard] = []
  for (_, _), acct in series_by_acct.items():
    dates = filter_range([pt["date"] for pt in acct["series"]], range)
    series_pts = [pt for pt in acct["series"] if pt["date"] in dates]
    filtered.append(
      AccountCard(
        broker=acct["broker"],
        account_number=acct["account_number"],
        platform="MT5",
        base_currency=acct["currency"],
        initiation_date=acct["initiation_date"],
        days_active=acct["days_active"],
        balance_usd=acct["balance_usd"],
        balance_native=acct["balance_native"],
        closed_pnl_usd=acct["closed_pnl_usd"],
        closed_pnl_native=acct["closed_pnl_native"],
        net_contributions_usd=acct["net_contributions_usd"],
        net_contributions_native=acct["net_contributions_native"],
        total_deposits_usd=acct["total_deposits_usd"],
        total_deposits_native=acct["total_deposits_native"],
        total_withdrawals_usd=acct["total_withdrawals_usd"],
        total_withdrawals_native=acct["total_withdrawals_native"],
        percent_gain=acct["percent_gain"],
        series=[AccountSeriesPoint(date=pt["date"], balance_usd=pt["balance_usd"], balance_native=pt["balance_native"], deposit_withdrawal_usd=pt.get("deposit_withdrawal_usd", 0.0)) for pt in series_pts],
      )
    )
  return filtered


@app.get("/cleaned", response_model=List[CleanedRow], dependencies=[Depends(require_api_key)])
def get_cleaned(limit: int = Query(10000, ge=1, le=50000)) -> List[CleanedRow]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT statement_date, broker, account_number, account_name, balance, closed_pnl,
                   deposit_withdrawal, COALESCE(currency, 'USD') AS currency
            FROM daily_statements
            ORDER BY statement_date ASC
            """,
        ).fetchall()
    cleaned = clean_daily_data(list(rows))
    return cleaned[:limit]


@app.get("/stats", response_model=List[StatsRow], dependencies=[Depends(require_api_key)])
def get_stats(limit: int = Query(10000, ge=1, le=50000)) -> List[StatsRow]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT statement_date, broker, account_number, account_name, balance, closed_pnl,
                   deposit_withdrawal, COALESCE(currency, 'USD') AS currency
            FROM daily_statements
            ORDER BY statement_date ASC
            """,
        ).fetchall()
    cleaned = clean_daily_data(list(rows))
    stats = compute_stats(cleaned)
    return stats[:limit]


@app.get("/raw", response_model=List[RawRow], dependencies=[Depends(require_api_key)])
def get_raw(limit: int = Query(1000, ge=1, le=10000)) -> List[RawRow]:
  with get_conn() as conn:
    rows = conn.execute(
      "SELECT * FROM daily_statements ORDER BY statement_date DESC, broker, account_number LIMIT ?",
      (limit,),
    ).fetchall()
  result = [dict(r) for r in rows]

  # Inject synthetic zero-baseline rows (one day before each account's first entry)
  acct_first: Dict[Tuple[str, str], Dict[str, Any]] = {}
  for r in result:
    key = (r["broker"], r["account_number"])
    if key not in acct_first or r["statement_date"] < acct_first[key]["statement_date"]:
      acct_first[key] = r
  for first_row in acct_first.values():
    first_date = date_parser.parse(first_row["statement_date"]).date()
    zero_date = first_date - timedelta(days=1)
    result.append({
      "statement_date": zero_date.isoformat(),
      "statement_datetime": f"{zero_date.isoformat()}T23:59:00+00:00",
      "broker": first_row["broker"],
      "account_number": first_row["account_number"],
      "account_name": first_row.get("account_name", ""),
      "currency": first_row["currency"],
      "closed_pnl": 0.0,
      "deposit_withdrawal": 0.0,
      "balance": 0.0,
      "gmail_message_id": "zero-baseline",
      "ingested_at": datetime.now(timezone.utc).isoformat(),
    })
  result.sort(key=lambda r: r["statement_date"], reverse=True)
  return result[:limit]


if __name__ == "__main__":
  import uvicorn

  uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
