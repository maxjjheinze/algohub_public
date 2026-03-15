import { sliceByRange, type RangeKey } from "./apiClient";
import type { AccountCard, CleanedRow } from "./types";

// ── Helpers ──────────────────────────────────────────────────────────

function toUsd(row: CleanedRow, fxAudUsd: number): number {
  return row.currency === "AUD" ? row.closed_pnl * fxAudUsd : row.closed_pnl;
}

function filterRows(
  cleanedRows: CleanedRow[],
  enabledAccounts: Set<string>,
  range: RangeKey
): CleanedRow[] {
  const filtered = cleanedRows.filter((r) =>
    enabledAccounts.has(`${r.broker}-${r.account_number}`)
  );
  if (range === "all") return filtered;
  const allDates = [...new Set(filtered.map((r) => r.date))].sort();
  const daysMap: Record<string, number> = { "3d": 3, "7d": 7, "14d": 14, "1m": 30, "3m": 90 };
  const keep = new Set(allDates.slice(-(daysMap[range] ?? allDates.length)));
  return filtered.filter((r) => keep.has(r.date));
}

// ── 1. Portfolio Balance (Stacked Area) ──────────────────────────────

export type BalanceStackedPoint = { date: string; [accountKey: string]: number | string };

export function computePortfolioBalance(
  accounts: AccountCard[],
  enabledAccounts: Set<string>,
  range: RangeKey
): BalanceStackedPoint[] {
  const enabledAccs = accounts.filter((a) =>
    enabledAccounts.has(`${a.broker}-${a.account_number}`)
  );
  if (enabledAccs.length === 0) return [];

  // Build per-account date→balance maps
  const allDates = new Set<string>();
  const acctMaps: { key: string; map: Map<string, number> }[] = [];

  for (const acc of enabledAccs) {
    const key = `${acc.broker}-${acc.account_number}`;
    const map = new Map<string, number>();
    for (const pt of acc.series) {
      map.set(pt.date, pt.balance_usd);
      allDates.add(pt.date);
    }
    acctMaps.push({ key, map });
  }

  const sortedDates = Array.from(allDates).sort();

  // Forward-fill and build stacked data
  const result: BalanceStackedPoint[] = [];
  const lastKnown: Record<string, number> = {};

  for (const date of sortedDates) {
    const point: BalanceStackedPoint = { date };
    for (const { key, map } of acctMaps) {
      const val = map.get(date);
      if (val !== undefined) lastKnown[key] = val;
      point[key] = lastKnown[key] ?? 0;
    }
    result.push(point);
  }

  return sliceByRange(result, range);
}

// ── 2. Cumulative Total P&L ──────────────────────────────────────────

export type CumulativePnlPoint = { date: string; pnl: number };

export function computeCumulativePnl(
  cleanedRows: CleanedRow[],
  enabledAccounts: Set<string>,
  fxAudUsd: number,
  range: RangeKey
): CumulativePnlPoint[] {
  const rows = filterRows(cleanedRows, enabledAccounts, range);
  if (rows.length === 0) return [];

  // Aggregate daily P&L across all enabled accounts (converted to USD)
  const dailyMap = new Map<string, number>();
  for (const r of rows) {
    const pnl = toUsd(r, fxAudUsd);
    dailyMap.set(r.date, (dailyMap.get(r.date) ?? 0) + pnl);
  }

  const sortedDates = Array.from(dailyMap.keys()).sort();
  let cumulative = 0;
  return sortedDates.map((date) => {
    cumulative += dailyMap.get(date) ?? 0;
    return { date, pnl: Math.round(cumulative * 100) / 100 };
  });
}

// ── 3. Win Rate (donut) ──────────────────────────────────────────────

export type WinLossStats = { wins: number; losses: number; winRate: number };

export function computeWinLossStats(
  cleanedRows: CleanedRow[],
  enabledAccounts: Set<string>,
  range: RangeKey
): WinLossStats {
  const rows = filterRows(cleanedRows, enabledAccounts, range);
  let wins = 0;
  let losses = 0;
  for (const r of rows) {
    if (r.win_loss === 1) wins++;
    else if (r.win_loss === 0) losses++;
  }
  const total = wins + losses;
  return { wins, losses, winRate: total > 0 ? wins / total : 0 };
}

// ── 4. Monthly P&L Heatmap ──────────────────────────────────────────

export type MonthlyPnlEntry = { month: string; pnl: number };

export function computeMonthlyPnl(
  cleanedRows: CleanedRow[],
  enabledAccounts: Set<string>,
  fxAudUsd: number,
  range: RangeKey
): MonthlyPnlEntry[] {
  const rows = filterRows(cleanedRows, enabledAccounts, range);
  const map = new Map<string, number>();
  for (const r of rows) {
    const month = r.date.substring(0, 7);
    map.set(month, (map.get(month) ?? 0) + toUsd(r, fxAudUsd));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, pnl]) => ({ month, pnl: Math.round(pnl * 100) / 100 }));
}

// ── 5. Account Allocation (donut) ────────────────────────────────────

export type AllocationEntry = { name: string; key: string; value: number };

export function computeAccountAllocation(
  accounts: AccountCard[],
  enabledAccounts: Set<string>
): AllocationEntry[] {
  return accounts
    .filter((a) => enabledAccounts.has(`${a.broker}-${a.account_number}`))
    .map((a) => ({
      name: `${a.broker} #${a.account_number}`,
      key: `${a.broker}-${a.account_number}`,
      value: Math.max(0, a.balance_usd),
    }))
    .filter((e) => e.value > 0);
}

// ── 6. Drawdown Series ──────────────────────────────────────────────

export type DrawdownPoint = { date: string; drawdown: number };

export function computeDrawdownSeries(
  balanceSeries: BalanceStackedPoint[],
  accountKeys: string[]
): DrawdownPoint[] {
  if (balanceSeries.length === 0) return [];

  return balanceSeries.map((pt) => {
    return { date: pt.date, total: accountKeys.reduce((s, k) => s + ((pt[k] as number) ?? 0), 0) };
  }).reduce<{ peak: number; result: DrawdownPoint[] }>((acc, pt) => {
    if (pt.total > acc.peak) acc.peak = pt.total;
    const dd = acc.peak > 0 ? ((acc.peak - pt.total) / acc.peak) * -100 : 0;
    acc.result.push({ date: pt.date, drawdown: Math.round(dd * 100) / 100 });
    return acc;
  }, { peak: 0, result: [] }).result;
}

// ── 7. P&L Distribution (histogram bins) ─────────────────────────────

export type PnlBin = { range: string; count: number; midpoint: number };

export function computePnlDistribution(
  cleanedRows: CleanedRow[],
  enabledAccounts: Set<string>,
  _fxAudUsd: number,
  range: RangeKey
): PnlBin[] {
  const rows = filterRows(cleanedRows, enabledAccounts, range);

  // Use native currency P&L (no FX conversion) so the same bin ranges
  // apply equally to both AUD and USD accounts
  const dailyMap = new Map<string, number>();
  for (const r of rows) {
    dailyMap.set(r.date, (dailyMap.get(r.date) ?? 0) + r.closed_pnl);
  }

  const values = Array.from(dailyMap.values()).filter((v) => Math.abs(v) > 0.01);
  if (values.length === 0) return [];

  const fixedBins: { range: string; lo: number; hi: number; midpoint: number }[] = [
    { range: "Loss > 200", lo: -Infinity, hi: -200, midpoint: -250 },
    { range: "Loss 100–200", lo: -200, hi: -100, midpoint: -150 },
    { range: "Loss 50–100", lo: -100, hi: -50, midpoint: -75 },
    { range: "Loss 0–50", lo: -50, hi: 0, midpoint: -25 },
    { range: "Gain 0–50", lo: 0, hi: 50, midpoint: 25 },
    { range: "Gain 50–100", lo: 50, hi: 100, midpoint: 75 },
    { range: "Gain 100–200", lo: 100, hi: 200, midpoint: 150 },
    { range: "Gain > 200", lo: 200, hi: Infinity, midpoint: 250 },
  ];

  return fixedBins.map(({ range, lo, hi, midpoint }) => ({
    range,
    count: values.filter((v) => v >= lo && v < hi).length,
    midpoint,
  }));
}

// ── 8. Day-of-Week P&L ──────────────────────────────────────────────

export type DayOfWeekEntry = { day: string; avgPnl: number; totalPnl: number; count: number };

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function computeDayOfWeekPnl(
  cleanedRows: CleanedRow[],
  enabledAccounts: Set<string>,
  fxAudUsd: number,
  range: RangeKey
): DayOfWeekEntry[] {
  const rows = filterRows(cleanedRows, enabledAccounts, range);

  // Aggregate per day-of-week
  const sums: Record<number, { total: number; count: number }> = {};
  for (let i = 0; i < 7; i++) sums[i] = { total: 0, count: 0 };

  // Aggregate per date first, then by weekday
  const dailyMap = new Map<string, number>();
  for (const r of rows) {
    dailyMap.set(r.date, (dailyMap.get(r.date) ?? 0) + toUsd(r, fxAudUsd));
  }

  for (const [date, pnl] of dailyMap) {
    const dow = new Date(date + "T00:00:00").getDay();
    sums[dow].total += pnl;
    sums[dow].count++;
  }

  // Return Mon–Fri (1–5)
  return [1, 2, 3, 4, 5].map((dow) => ({
    day: DAY_NAMES[dow],
    avgPnl: sums[dow].count > 0 ? Math.round((sums[dow].total / sums[dow].count) * 100) / 100 : 0,
    totalPnl: Math.round(sums[dow].total * 100) / 100,
    count: sums[dow].count,
  }));
}

// ── 9. Monthly P&L Waterfall ─────────────────────────────────────────

export type WaterfallEntry = {
  month: string;
  pnl: number;
  start: number;
  end: number;
  isPositive: boolean;
};

export function computeMonthlyWaterfall(
  cleanedRows: CleanedRow[],
  enabledAccounts: Set<string>,
  fxAudUsd: number,
  range: RangeKey
): WaterfallEntry[] {
  const monthlyPnl = computeMonthlyPnl(cleanedRows, enabledAccounts, fxAudUsd, range);
  let cumulative = 0;
  return monthlyPnl.map(({ month, pnl }) => {
    const start = cumulative;
    cumulative += pnl;
    return {
      month,
      pnl: Math.round(pnl * 100) / 100,
      start: Math.round(start * 100) / 100,
      end: Math.round(cumulative * 100) / 100,
      isPositive: pnl >= 0,
    };
  });
}

// ── 10. Rolling Expectancy (30-day rolling avg P&L per trading day) ──

export type RollingExpectancyPoint = { date: string; expectancy: number };

export function computeRollingExpectancy(
  cleanedRows: CleanedRow[],
  enabledAccounts: Set<string>,
  fxAudUsd: number,
  windowDays: number,
  range: RangeKey
): RollingExpectancyPoint[] {
  const rows = filterRows(cleanedRows, enabledAccounts, range);
  if (rows.length === 0) return [];

  // Aggregate daily P&L across accounts per date
  const dateMap = new Map<string, number>();
  for (const r of rows) {
    dateMap.set(r.date, (dateMap.get(r.date) ?? 0) + toUsd(r, fxAudUsd));
  }

  // Only include dates with actual trading activity (non-zero P&L)
  const tradingDates = Array.from(dateMap.entries())
    .filter(([, pnl]) => Math.abs(pnl) > 0.001)
    .sort(([a], [b]) => a.localeCompare(b));

  const result: RollingExpectancyPoint[] = [];
  const window: number[] = [];

  for (const [date, pnl] of tradingDates) {
    window.push(pnl);
    if (window.length > windowDays) window.shift();

    if (window.length >= 3) {
      const avg = window.reduce((s, v) => s + v, 0) / window.length;
      result.push({
        date,
        expectancy: Math.round(avg * 100) / 100,
      });
    }
  }

  return result;
}

// ── 11. Capital Flow Timeline ───────────────────────────────────────

export type CapitalFlowEntry = {
  date: string;
  deposit: number;
  withdrawal: number;
  net: number;
  account: string;
};

export function computeCapitalFlows(
  cleanedRows: CleanedRow[],
  enabledAccounts: Set<string>,
  fxAudUsd: number,
  range: RangeKey
): CapitalFlowEntry[] {
  const rows = filterRows(cleanedRows, enabledAccounts, range);
  const result: CapitalFlowEntry[] = [];

  for (const r of rows) {
    if (r.deposit === 0 && r.withdrawal === 0) continue;
    const toUsdMultiplier = r.currency === "AUD" ? fxAudUsd : 1;
    const dep = r.deposit * toUsdMultiplier;
    const wdl = r.withdrawal * toUsdMultiplier;
    result.push({
      date: r.date,
      deposit: Math.round(dep * 100) / 100,
      withdrawal: Math.round(-Math.abs(wdl) * 100) / 100,
      net: Math.round((dep - Math.abs(wdl)) * 100) / 100,
      account: `${r.broker} #${r.account_number}`,
    });
  }

  // Sort by date
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

// ── 12. Monthly Return % ────────────────────────────────────────────

export type MonthlyReturnPctEntry = { month: string; returnPct: number };

export function computeMonthlyReturnPct(
  accounts: AccountCard[],
  enabledAccounts: Set<string>,
  range: RangeKey,
  cleanedRows?: CleanedRow[],
  fxAudUsd?: number
): MonthlyReturnPctEntry[] {
  if (!cleanedRows || !fxAudUsd) return [];

  const enabledAccs = accounts.filter((a) =>
    enabledAccounts.has(`${a.broker}-${a.account_number}`)
  );
  if (enabledAccs.length === 0) return [];

  const enabledKeys = new Set(enabledAccs.map((a) => `${a.broker}-${a.account_number}`));

  // Build total portfolio balance per day (forward-fill) for denominator
  const allDates = new Set<string>();
  const acctBalMaps: Map<string, number>[] = [];

  for (const acc of enabledAccs) {
    const balMap = new Map<string, number>();
    for (const pt of acc.series) {
      balMap.set(pt.date, pt.balance_usd);
      allDates.add(pt.date);
    }
    acctBalMaps.push(balMap);
  }

  let sortedDates = Array.from(allDates).sort();
  if (range !== "all") {
    const daysMap: Record<string, number> = { "3d": 3, "7d": 7, "14d": 14, "1m": 30, "3m": 90 };
    sortedDates = sortedDates.slice(-(daysMap[range] ?? sortedDates.length));
  }

  // Compute total balance per day
  const lastKnown: number[] = new Array(acctBalMaps.length).fill(0);
  const dailyBalance = new Map<string, number>();
  for (const date of sortedDates) {
    let total = 0;
    for (let i = 0; i < acctBalMaps.length; i++) {
      const bal = acctBalMaps[i].get(date);
      if (bal !== undefined) lastKnown[i] = bal;
      total += lastKnown[i];
    }
    dailyBalance.set(date, total);
  }

  // Sum closed P&L per month from cleanedRows (the authoritative source)
  const monthlyPnlUsd = new Map<string, number>();
  for (const r of cleanedRows) {
    if (!enabledKeys.has(`${r.broker}-${r.account_number}`)) continue;
    const month = r.date.substring(0, 7);
    const pnlUsd = r.currency === "AUD" ? r.closed_pnl * fxAudUsd : r.closed_pnl;
    monthlyPnlUsd.set(month, (monthlyPnlUsd.get(month) ?? 0) + pnlUsd);
  }

  // Get end-of-month balances for denominator
  const monthEndBal = new Map<string, number>();
  for (const [date, bal] of dailyBalance) {
    const month = date.substring(0, 7);
    monthEndBal.set(month, bal); // last date per month wins since dates are sorted
  }

  const months = Array.from(new Set([...monthlyPnlUsd.keys(), ...monthEndBal.keys()])).sort();
  const result: MonthlyReturnPctEntry[] = [];
  let prevEndBal = 0;

  for (const month of months) {
    const pnl = monthlyPnlUsd.get(month) ?? 0;
    const base = prevEndBal > 0 ? prevEndBal : (monthEndBal.get(month) ?? 0);
    const returnPct = base > 0 ? (pnl / base) * 100 : 0;

    result.push({
      month,
      returnPct: Math.round(returnPct * 100) / 100,
    });

    prevEndBal = monthEndBal.get(month) ?? prevEndBal;
  }

  return result;
}

// ── Rolling Win Rate ─────────────────────────────────────────────────

export type RollingWinRatePoint = { date: string; winRate: number };

export function computeRollingWinRate(
  cleanedRows: CleanedRow[],
  enabledAccounts: Set<string>,
  windowDays: number,
  range: RangeKey
): RollingWinRatePoint[] {
  const rows = filterRows(cleanedRows, enabledAccounts, range);
  if (rows.length === 0) return [];

  // Aggregate net daily P&L across all accounts to classify each day
  const dateMap = new Map<string, number>();
  for (const r of rows) {
    dateMap.set(r.date, (dateMap.get(r.date) ?? 0) + r.closed_pnl);
  }

  // Only include trading days (non-zero P&L) — skip weekends/gaps
  const tradingDays = Array.from(dateMap.entries())
    .filter(([, pnl]) => Math.abs(pnl) > 0.001)
    .sort(([a], [b]) => a.localeCompare(b));

  const result: RollingWinRatePoint[] = [];
  // Window stores 1 for net-positive day, 0 for net-negative day
  const window: number[] = [];

  for (const [date, pnl] of tradingDays) {
    window.push(pnl > 0 ? 1 : 0);
    if (window.length > windowDays) window.shift();

    if (window.length >= 3) {
      const wins = window.reduce((s, v) => s + v, 0);
      result.push({
        date,
        winRate: Math.round((wins / window.length) * 10000) / 100,
      });
    }
  }

  return result;
}
