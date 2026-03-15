export type CurrencyKey = "USD" | "AUD";

export type HeroSeriesPoint = { date: string; total_balance_usd: number; total_balance_native?: number; adjusted_balance?: number };

export type PnlSeriesPoint = { date: string; cumulative_pnl: number };

export type HeroMetrics = {
  total_balance_usd: number;
  total_closed_pnl_usd: number;
  net_contributions_usd: number;
  percent_gain: number;
  peak_balance?: number;
  drawdown_from_peak?: number;
  active_accounts?: number;
  total_accounts?: number;
  win_rate?: number;
  best_day?: number;
  worst_day?: number;
  avg_daily_pnl?: number;
  max_drawdown_pct?: number;
  expectancy?: number;
  avg_win?: number;
  avg_loss?: number;
};

export type AccountSeriesPoint = { date: string; balance_usd: number; balance_native?: number; deposit_withdrawal_usd?: number };

export type AccountCard = {
  broker: string;
  account_number: string;
  platform: "MT5";
  base_currency: "USD" | "AUD" | string;
  initiation_date: string;
  days_active: number;
  balance_usd: number;
  balance_native?: number;
  closed_pnl_usd: number;
  closed_pnl_native?: number;
  net_contributions_usd: number;
  net_contributions_native?: number;
  total_deposits_usd: number;
  total_deposits_native?: number;
  total_withdrawals_usd: number;
  total_withdrawals_native?: number;
  percent_gain: number;
  series: AccountSeriesPoint[];
};

export type RawRow = Record<string, string | number | null>;

export type DepositWithdrawalEvent = {
  date: string;
  amount: number;
  adjustedBalance: number;
};

export type StatsRow = {
  date: string;
  broker: string;
  account_number: string;
  account_name: string;
  currency: string;
  daily_return_pct: number | null;
  gross_profit: number;
  gross_loss: number;
  max_drawdown_pct: number;
  max_drawdown_amount: number;
  cumulative_wins: number;
  cumulative_losses: number;
  cumulative_trading_days: number;
  win_rate: number | null;
  max_win_streak: number;
  max_loss_streak: number;
  avg_win: number | null;
  avg_loss: number | null;
  profit_factor: number | null;
  expectancy: number | null;
  recovery_factor: number | null;
  best_day: number;
  worst_day: number;
};

export type CleanedRow = {
  date: string;
  broker: string;
  account_number: string;
  account_name: string;
  currency: string;
  closed_pnl: number;
  deposit: number;
  withdrawal: number;
  balance: number;
  win_loss: number | null;
  cumulative_pnl: number;
  cumulative_deposits: number;
  cumulative_withdrawals: number;
  equity_curve: number;
};

export type Views = { total_views: number };
