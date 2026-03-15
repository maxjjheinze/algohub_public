from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple

from dateutil import parser as date_parser
from pydantic import BaseModel

# Accounts used exclusively for internal transfers — exclude from deposit/withdrawal totals
INTERNAL_TRANSFER_ACCOUNTS: set[tuple[str, str]] = set()


class CleanedRow(BaseModel):
    date: str
    broker: str
    account_number: str
    account_name: str
    currency: str
    closed_pnl: float
    deposit: float
    withdrawal: float
    balance: float
    win_loss: Optional[int]
    cumulative_pnl: float
    cumulative_deposits: float
    cumulative_withdrawals: float
    equity_curve: float


def clean_daily_data(rows: List[Any]) -> List[CleanedRow]:
    """Transform raw daily_statements rows into dashboard-ready cleaned data."""
    # Group rows by (broker, account_number)
    groups: Dict[Tuple[str, str], List[Any]] = defaultdict(list)
    for r in rows:
        key = (r["broker"], r["account_number"])
        groups[key].append(r)

    result: List[CleanedRow] = []

    # Global end date: carry forward all accounts to the same end so balances
    # don't vanish from portfolio sums when one account stops reporting.
    global_last = max(
        date_parser.parse(rows[-1]["statement_date"]).date()
        for rows in groups.values()
    ) if groups else date.today()

    for (broker, account_number), acct_rows in groups.items():
        # Sort by date ascending
        acct_rows.sort(key=lambda r: r["statement_date"])

        first_date = date_parser.parse(acct_rows[0]["statement_date"]).date()
        zero_date = first_date - timedelta(days=1)
        currency = (acct_rows[0]["currency"] if "currency" in acct_rows[0].keys() else "USD") or "USD"
        account_name = (acct_rows[0]["account_name"] if "account_name" in acct_rows[0].keys() else "") or ""

        # Prepend synthetic zero-baseline row
        result.append(
            CleanedRow(
                date=zero_date.isoformat(),
                broker=broker,
                account_number=account_number,
                account_name=account_name,
                currency=currency,
                closed_pnl=0.0,
                deposit=0.0,
                withdrawal=0.0,
                balance=0.0,
                win_loss=None,
                cumulative_pnl=0.0,
                cumulative_deposits=0.0,
                cumulative_withdrawals=0.0,
                equity_curve=0.0,
            )
        )

        # Build lookup by date for gap-filling
        last_date = date_parser.parse(acct_rows[-1]["statement_date"]).date()
        by_date: Dict[date, Any] = {
            date_parser.parse(r["statement_date"]).date(): r for r in acct_rows
        }

        # Infer missing initial deposit: if first statement has dw=0 but balance > 0
        first_r = by_date[first_date]
        if float(first_r["deposit_withdrawal"]) == 0.0 and float(first_r["balance"]) > 0:
            inferred_initial_deposit = float(first_r["balance"])
        else:
            inferred_initial_deposit = 0.0

        is_internal = (broker, account_number) in INTERNAL_TRANSFER_ACCOUNTS

        cum_pnl = 0.0
        cum_deposits = 0.0
        cum_withdrawals = 0.0
        prev_balance = 0.0
        equity_curve = 0.0

        # Walk every calendar day from first_date to global_last
        # (carry forward balance past account's own last date)
        d = first_date
        while d <= global_last:
            if d in by_date:
                r = by_date[d]
                closed_pnl = float(r["closed_pnl"])
                dw = float(r["deposit_withdrawal"])
                # Apply inferred initial deposit on the first day
                if d == first_date and inferred_initial_deposit > 0:
                    dw = inferred_initial_deposit
                # Zero out deposits for internal transfer accounts (keep withdrawals —
                # money leaving the ecosystem still counts)
                if is_internal and dw > 0:
                    dw = 0.0
                balance = float(r["balance"])

                deposit = max(dw, 0.0)
                withdrawal = min(dw, 0.0)
                win_loss: Optional[int] = 1 if closed_pnl > 0 else (0 if closed_pnl < 0 else None)

                cum_pnl += closed_pnl
                cum_deposits += deposit
                cum_withdrawals += withdrawal

                # Equity curve: chain-linked return ratio
                # adjusted_prev = previous balance + today's cash flows
                # ratio = balance / adjusted_prev (pure trading return for the day)
                adjusted_prev = prev_balance + dw
                if adjusted_prev != 0.0:
                    daily_return = balance / adjusted_prev
                    if equity_curve == 0.0:
                        # First funded day: start the curve
                        equity_curve = 1.0 * daily_return
                    else:
                        equity_curve *= daily_return
                # If adjusted_prev is 0 and balance is also 0, curve stays unchanged

                prev_balance = balance
            else:
                # Gap day: carry forward balance and cumulatives, zero activity
                closed_pnl = 0.0
                deposit = 0.0
                withdrawal = 0.0
                balance = prev_balance
                win_loss = None

            result.append(
                CleanedRow(
                    date=d.isoformat(),
                    broker=broker,
                    account_number=account_number,
                    account_name=account_name,
                    currency=currency,
                    closed_pnl=closed_pnl,
                    deposit=deposit,
                    withdrawal=withdrawal,
                    balance=balance,
                    win_loss=win_loss,
                    cumulative_pnl=cum_pnl,
                    cumulative_deposits=cum_deposits,
                    cumulative_withdrawals=cum_withdrawals,
                    equity_curve=equity_curve,
                )
            )
            d += timedelta(days=1)

    # Sort all results by (date, broker, account_number)
    result.sort(key=lambda r: (r.date, r.broker, r.account_number))
    return result
