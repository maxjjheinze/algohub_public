"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Percent, Target, Activity, Trophy, BarChart3, Zap, Scale } from "lucide-react";
import { cn } from "../../lib/utils";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { CURRENCY_SYMBOLS } from "../../lib/constants";
import type { RangeKey } from "../../lib/apiClient";
import type { AccountCard, CleanedRow, CurrencyKey } from "../../lib/types";

import { HIDDEN_ACCOUNTS } from "../../lib/constants";
const HIDDEN = HIDDEN_ACCOUNTS;
const RANGE_DAYS: Record<string, number> = { "3d": 3, "7d": 7, "14d": 14, "1m": 30, "3m": 90 };

function MetricBox({
  label,
  value,
  prefix,
  suffix,
  colored,
  icon,
  muted,
  animate,
  topRight,
  decimals = 0,
}: {
  label: string;
  value: number | string | undefined;
  prefix?: string;
  suffix?: string;
  colored?: boolean;
  icon: React.ReactNode;
  muted?: boolean;
  animate?: boolean;
  topRight?: React.ReactNode;
  decimals?: number;
}) {
  const numVal = typeof value === "number" ? value : undefined;
  const isNumeric = typeof value === "number";
  const sign = numVal !== undefined && numVal < 0 ? -1 : 1;
  const isPositive = sign >= 0;
  const colorClass =
    colored && numVal !== undefined
      ? isPositive ? "text-positive" : "text-negative"
      : muted ? "text-slate-400" : "text-slate-100";
  const bgClass =
    colored && numVal !== undefined
      ? isPositive ? "bg-positiveSoft" : "bg-negativeSoft"
      : "bg-white/[0.03]";

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0", bgClass)}>
          {icon}
        </div>
        <div className="text-[0.55rem] uppercase tracking-[0.16em] text-slate-600 font-medium flex-1">{label}</div>
        {topRight}
      </div>
      <div className={cn("flex items-center gap-1 font-mono text-[0.7rem] md:text-[0.75rem] font-semibold tabular-nums", colorClass)}>
        {colored && numVal !== undefined && (
          isPositive
            ? <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0" />
            : <ArrowDownRight className="h-3.5 w-3.5 flex-shrink-0" />
        )}
        <span>
          {value === undefined
            ? "---"
            : isNumeric
              ? <>
                  {prefix}
                  <AnimatedNumber
                    value={Math.abs(value as number)}
                    format={(n) => n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                    springConfig={{ stiffness: 70, damping: 20 }}
                    animate={animate}
                  />
                  {suffix}
                </>
              : value}
        </span>
      </div>
    </div>
  );
}

function SplitMetricBox({
  label,
  icon,
  leftValue,
  leftLabel,
  leftColor,
  rightValue,
  rightLabel,
  rightColor,
  prefix,
  rightSuffix,
  animate,
  decimals = 0,
}: {
  label: string;
  icon: React.ReactNode;
  leftValue: number | string | undefined;
  leftLabel: string;
  leftColor: string;
  rightValue: number | string | undefined;
  rightLabel: string;
  rightColor: string;
  prefix?: string;
  rightSuffix?: string;
  animate?: boolean;
  decimals?: number;
}) {
  const renderVal = (v: number | string | undefined, pfx?: string, sfx?: string) => {
    if (v === undefined) return "---";
    if (typeof v === "string") return v;
    return (
      <>
        {pfx}
        <AnimatedNumber
          value={Math.abs(v)}
          format={(n) => n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
          springConfig={{ stiffness: 70, damping: 20 }}
          animate={animate}
        />
        {sfx}
      </>
    );
  };

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/[0.03]">
          {icon}
        </div>
        <div className="text-[0.55rem] uppercase tracking-[0.16em] text-slate-600 font-medium">{label}</div>
      </div>
      <div className="flex items-start gap-2">
        <div className="flex flex-col">
          <span className={cn("font-mono text-[0.7rem] md:text-[0.75rem] font-semibold tabular-nums", leftColor)}>
            {renderVal(leftValue, prefix)}
          </span>
          <span className="text-[0.45rem] uppercase tracking-[0.1em] text-slate-600">
            {leftLabel}
          </span>
        </div>
        <div className="w-px h-6 bg-white/[0.06] self-center" />
        <div className="flex flex-col">
          <span className={cn("font-mono text-[0.7rem] md:text-[0.75rem] font-semibold tabular-nums", rightColor)}>
            {renderVal(rightValue, rightSuffix ? undefined : prefix, rightSuffix)}
          </span>
          <span className="text-[0.45rem] uppercase tracking-[0.1em] text-slate-600">
            {rightLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

type ReturnMode = "roi" | "twr";
const RETURN_OPTIONS: ReturnMode[] = ["roi", "twr"];
const RETURN_LABELS: Record<ReturnMode, string> = { roi: "ROI", twr: "TWR" };

function ReturnToggle({
  value,
  onChange,
}: {
  value: ReturnMode;
  onChange: (v: ReturnMode) => void;
}) {
  return (
    <div className="relative inline-flex rounded-md bg-white/[0.03] p-[2px] border border-white/[0.04]">
      {RETURN_OPTIONS.map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "relative z-10 px-1.5 py-[1px] rounded-[3px] text-[0.4rem] font-bold uppercase tracking-[0.14em] transition-colors duration-200",
            value === key ? "text-accent" : "text-slate-600 hover:text-slate-400"
          )}
        >
          {value === key && (
            <motion.div
              layoutId="hero-return-toggle-indicator"
              className="absolute inset-0 rounded-[3px] bg-accent/[0.08] border border-accent/20"
              style={{ boxShadow: "0 0 12px rgba(245,158,66,0.06)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative">{RETURN_LABELS[key]}</span>
        </button>
      ))}
    </div>
  );
}

export function MetricsPanel({
  accounts,
  cleanedRows,
  fxAudUsd,
  currency,
  range,
  animateNumbers = true,
}: {
  accounts: AccountCard[];
  cleanedRows: CleanedRow[];
  fxAudUsd: number;
  currency: CurrencyKey;
  range: RangeKey;
  animateNumbers?: boolean;
}) {
  const metrics = useMemo(() => {
    // Filter hidden accounts
    const visibleAccounts = accounts.filter(a => !HIDDEN.has(a.account_number));
    const visibleKeys = new Set(visibleAccounts.map(a => `${a.broker}-${a.account_number}`));
    const visibleRows = cleanedRows.filter(r => visibleKeys.has(`${r.broker}-${r.account_number}`));
    if (visibleRows.length === 0) return null;

    // Determine date range: take last N unique dates (mirrors sliceByRange logic)
    const allDates = [...new Set(visibleRows.map(r => r.date))].sort();
    const rangeDates = range === "all"
      ? new Set(allDates)
      : new Set(allDates.slice(-(RANGE_DAYS[range] ?? allDates.length)));

    const rangeRows = visibleRows.filter(r => rangeDates.has(r.date));
    if (rangeRows.length === 0) return null;

    // --- Portfolio-level: aggregate per-date net P&L ---
    const dailyPnlMap = new Map<string, number>();
    const dailyBalanceMap = new Map<string, number>();
    const dailyDwMap = new Map<string, number>();
    let totalPnlUsd = 0;
    let grossProfitUsd = 0;
    let grossLossUsd = 0;

    for (const r of rangeRows) {
      const toUsd = r.currency === "AUD" ? fxAudUsd : 1;
      const pnlUsd = r.closed_pnl * toUsd;
      const balUsd = r.balance * toUsd;
      const dwUsd = (r.deposit + r.withdrawal) * toUsd;

      totalPnlUsd += pnlUsd;
      dailyPnlMap.set(r.date, (dailyPnlMap.get(r.date) ?? 0) + pnlUsd);
      dailyBalanceMap.set(r.date, (dailyBalanceMap.get(r.date) ?? 0) + balUsd);
      dailyDwMap.set(r.date, (dailyDwMap.get(r.date) ?? 0) + dwUsd);

      if (pnlUsd > 0) grossProfitUsd += pnlUsd;
      else if (pnlUsd < 0) grossLossUsd += pnlUsd;
    }

    // Portfolio-level win/loss, best/worst day, avg win/loss from net daily P&L
    let portfolioWins = 0;
    let portfolioLosses = 0;
    let bestDayUsd = -Infinity;
    let worstDayUsd = Infinity;
    let sumWinPnl = 0;
    let sumLossPnl = 0;

    for (const [, netPnl] of dailyPnlMap) {
      if (netPnl !== 0) {
        if (netPnl > 0) {
          portfolioWins++;
          sumWinPnl += netPnl;
        } else {
          portfolioLosses++;
          sumLossPnl += netPnl;
        }
        if (netPnl > bestDayUsd) bestDayUsd = netPnl;
        if (netPnl < worstDayUsd) worstDayUsd = netPnl;
      }
    }

    const totalTrades = portfolioWins + portfolioLosses;
    const winRate = totalTrades > 0 ? portfolioWins / totalTrades : undefined;
    const expectancyUsd = totalTrades > 0 ? totalPnlUsd / totalTrades : undefined;

    // TWR: chain-link daily returns from range-filtered cleaned rows
    const twrDates = Array.from(dailyBalanceMap.keys()).sort();
    let twrChain = 1.0;
    let twrStarted = false;
    let prevTotalBal = 0;
    for (const d of twrDates) {
      const totalBal = dailyBalanceMap.get(d) ?? 0;
      const totalDw = dailyDwMap.get(d) ?? 0;
      const adjustedPrev = prevTotalBal + totalDw;
      if (adjustedPrev !== 0) {
        const dailyReturn = totalBal / adjustedPrev;
        if (!twrStarted) {
          twrChain = dailyReturn;
          twrStarted = true;
        } else {
          twrChain *= dailyReturn;
        }
      }
      prevTotalBal = totalBal;
    }
    const returnPct = twrStarted ? twrChain - 1.0 : undefined;

    // ROI: P&L in range / cumulative deposits up to end of range
    // Using cumulative deposits (not just in-range) so ROI is meaningful
    // even when no deposits occurred in the selected window.
    let cumDepositsUsd = 0;
    for (const r of visibleRows) {
      if (r.date > rangeRows[rangeRows.length - 1].date) break;
      const toUsd = r.currency === "AUD" ? fxAudUsd : 1;
      cumDepositsUsd += r.deposit * toUsd;
    }
    const roiPct = cumDepositsUsd > 0 ? totalPnlUsd / cumDepositsUsd : undefined;

    const profitFactor = grossLossUsd !== 0 ? grossProfitUsd / Math.abs(grossLossUsd) : undefined;
    const avgWinUsd = portfolioWins > 0 ? sumWinPnl / portfolioWins : undefined;
    const avgLossUsd = portfolioLosses > 0 ? sumLossPnl / portfolioLosses : undefined;

    // Portfolio drawdown from forward-filled account balance series (range-sliced)
    const allSeriesDates = new Set<string>();
    const acctBalMaps: { key: string; map: Map<string, number> }[] = [];
    for (const acc of visibleAccounts) {
      const key = `${acc.broker}-${acc.account_number}`;
      const map = new Map<string, number>();
      for (const pt of acc.series) {
        map.set(pt.date, pt.balance_usd);
        allSeriesDates.add(pt.date);
      }
      acctBalMaps.push({ key, map });
    }
    // Slice series dates to range
    const seriesDates = Array.from(allSeriesDates).sort();
    const rangeSeriesDates = range === "all"
      ? seriesDates
      : seriesDates.slice(-(RANGE_DAYS[range] ?? seriesDates.length));

    const lastKnown: Record<string, number> = {};
    // Forward-fill up to the start of the range window
    if (range !== "all" && seriesDates.length > rangeSeriesDates.length) {
      for (const d of seriesDates) {
        if (d >= rangeSeriesDates[0]) break;
        for (const { key, map } of acctBalMaps) {
          const val = map.get(d);
          if (val !== undefined) lastKnown[key] = val;
        }
      }
    }

    let peakBalance = 0;
    let worstDrawdownPct = 0;
    for (const d of rangeSeriesDates) {
      let totalBal = 0;
      for (const { key, map } of acctBalMaps) {
        const val = map.get(d);
        if (val !== undefined) lastKnown[key] = val;
        totalBal += lastKnown[key] ?? 0;
      }
      if (totalBal > peakBalance) peakBalance = totalBal;
      if (peakBalance > 0) {
        const ddPct = ((totalBal - peakBalance) / peakBalance) * 100;
        if (ddPct < -worstDrawdownPct) worstDrawdownPct = Math.abs(ddPct);
      }
    }

    return {
      totalPnlUsd,
      returnPct,
      roiPct,
      winRate,
      profitFactor,
      worstDrawdownPct,
      expectancyUsd,
      avgWinUsd,
      avgLossUsd,
      bestDayUsd: bestDayUsd === -Infinity ? undefined : bestDayUsd,
      worstDayUsd: worstDayUsd === Infinity ? undefined : worstDayUsd,
    };
  }, [accounts, cleanedRows, fxAudUsd, range]);

  const [returnMode, setReturnMode] = useState<ReturnMode>("roi");

  const toDisplay = (usdValue: number | undefined) => {
    if (usdValue === undefined) return undefined;
    return currency === "AUD" ? usdValue / fxAudUsd : usdValue;
  };

  const sym = CURRENCY_SYMBOLS[currency];

  return (
    <div className="glass-card p-5 md:p-6 h-full flex flex-col">
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4">
        Performance
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2.5 content-start">
        {/* Row 1 */}
        <MetricBox
          label="Total P&L"
          value={toDisplay(metrics?.totalPnlUsd)}
          prefix={sym}
          colored
          icon={<TrendingUp className="h-3.5 w-3.5 text-slate-500" />}
          animate={animateNumbers}
          decimals={2}
        />
        <MetricBox
          label="Return"
          value={
            returnMode === "twr"
              ? metrics?.returnPct != null ? metrics.returnPct * 100 : undefined
              : metrics?.roiPct != null ? metrics.roiPct * 100 : undefined
          }
          suffix="%"
          colored
          icon={<Percent className="h-3.5 w-3.5 text-slate-500" />}
          animate={animateNumbers}
          topRight={<ReturnToggle value={returnMode} onChange={setReturnMode} />}
        />
        {/* Row 2 */}
        <MetricBox
          label="Win Rate"
          value={metrics?.winRate != null ? metrics.winRate * 100 : undefined}
          suffix="%"
          icon={<Target className="h-3.5 w-3.5 text-slate-500" />}
          animate={animateNumbers}
        />
        <MetricBox
          label="Profit Factor"
          value={metrics?.profitFactor}
          colored
          icon={<Scale className="h-3.5 w-3.5 text-slate-500" />}
          animate={animateNumbers}
        />
        {/* Row 3 */}
        <MetricBox
          label="Max Drawdown"
          value={metrics?.worstDrawdownPct != null ? -metrics.worstDrawdownPct : undefined}
          suffix="%"
          colored
          icon={<BarChart3 className="h-3.5 w-3.5 text-slate-500" />}
          animate={animateNumbers}
        />
        <MetricBox
          label="Expectancy"
          value={toDisplay(metrics?.expectancyUsd)}
          prefix={sym}
          colored
          icon={<Zap className="h-3.5 w-3.5 text-slate-500" />}
          animate={animateNumbers}
        />
        {/* Row 4 */}
        <SplitMetricBox
          label="Avg Win / Loss"
          icon={<Activity className="h-3.5 w-3.5 text-slate-500" />}
          leftValue={toDisplay(metrics?.avgWinUsd)}
          leftLabel="Win"
          leftColor="text-positive"
          rightValue={toDisplay(metrics?.avgLossUsd)}
          rightLabel="Loss"
          rightColor="text-negative"
          prefix={sym}
          animate={animateNumbers}
        />
        <SplitMetricBox
          label="Best / Worst Day"
          icon={<Trophy className="h-3.5 w-3.5 text-slate-500" />}
          leftValue={toDisplay(metrics?.bestDayUsd)}
          leftLabel="Best"
          leftColor="text-positive"
          rightValue={toDisplay(metrics?.worstDayUsd)}
          rightLabel="Worst"
          rightColor="text-negative"
          prefix={sym}
          animate={animateNumbers}
        />
      </div>
    </div>
  );
}
