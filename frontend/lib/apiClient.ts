import {
  mockAccounts,
  mockRawRows,
  getMockViews,
  incrementMockViews
} from "./mockData";
import { INACTIVE_ACCOUNTS } from "./constants";
import type {
  AccountCard,
  CleanedRow,
  CurrencyKey,
  DepositWithdrawalEvent,
  HeroMetrics,
  HeroSeriesPoint,
  RawRow,
  StatsRow,
  Views
} from "./types";

export type RangeKey = "3d" | "7d" | "14d" | "1m" | "3m" | "all";

const API_BASE = "/api/algohub";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function sliceByRange<T extends { date: string }>(series: T[], range: RangeKey): T[] {
  if (range === "all") return series;
  const daysMap: Record<Exclude<RangeKey, "all">, number> = {
    "3d": 3,
    "7d": 7,
    "14d": 14,
    "1m": 30,
    "3m": 90
  };
  return series.slice(-daysMap[range]);
}

async function fetchBackend<T>(endpointName: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: init?.cache ?? "no-store"
  });

  if (!response.ok) {
    throw new Error(`${endpointName} failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/** Forward-fill zeros in a series: if a day's balance is 0 and there was no
 *  deposit/withdrawal activity, carry the previous day's value (gap day).
 *  A genuine $0 balance (e.g. full withdrawal) is preserved as-is. */
function forwardFillSeries<T extends { balance_usd: number; deposit_withdrawal_usd?: number }>(series: T[]): T[] {
  let lastNonZero = 0;
  return series.map(pt => {
    if (pt.balance_usd > 0) {
      lastNonZero = pt.balance_usd;
      return pt;
    }
    // If there was a deposit/withdrawal, the $0 balance is real — don't overwrite
    if (pt.deposit_withdrawal_usd) return pt;
    return { ...pt, balance_usd: lastNonZero };
  });
}

/** Derive hero series + metrics from ALL accounts (client-side aggregation).
 *  Converts all account values to the display currency using fxAudUsd.
 *  Also computes adjusted_balance (stripping deposit/withdrawal effects) and events.
 *  Metrics are computed from the range-filtered series (not account-level summaries). */
export function deriveHeroFromAccounts(
  accounts: AccountCard[],
  currency: CurrencyKey,
  fxAudUsd: number
): { series: HeroSeriesPoint[]; metrics: HeroMetrics; events: DepositWithdrawalEvent[] } {
  if (accounts.length === 0) {
    return {
      series: [],
      metrics: { total_balance_usd: 0, total_closed_pnl_usd: 0, net_contributions_usd: 0, percent_gain: 0 },
      events: []
    };
  }

  // Conversion: all accounts already have balance_usd (FX-corrected by applyLiveFx).
  // For AUD display, divide by fxAudUsd to convert USD → AUD.
  const toCcy = (usdVal: number) => currency === "AUD" ? usdVal / fxAudUsd : usdVal;

  // Forward-fill zeros per account, build per-account date→balance maps
  // Then extend every account to the global max date (carry forward last balance)
  const acctMaps: { balMap: Map<string, number>; dwMap: Map<string, number> }[] = [];
  const allDates = new Set<string>();

  for (const acc of accounts) {
    const filled = forwardFillSeries(acc.series);
    const balMap = new Map<string, number>();
    const acctDwMap = new Map<string, number>();
    for (const pt of filled) {
      balMap.set(pt.date, toCcy(pt.balance_usd));
      const dw = toCcy(pt.deposit_withdrawal_usd ?? 0);
      if (dw !== 0) acctDwMap.set(pt.date, dw);
      allDates.add(pt.date);
    }
    acctMaps.push({ balMap, dwMap: acctDwMap });
  }

  // Aggregate across accounts — for dates an account doesn't cover, carry forward its last known balance
  const dateMap = new Map<string, number>();
  const dwMap = new Map<string, number>();
  const sortedAllDates = Array.from(allDates).sort();

  for (const { balMap, dwMap: acctDwMap } of acctMaps) {
    let lastBal = 0;
    for (const d of sortedAllDates) {
      const bal = balMap.get(d);
      if (bal !== undefined) lastBal = bal;
      dateMap.set(d, (dateMap.get(d) ?? 0) + lastBal);
      const dw = acctDwMap.get(d);
      if (dw !== undefined) {
        dwMap.set(d, (dwMap.get(d) ?? 0) + dw);
      }
    }
  }

  const sortedEntries = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  // Keep unrounded totals for accurate metric computation
  const rawTotals: number[] = [];

  // Compute adjusted balance by stripping cumulative deposit/withdrawal effects
  let cumulativeContrib = 0;
  const series: HeroSeriesPoint[] = [];
  const events: DepositWithdrawalEvent[] = [];

  for (const [date, total] of sortedEntries) {
    const dayDw = dwMap.get(date) ?? 0;
    cumulativeContrib += dayDw;
    const adjustedBalance = Math.round((total - cumulativeContrib) * 100) / 100;
    rawTotals.push(total);
    series.push({
      date,
      total_balance_usd: Math.round(total * 100) / 100,
      adjusted_balance: adjustedBalance
    });
    if (dayDw !== 0) {
      events.push({ date, amount: Math.round(dayDw * 100) / 100, adjustedBalance });
    }
  }

  // Account-level aggregations in display currency
  const totalBalance = accounts.reduce((s, a) => s + toCcy(a.balance_usd), 0);
  const activeAccounts = accounts.filter(a => a.balance_usd > 0 && !INACTIVE_ACCOUNTS.has(`${a.broker}-${a.account_number}`)).length;

  // Range-aware metrics computed from unrounded values
  const startIdx = rawTotals.findIndex(v => v > 0);
  const startBalance = startIdx >= 0 ? rawTotals[startIdx] : 0;
  const endBalance = rawTotals.length > 0 ? rawTotals[rawTotals.length - 1] : 0;
  let netDepositsAfterStart = 0;
  for (let i = (startIdx >= 0 ? startIdx + 1 : 0); i < sortedEntries.length; i++) {
    netDepositsAfterStart += dwMap.get(sortedEntries[i][0]) ?? 0;
  }
  const netDepositsInRange = sortedEntries.reduce((s, [date]) => s + (dwMap.get(date) ?? 0), 0);
  const periodPnl = endBalance - startBalance - netDepositsAfterStart;

  // TWR: chain-link daily returns, adjusting for cash flows
  let twrChain = 1.0;
  let twrStarted = false;
  for (let i = 1; i < rawTotals.length; i++) {
    const dayDw = dwMap.get(sortedEntries[i][0]) ?? 0;
    const adjustedPrev = rawTotals[i - 1] + dayDw;
    if (adjustedPrev !== 0) {
      const dailyReturn = rawTotals[i] / adjustedPrev;
      if (!twrStarted) {
        twrChain = dailyReturn;
        twrStarted = true;
      } else {
        twrChain *= dailyReturn;
      }
    }
  }
  const periodReturn = twrStarted ? twrChain - 1.0 : 0;

  // Daily P&L array from consecutive unrounded series points (use epsilon to filter non-trading days)
  const EPSILON = 0.005;
  const dailyPnls: number[] = [];
  for (let i = 1; i < rawTotals.length; i++) {
    const dayDw = dwMap.get(sortedEntries[i][0]) ?? 0;
    const daily = rawTotals[i] - rawTotals[i - 1] - dayDw;
    if (Math.abs(daily) > EPSILON) dailyPnls.push(daily);
  }

  const wins = dailyPnls.filter(d => d > 0);
  const losses = dailyPnls.filter(d => d < 0);
  const winRate = dailyPnls.length > 0 ? wins.length / dailyPnls.length : undefined;
  const bestDay = dailyPnls.length > 0 ? Math.max(...dailyPnls) : undefined;
  const worstDay = dailyPnls.length > 0 ? Math.min(...dailyPnls) : undefined;
  const avgDailyPnl = dailyPnls.length > 0 ? dailyPnls.reduce((s, d) => s + d, 0) / dailyPnls.length : undefined;
  const avgWin = wins.length > 0 ? wins.reduce((s, d) => s + d, 0) / wins.length : undefined;
  const avgLoss = losses.length > 0 ? losses.reduce((s, d) => s + d, 0) / losses.length : undefined;
  const expectancy = dailyPnls.length > 0 ? periodPnl / dailyPnls.length : undefined;

  // Max drawdown % from TWR equity curve (only trading losses count)
  // Chain-link daily returns to build equity curve, then peak-to-trough
  const equityCurve: number[] = [1.0];
  for (let i = 1; i < rawTotals.length; i++) {
    const dayDwDD = dwMap.get(sortedEntries[i][0]) ?? 0;
    const adjPrev = rawTotals[i - 1] + dayDwDD;
    if (adjPrev > 0) {
      equityCurve.push(equityCurve[equityCurve.length - 1] * (rawTotals[i] / adjPrev));
    } else {
      equityCurve.push(equityCurve[equityCurve.length - 1]);
    }
  }
  let peak = 0;
  let maxDrawdownPct = 0;
  for (const cv of equityCurve) {
    if (cv > peak) peak = cv;
    if (peak > 0) {
      const dd = (peak - cv) / peak;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;
    }
  }

  const currentBalance = Math.round(totalBalance * 100) / 100;

  return {
    series,
    metrics: {
      total_balance_usd: currentBalance,
      total_closed_pnl_usd: Math.round(periodPnl * 100) / 100,
      net_contributions_usd: Math.round(netDepositsInRange * 100) / 100,
      percent_gain: Math.round(periodReturn * 10000) / 10000,
      active_accounts: activeAccounts,
      total_accounts: accounts.length,
      win_rate: winRate != null ? Math.round(winRate * 10000) / 10000 : undefined,
      best_day: bestDay != null ? Math.round(bestDay * 100) / 100 : undefined,
      worst_day: worstDay != null ? Math.round(worstDay * 100) / 100 : undefined,
      avg_daily_pnl: avgDailyPnl != null ? Math.round(avgDailyPnl * 100) / 100 : undefined,
      max_drawdown_pct: Math.round(maxDrawdownPct * 10000) / 10000,
      expectancy: expectancy != null ? Math.round(expectancy * 100) / 100 : undefined,
      avg_win: avgWin != null ? Math.round(avgWin * 100) / 100 : undefined,
      avg_loss: avgLoss != null ? Math.round(avgLoss * 100) / 100 : undefined,
    },
    events
  };
}

/** Forward-fill account series for sparklines (exported for components). */
export function fillAccountSeries(accounts: AccountCard[]): AccountCard[] {
  return accounts.map(acc => ({
    ...acc,
    series: forwardFillSeries(acc.series)
  }));
}

export async function getAccounts(range: RangeKey, signal?: AbortSignal): Promise<AccountCard[]> {
  if (USE_MOCK) {
    return mockAccounts.map(acc => ({
      ...acc,
      series: sliceByRange(acc.series, range)
    }));
  }
  return fetchBackend("accounts", `/accounts${range === "all" ? "" : `?range=${range}`}`, { signal });
}

export async function getRaw(): Promise<RawRow[]> {
  if (USE_MOCK) {
    return mockRawRows;
  }
  return fetchBackend("raw", "/raw");
}

export async function incrementView(): Promise<Views> {
  if (USE_MOCK) {
    return incrementMockViews();
  }
  return fetchBackend("views/increment", "/views/increment", {
    method: "POST"
  });
}

export async function getViews(): Promise<Views> {
  if (USE_MOCK) {
    return getMockViews();
  }
  return fetchBackend("views", "/views");
}

export async function getStats(): Promise<StatsRow[]> {
  if (USE_MOCK) return [];
  return fetchBackend("stats", "/stats");
}

export async function getCleaned(): Promise<CleanedRow[]> {
  if (USE_MOCK) return [];
  return fetchBackend("cleaned", "/cleaned");
}

/** Fetch accounts, cleaned, stats, and raw in a single request. */
export async function getBundle(): Promise<{
  accounts: AccountCard[];
  cleaned: CleanedRow[];
  stats: StatsRow[];
  raw: RawRow[];
}> {
  return fetchBackend("bundle", "/bundle");
}

export async function getFxRate(): Promise<number> {
  try {
    const res = await fetch("/api/fx", { cache: "no-store" });
    if (!res.ok) return 0.66;
    const data = await res.json();
    return data.audusd ?? 0.66;
  } catch {
    return 0.66;
  }
}

/** Re-derive all _usd fields from native values using a live FX rate.
 *  The backend pre-converts at a hardcoded rate (BACKEND_FX); this corrects them. */
const BACKEND_FX = 0.66; // rate the backend used to pre-convert AUD→USD

export function applyLiveFx(accounts: AccountCard[], fxAudUsd: number): AccountCard[] {
  if (fxAudUsd === BACKEND_FX) return accounts; // no change needed
  const ratio = fxAudUsd / BACKEND_FX; // correction factor

  return accounts.map(acc => {
    if (acc.base_currency !== "AUD") return acc;

    const balanceUsd = (acc.balance_native ?? acc.balance_usd) * fxAudUsd;
    const pnlUsd = (acc.closed_pnl_native ?? acc.closed_pnl_usd) * fxAudUsd;
    const contribUsd = (acc.net_contributions_native ?? acc.net_contributions_usd) * fxAudUsd;
    const depositsUsd = (acc.total_deposits_native ?? acc.total_deposits_usd ?? 0) * fxAudUsd;
    const withdrawalsUsd = (acc.total_withdrawals_native ?? acc.total_withdrawals_usd ?? 0) * fxAudUsd;
    const denom = contribUsd;
    const pctGain = denom > 0 ? pnlUsd / denom : acc.percent_gain;

    return {
      ...acc,
      balance_usd: balanceUsd,
      closed_pnl_usd: pnlUsd,
      net_contributions_usd: contribUsd,
      total_deposits_usd: depositsUsd,
      total_withdrawals_usd: withdrawalsUsd,
      percent_gain: pctGain,
      series: acc.series.map(pt => ({
        ...pt,
        balance_usd: (pt.balance_native ?? pt.balance_usd) * fxAudUsd,
        deposit_withdrawal_usd: (pt.deposit_withdrawal_usd ?? 0) * ratio,
      })),
    };
  });
}

/** Extract the latest stats row per account (keyed by "broker:account_number"). */
export function getLatestStatsPerAccount(stats: StatsRow[]): Map<string, StatsRow> {
  const map = new Map<string, StatsRow>();
  for (const row of stats) {
    const key = `${row.broker}:${row.account_number}`;
    const existing = map.get(key);
    if (!existing || row.date > existing.date) {
      map.set(key, row);
    }
  }
  return map;
}
