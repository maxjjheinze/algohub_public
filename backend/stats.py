from __future__ import annotations

from collections import defaultdict
from typing import List, Optional

from pydantic import BaseModel

from cleaner import CleanedRow


class StatsRow(BaseModel):
    date: str
    broker: str
    account_number: str
    account_name: str
    currency: str
    daily_return_pct: Optional[float]
    gross_profit: float
    gross_loss: float
    max_drawdown_pct: float
    max_drawdown_amount: float
    cumulative_wins: int
    cumulative_losses: int
    cumulative_trading_days: int
    win_rate: Optional[float]
    max_win_streak: int
    max_loss_streak: int
    avg_win: Optional[float]
    avg_loss: Optional[float]
    profit_factor: Optional[float]
    expectancy: Optional[float]
    recovery_factor: Optional[float]
    best_day: float
    worst_day: float


def compute_stats(cleaned: List[CleanedRow]) -> List[StatsRow]:
    """Compute running statistics from cleaned data."""
    # Group by account
    groups: dict[tuple[str, str], list[CleanedRow]] = defaultdict(list)
    for r in cleaned:
        groups[(r.broker, r.account_number)].append(r)

    result: List[StatsRow] = []

    for (broker, account_number), rows in groups.items():
        rows.sort(key=lambda r: r.date)

        gross_profit = 0.0
        gross_loss = 0.0
        cum_wins = 0
        cum_losses = 0
        peak_equity = 0.0
        max_dd_pct = 0.0
        max_dd_amount = 0.0
        # Track peak balance (deposit-adjusted) for dollar drawdown
        peak_balance_adjusted = 0.0
        cum_deposits = 0.0
        cum_withdrawals = 0.0
        current_streak = 0
        max_win_streak = 0
        max_loss_streak = 0
        sum_wins = 0.0
        sum_losses = 0.0
        best_day = 0.0
        worst_day = 0.0
        prev_balance = 0.0

        for r in rows:
            pnl = r.closed_pnl
            cum_deposits = r.cumulative_deposits
            cum_withdrawals = r.cumulative_withdrawals

            # Daily return %
            if prev_balance > 0.0 and r.win_loss is not None:
                daily_return_pct = (pnl / prev_balance) * 100.0
            elif prev_balance > 0.0 and r.deposit == 0.0 and r.withdrawal == 0.0:
                # Gap day with a balance: 0% return
                daily_return_pct = 0.0
            else:
                daily_return_pct = None

            # Gross profit / loss
            if pnl > 0:
                gross_profit += pnl
            elif pnl < 0:
                gross_loss += pnl

            # Win/loss counts
            if r.win_loss == 1:
                cum_wins += 1
            elif r.win_loss == 0:
                cum_losses += 1
            cum_trading_days = cum_wins + cum_losses

            # Win rate
            win_rate = (cum_wins / cum_trading_days) if cum_trading_days > 0 else None

            # Streaks
            if r.win_loss == 1:
                current_streak = current_streak + 1 if current_streak > 0 else 1
            elif r.win_loss == 0:
                current_streak = current_streak - 1 if current_streak < 0 else -1
            # win_loss is None: streak unchanged

            if current_streak > max_win_streak:
                max_win_streak = current_streak
            if current_streak < 0 and abs(current_streak) > max_loss_streak:
                max_loss_streak = abs(current_streak)

            # Avg win / avg loss
            if pnl > 0:
                sum_wins += pnl
            elif pnl < 0:
                sum_losses += pnl

            avg_win = (sum_wins / cum_wins) if cum_wins > 0 else None
            avg_loss = (sum_losses / cum_losses) if cum_losses > 0 else None

            # Best / worst day
            if pnl > best_day:
                best_day = pnl
            if pnl < worst_day:
                worst_day = pnl

            # Profit factor
            if gross_loss != 0.0:
                profit_factor = gross_profit / abs(gross_loss)
            elif gross_profit > 0.0:
                profit_factor = None  # Infinite (no losses yet)
            else:
                profit_factor = None

            # Expectancy
            if win_rate is not None and avg_win is not None and avg_loss is not None:
                expectancy = (win_rate * avg_win) + ((1.0 - win_rate) * avg_loss)
            elif win_rate is not None and avg_win is not None:
                # No losses yet
                expectancy = win_rate * avg_win
            else:
                expectancy = None

            # Drawdown (from equity curve)
            if r.equity_curve > peak_equity:
                peak_equity = r.equity_curve

            if peak_equity > 0.0:
                dd_pct = ((r.equity_curve - peak_equity) / peak_equity) * 100.0
            else:
                dd_pct = 0.0

            if dd_pct < -max_dd_pct:
                max_dd_pct = abs(dd_pct)

            # Dollar drawdown: track peak of (balance - cumulative net deposits)
            # This isolates trading-generated value from cash flows
            trading_value = r.balance - (cum_deposits + cum_withdrawals)
            if trading_value > peak_balance_adjusted:
                peak_balance_adjusted = trading_value
            dd_amount = trading_value - peak_balance_adjusted
            if dd_amount < -max_dd_amount:
                max_dd_amount = abs(dd_amount)

            # Recovery factor
            if max_dd_amount > 0.0:
                recovery_factor = r.cumulative_pnl / max_dd_amount
            else:
                recovery_factor = None

            prev_balance = r.balance

            result.append(
                StatsRow(
                    date=r.date,
                    broker=r.broker,
                    account_number=r.account_number,
                    account_name=r.account_name,
                    currency=r.currency,
                    daily_return_pct=round(daily_return_pct, 4) if daily_return_pct is not None else None,
                    gross_profit=round(gross_profit, 2),
                    gross_loss=round(gross_loss, 2),
                    max_drawdown_pct=round(max_dd_pct, 4),
                    max_drawdown_amount=round(max_dd_amount, 2),
                    cumulative_wins=cum_wins,
                    cumulative_losses=cum_losses,
                    cumulative_trading_days=cum_trading_days,
                    win_rate=round(win_rate, 4) if win_rate is not None else None,
                    max_win_streak=max_win_streak,
                    max_loss_streak=max_loss_streak,
                    avg_win=round(avg_win, 2) if avg_win is not None else None,
                    avg_loss=round(avg_loss, 2) if avg_loss is not None else None,
                    profit_factor=round(profit_factor, 4) if profit_factor is not None else None,
                    expectancy=round(expectancy, 2) if expectancy is not None else None,
                    recovery_factor=round(recovery_factor, 4) if recovery_factor is not None else None,
                    best_day=round(best_day, 2),
                    worst_day=round(worst_day, 2),
                )
            )

    result.sort(key=lambda r: (r.date, r.broker, r.account_number))
    return result
