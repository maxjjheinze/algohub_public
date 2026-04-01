"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Percent,
  Target,
  Users,
  BarChart3,
  Zap,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Scale,
  Trophy,
  Activity,
  Telescope,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { SectionHeading } from "../ui/SectionHeading";
import { CurrencyToggle } from "../hero/CurrencyToggle";
import { INACTIVE_ACCOUNTS, HIDDEN_ACCOUNTS } from "../../lib/constants";
import { computeWorstDrawdownPct } from "../../lib/analyticsData";
import type { AccountCard, CleanedRow, CurrencyKey, StatsRow } from "../../lib/types";

function MiniMetric({
  label,
  value,
  prefix,
  suffix,
  colored,
  icon,
  muted,
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
  topRight?: React.ReactNode;
  decimals?: number;
}) {
  const numVal = typeof value === "number" ? value : undefined;
  const isNumeric = typeof value === "number";
  const isPositive = numVal === undefined || numVal >= 0;
  const colorClass =
    colored && numVal !== undefined
      ? isPositive
        ? "text-positive"
        : "text-negative"
      : muted
        ? "text-slate-400"
        : "text-slate-300";
  const bgClass =
    colored && numVal !== undefined
      ? isPositive
        ? "bg-positiveSoft"
        : "bg-negativeSoft"
      : "bg-white/[0.03]";

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-2.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "h-5 w-5 rounded-md flex items-center justify-center flex-shrink-0",
            bgClass
          )}
        >
          {icon}
        </div>
        <div className="text-[0.5rem] uppercase tracking-[0.14em] text-slate-600 font-medium leading-tight truncate flex-1">
          {label}
        </div>
        {topRight}
      </div>
      <div
        className={cn(
          "flex items-center gap-0.5 font-mono text-[0.85rem] font-semibold tabular-nums h-[1.3rem]",
          colorClass
        )}
      >
        {colored &&
          numVal !== undefined &&
          (isPositive ? (
            <ArrowUpRight className="h-3 w-3 flex-shrink-0" />
          ) : (
            <ArrowDownRight className="h-3 w-3 flex-shrink-0" />
          ))}
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
                  />
                  {suffix}
                </>
              : value}
        </span>
      </div>
    </div>
  );
}

function SplitMetric({
  label,
  icon,
  leftValue,
  leftLabel,
  leftColor,
  rightValue,
  rightLabel,
  rightColor,
  prefix,
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
  decimals?: number;
}) {
  const renderVal = (v: number | string | undefined) => {
    if (v === undefined) return "---";
    if (typeof v === "string") return v;
    return (
      <>
        {prefix}
        <AnimatedNumber
          value={Math.abs(v)}
          format={(n) => n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
          springConfig={{ stiffness: 70, damping: 20 }}
        />
      </>
    );
  };

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-2.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="h-5 w-5 rounded-md flex items-center justify-center flex-shrink-0 bg-white/[0.03]">
          {icon}
        </div>
        <div className="text-[0.5rem] uppercase tracking-[0.14em] text-slate-600 font-medium leading-tight">
          {label}
        </div>
      </div>
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5">
          <span className={cn("font-mono text-[0.85rem] font-semibold tabular-nums leading-tight", leftColor)}>
            {renderVal(leftValue)}
          </span>
          <span className="text-[0.45rem] uppercase tracking-[0.1em] text-slate-600">
            {leftLabel}
          </span>
        </div>
        <div className="w-px h-5 bg-white/[0.06] self-center" />
        <div className="flex flex-col gap-0.5">
          <span className={cn("font-mono text-[0.85rem] font-semibold tabular-nums leading-tight", rightColor)}>
            {renderVal(rightValue)}
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
              layoutId="return-toggle-indicator"
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

export function OverviewStrip({
  accounts,
  statsMap,
  cleanedRows,
  fxAudUsd,
  currency: ccy,
  onCurrencyChange: setCcy,
  onAnalyticsClick,
}: {
  accounts: AccountCard[];
  statsMap: Map<string, StatsRow>;
  cleanedRows: CleanedRow[];
  fxAudUsd: number;
  currency: CurrencyKey;
  onCurrencyChange: (c: CurrencyKey) => void;
  onAnalyticsClick?: () => void;
}) {

  const metrics = useMemo(() => {
    if (accounts.length === 0) return null;

    // Filter hidden accounts FIRST — use for ALL aggregations
    const visibleAccounts = accounts.filter(
      (a) => !HIDDEN_ACCOUNTS.has(a.account_number)
    );
    const visibleKeys = new Set(
      visibleAccounts.map((a) => `${a.broker}-${a.account_number}`)
    );

    const totalBalanceUsd = visibleAccounts.reduce((s, a) => s + a.balance_usd, 0);
    const totalPnlUsd = visibleAccounts.reduce((s, a) => s + a.closed_pnl_usd, 0);
    const totalDepositsUsd = visibleAccounts.reduce(
      (s, a) => s + (a.total_deposits_usd ?? 0),
      0
    );
    const totalWithdrawalsUsd = visibleAccounts.reduce(
      (s, a) => s + (a.total_withdrawals_usd ?? 0),
      0
    );

    // --- Portfolio-level metrics from cleanedRows ---
    // Build net daily P&L (USD) across all visible accounts
    const dailyPnlMap = new Map<string, number>();
    let totalGrossProfitUsd = 0;
    let totalGrossLossUsd = 0;

    for (const r of cleanedRows) {
      const key = `${r.broker}-${r.account_number}`;
      if (!visibleKeys.has(key)) continue;

      const toUsd = r.currency === "AUD" ? fxAudUsd : 1;
      const pnlUsd = r.closed_pnl * toUsd;

      dailyPnlMap.set(r.date, (dailyPnlMap.get(r.date) ?? 0) + pnlUsd);

      // Gross profit/loss aggregation
      if (pnlUsd > 0) totalGrossProfitUsd += pnlUsd;
      else if (pnlUsd < 0) totalGrossLossUsd += pnlUsd;
    }

    // Sort dates and compute portfolio-level metrics
    const sortedDates = Array.from(dailyPnlMap.keys()).sort();

    let portfolioWins = 0;
    let portfolioLosses = 0;
    let bestDayUsd = -Infinity;
    let worstDayUsd = Infinity;
    let sumWinPnl = 0;
    let sumLossPnl = 0;
    const tradingDates = new Set<string>();
    const activeDates = new Set<string>();

    for (const date of sortedDates) {
      const netPnl = dailyPnlMap.get(date) ?? 0;
      activeDates.add(date);

      // Only count actual trading days (non-zero P&L)
      if (netPnl !== 0) {
        tradingDates.add(date);
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

    // Portfolio drawdown adjusted for deposits/withdrawals (only trading losses count)
    const worstDrawdownPct = computeWorstDrawdownPct(visibleAccounts);

    const totalPortfolioTrades = portfolioWins + portfolioLosses;
    const winRate = totalPortfolioTrades > 0 ? portfolioWins / totalPortfolioTrades : undefined;
    const expectancyUsd = totalPortfolioTrades > 0 ? totalPnlUsd / totalPortfolioTrades : undefined;

    const profitFactor =
      totalGrossLossUsd !== 0
        ? totalGrossProfitUsd / Math.abs(totalGrossLossUsd)
        : undefined;

    const bestDay = bestDayUsd === -Infinity ? undefined : bestDayUsd;
    const worstDay = worstDayUsd === Infinity ? undefined : worstDayUsd;

    const avgWinUsd = portfolioWins > 0 ? sumWinPnl / portfolioWins : undefined;
    const avgLossUsd = portfolioLosses > 0 ? sumLossPnl / portfolioLosses : undefined;

    // Portfolio TWR: chain-link daily returns across all visible accounts
    // For each date: total_balance / (prev_total_balance + total_deposit_withdrawal)
    const dailyBalanceMap = new Map<string, number>();
    const dailyDwMap = new Map<string, number>();
    for (const r of cleanedRows) {
      const key = `${r.broker}-${r.account_number}`;
      if (!visibleKeys.has(key)) continue;
      const toUsd = r.currency === "AUD" ? fxAudUsd : 1;
      const balUsd = r.balance * toUsd;
      const dwUsd = (r.deposit + r.withdrawal) * toUsd;
      dailyBalanceMap.set(r.date, (dailyBalanceMap.get(r.date) ?? 0) + balUsd);
      dailyDwMap.set(r.date, (dailyDwMap.get(r.date) ?? 0) + dwUsd);
    }
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
    const timeWeightedReturn = twrStarted ? twrChain - 1.0 : undefined;

    // Simple return: P&L / total deposits
    const simpleReturn = totalDepositsUsd > 0 ? totalPnlUsd / totalDepositsUsd : undefined;

    // Active accounts count
    let activeAccounts = 0;
    for (const acc of visibleAccounts) {
      const s = statsMap.get(`${acc.broker}:${acc.account_number}`);
      if (s && s.cumulative_trading_days > 0 && !INACTIVE_ACCOUNTS.has(`${acc.broker}-${acc.account_number}`)) {
        activeAccounts++;
      }
    }

    return {
      totalBalanceUsd,
      totalPnlUsd,
      totalDepositsUsd,
      totalWithdrawalsUsd,
      timeWeightedReturn,
      simpleReturn,
      winRate,
      worstDrawdownPct,
      expectancyUsd,
      profitFactor,
      bestDayUsd: bestDay,
      worstDayUsd: worstDay,
      avgWinUsd,
      avgLossUsd,
      maxTradingDays: tradingDates.size,
      maxActiveDays: activeDates.size,
      activeAccounts,
      totalAccounts: visibleAccounts.length,
    };
  }, [accounts, statsMap, cleanedRows, fxAudUsd]);

  const [returnMode, setReturnMode] = useState<ReturnMode>("roi");

  const toDisplay = (usdValue: number | undefined) => {
    if (usdValue === undefined) return undefined;
    return ccy === "AUD" ? usdValue / fxAudUsd : usdValue;
  };

  const sym = ccy === "AUD" ? "A$" : "$";

  const accountsStr =
    metrics != null
      ? `${metrics.activeAccounts} / ${metrics.totalAccounts}`
      : undefined;

  return (
    <motion.section
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.02,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <div className="glass-card p-4 md:p-5">
        <SectionHeading
          title="Portfolio Overview"
          action={
            onAnalyticsClick ? (
              <button
                onClick={onAnalyticsClick}
                className="group h-6 w-6 rounded-md bg-white/[0.03] hover:bg-white/[0.06] flex items-center justify-center text-slate-600 hover:text-slate-300 transition-all duration-200 border border-white/[0.04]"
                title="Portfolio Analytics"
              >
                <Telescope className="h-3.5 w-3.5 transition-all duration-200 group-hover:drop-shadow-[0_0_6px_rgba(245,158,66,0.4)]" />
              </button>
            ) : undefined
          }
          right={<CurrencyToggle value={ccy} onChange={setCcy} id="overview-currency-indicator" />}
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {/* Row 1 */}
          <MiniMetric
            label="Total Balance"
            value={toDisplay(metrics?.totalBalanceUsd)}
            prefix={sym}
            icon={<DollarSign className="h-3 w-3 text-slate-500" />}
            decimals={2}
          />
          <MiniMetric
            label="Total P&L"
            value={toDisplay(metrics?.totalPnlUsd)}
            prefix={sym}
            colored
            icon={<TrendingUp className="h-3 w-3 text-slate-500" />}
            decimals={2}
          />
          <SplitMetric
            label="Deposits / Withdrawals"
            icon={<PiggyBank className="h-3 w-3 text-slate-500" />}
            leftValue={toDisplay(metrics?.totalDepositsUsd)}
            leftLabel="In"
            leftColor="text-positive"
            rightValue={toDisplay(metrics?.totalWithdrawalsUsd)}
            rightLabel="Out"
            rightColor="text-negative"
            prefix={sym}
          />
          <MiniMetric
            label="Return"
            value={
              returnMode === "twr"
                ? metrics?.timeWeightedReturn != null
                  ? metrics.timeWeightedReturn * 100
                  : undefined
                : metrics?.simpleReturn != null
                  ? metrics.simpleReturn * 100
                  : undefined
            }
            suffix="%"
            colored
            icon={<Percent className="h-3 w-3 text-slate-500" />}
            topRight={<ReturnToggle value={returnMode} onChange={setReturnMode} />}
          />
          <MiniMetric
            label="Win Rate"
            value={
              metrics?.winRate != null
                ? metrics.winRate * 100
                : undefined
            }
            suffix="%"
            icon={<Target className="h-3 w-3 text-slate-500" />}
          />
          <MiniMetric
            label="Profit Factor"
            value={metrics?.profitFactor}
            colored
            icon={<Scale className="h-3 w-3 text-slate-500" />}
          />

          {/* Row 2 */}
          <MiniMetric
            label="Accounts"
            value={accountsStr}
            icon={<Users className="h-3 w-3 text-slate-500" />}
            muted
          />
          <MiniMetric
            label="Max Drawdown"
            value={
              metrics?.worstDrawdownPct != null
                ? -metrics.worstDrawdownPct
                : undefined
            }
            suffix="%"
            colored
            icon={<BarChart3 className="h-3 w-3 text-slate-500" />}
          />
          <MiniMetric
            label="Expectancy"
            value={toDisplay(metrics?.expectancyUsd)}
            prefix={sym}
            colored
            icon={<Zap className="h-3 w-3 text-slate-500" />}
          />
          <SplitMetric
            label="Avg Win / Loss"
            icon={<Activity className="h-3 w-3 text-slate-500" />}
            leftValue={toDisplay(metrics?.avgWinUsd)}
            leftLabel="Win"
            leftColor="text-positive"
            rightValue={toDisplay(metrics?.avgLossUsd)}
            rightLabel="Loss"
            rightColor="text-negative"
            prefix={sym}
          />
          <SplitMetric
            label="Best / Worst"
            icon={<Trophy className="h-3 w-3 text-slate-500" />}
            leftValue={toDisplay(metrics?.bestDayUsd)}
            leftLabel="Best"
            leftColor="text-positive"
            rightValue={toDisplay(metrics?.worstDayUsd)}
            rightLabel="Worst"
            rightColor="text-negative"
            prefix={sym}
          />
          <SplitMetric
            label="Days"
            icon={<CalendarDays className="h-3 w-3 text-slate-500" />}
            leftValue={metrics?.maxTradingDays != null ? String(Math.round(metrics.maxTradingDays)) : undefined}
            leftLabel="Trading"
            leftColor="text-slate-300"
            rightValue={metrics?.maxActiveDays != null ? String(Math.round(metrics.maxActiveDays)) : undefined}
            rightLabel="Active"
            rightColor="text-slate-400"
          />
        </div>
      </div>
    </motion.section>
  );
}
