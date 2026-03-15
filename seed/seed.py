"""Generate a realistic synthetic SQLite database for the Algo Hub demo."""

from __future__ import annotations

import math
import os
import random
import sqlite3
from datetime import date, datetime, timedelta, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "trading_statements.sqlite3")

SEED = 42

# ── Account definitions ──────────────────────────────────────────────

ACCOUNTS = [
    {
        "broker": "Apex Trading",
        "account_number": "100234",
        "account_name": "Trend Rider v3",
        "currency": "USD",
        "initial_deposit": 10_000.0,
        "days": 180,
        "win_rate": 0.55,
        "avg_win": 120.0,
        "avg_loss": -90.0,
        "volatility": 0.6,
        "extra_deposits": [(60, 5_000.0)],
        "withdrawals": [(140, -3_000.0)],
    },
    {
        "broker": "Apex Trading",
        "account_number": "100567",
        "account_name": "Scalper Pro",
        "currency": "USD",
        "initial_deposit": 5_000.0,
        "days": 120,
        "win_rate": 0.65,
        "avg_win": 60.0,
        "avg_loss": -75.0,
        "volatility": 1.2,
        "extra_deposits": [],
        "withdrawals": [(90, -2_000.0)],
    },
    {
        "broker": "Nova Markets",
        "account_number": "200891",
        "account_name": "Grid Master",
        "currency": "AUD",
        "initial_deposit": 15_000.0,
        "days": 150,
        "win_rate": 0.58,
        "avg_win": 95.0,
        "avg_loss": -80.0,
        "volatility": 0.8,
        "extra_deposits": [(30, 5_000.0)],
        "withdrawals": [],
        "drawdown_event": (80, 15, -200.0),  # (start_day, duration, daily_loss)
    },
    {
        "broker": "Titan FX",
        "account_number": "300456",
        "account_name": "Momentum Alpha",
        "currency": "USD",
        "initial_deposit": 25_000.0,
        "days": 90,
        "win_rate": 0.52,
        "avg_win": 250.0,
        "avg_loss": -200.0,
        "volatility": 1.0,
        "extra_deposits": [],
        "withdrawals": [(70, -5_000.0)],
    },
]


def generate_daily_data(acct: dict, rng: random.Random, start_date: date) -> list[dict]:
    """Generate daily statement rows for one account."""
    rows = []
    balance = 0.0
    day = start_date

    cash_events: dict[int, float] = {}
    # Initial deposit on day 0
    cash_events[0] = acct["initial_deposit"]
    for day_offset, amount in acct.get("extra_deposits", []):
        cash_events[day_offset] = cash_events.get(day_offset, 0) + amount
    for day_offset, amount in acct.get("withdrawals", []):
        cash_events[day_offset] = cash_events.get(day_offset, 0) + amount

    drawdown = acct.get("drawdown_event")
    trading_day = 0

    for i in range(acct["days"]):
        current_date = start_date + timedelta(days=i)

        # Skip weekends
        if current_date.weekday() >= 5:
            continue

        # Cash flows
        dw = cash_events.get(trading_day, 0.0)
        balance += dw

        # Generate P&L
        closed_pnl = 0.0
        if trading_day > 0:  # No trading on deposit day
            # Check if we're in a drawdown event
            if drawdown and drawdown[0] <= trading_day < drawdown[0] + drawdown[1]:
                closed_pnl = drawdown[2] + rng.gauss(0, abs(drawdown[2]) * 0.3)
            else:
                is_win = rng.random() < acct["win_rate"]
                if is_win:
                    closed_pnl = abs(rng.gauss(acct["avg_win"], acct["avg_win"] * acct["volatility"] * 0.5))
                else:
                    closed_pnl = -abs(rng.gauss(abs(acct["avg_loss"]), abs(acct["avg_loss"]) * acct["volatility"] * 0.5))

            # Some days have no trades
            if rng.random() < 0.15:
                closed_pnl = 0.0

        balance += closed_pnl

        # Ensure balance doesn't go negative
        if balance < 50.0:
            balance = 50.0 + rng.random() * 100
            closed_pnl = 0.0

        rows.append({
            "statement_date": current_date.isoformat(),
            "statement_datetime": f"{current_date.isoformat()}T23:59:00+00:00",
            "broker": acct["broker"],
            "account_number": acct["account_number"],
            "account_name": acct["account_name"],
            "currency": acct["currency"],
            "closed_pnl": round(closed_pnl, 2),
            "deposit_withdrawal": round(dw, 2),
            "balance": round(balance, 2),
            "gmail_message_id": f"demo-{acct['account_number']}-{trading_day}",
            "ingested_at": datetime.now(timezone.utc).isoformat(),
        })

        trading_day += 1

    return rows


def create_database() -> None:
    """Create the SQLite database with all tables and synthetic data."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            broker TEXT NOT NULL,
            account_number TEXT NOT NULL,
            account_name TEXT,
            currency TEXT DEFAULT 'USD',
            platform TEXT DEFAULT 'MT5',
            UNIQUE(broker, account_number)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_statements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            statement_date TEXT NOT NULL,
            statement_datetime TEXT,
            broker TEXT NOT NULL,
            account_number TEXT NOT NULL,
            account_name TEXT,
            currency TEXT DEFAULT 'USD',
            closed_pnl REAL NOT NULL DEFAULT 0,
            deposit_withdrawal REAL NOT NULL DEFAULT 0,
            balance REAL NOT NULL DEFAULT 0,
            gmail_message_id TEXT,
            ingested_at TEXT,
            UNIQUE(broker, account_number, statement_date)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS views (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            total_views INTEGER NOT NULL DEFAULT 0
        )
    """)

    cursor.execute("""
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
        )
    """)

    # Seed data
    rng = random.Random(SEED)

    # Stagger start dates so accounts don't all begin on the same day
    base_start = date(2025, 6, 15)
    start_offsets = [0, 30, 15, 60]

    total_statements = 0

    for acct, offset in zip(ACCOUNTS, start_offsets):
        start_date = base_start + timedelta(days=offset)
        rows = generate_daily_data(acct, rng, start_date)

        # Insert account
        cursor.execute(
            "INSERT OR IGNORE INTO accounts (broker, account_number, account_name, currency) VALUES (?, ?, ?, ?)",
            (acct["broker"], acct["account_number"], acct["account_name"], acct["currency"]),
        )

        # Insert daily statements
        for r in rows:
            cursor.execute(
                """INSERT OR IGNORE INTO daily_statements
                   (statement_date, statement_datetime, broker, account_number, account_name,
                    currency, closed_pnl, deposit_withdrawal, balance, gmail_message_id, ingested_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (r["statement_date"], r["statement_datetime"], r["broker"], r["account_number"],
                 r["account_name"], r["currency"], r["closed_pnl"], r["deposit_withdrawal"],
                 r["balance"], r["gmail_message_id"], r["ingested_at"]),
            )
            total_statements += 1

    # Insert one demo transfer exclusion
    cursor.execute(
        """INSERT OR IGNORE INTO transfer_exclusions
           (broker, account_number, statement_date, reason, note, transfer_group, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        ("Apex Trading", "100234", "2025-08-14", "internal_transfer",
         "Demo: excluded from contribution totals", 1,
         datetime.now(timezone.utc).isoformat()),
    )

    # Initialize views counter
    cursor.execute("INSERT OR IGNORE INTO views (id, total_views) VALUES (1, 0)")

    conn.commit()

    # Print summary
    acct_count = cursor.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
    stmt_count = cursor.execute("SELECT COUNT(*) FROM daily_statements").fetchone()[0]
    excl_count = cursor.execute("SELECT COUNT(*) FROM transfer_exclusions").fetchone()[0]

    conn.close()

    print(f"Database created at: {os.path.abspath(DB_PATH)}")
    print(f"  Accounts:             {acct_count}")
    print(f"  Daily statements:     {stmt_count}")
    print(f"  Transfer exclusions:  {excl_count}")
    print("Done.")


if __name__ == "__main__":
    create_database()
