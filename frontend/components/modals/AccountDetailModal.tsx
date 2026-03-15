"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, TrendingUp, Percent, Wallet, Target,
  ArrowUpRight, Activity, Calendar, Clock, Flame, Zap, BarChart3
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { RangePills } from "../hero/RangePills";
import { sliceByRange, type RangeKey } from "../../lib/apiClient";
import { INACTIVE_ACCOUNTS } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { stopLenis, startLenis } from "../ui/SmoothScroll";
import type { AccountCard, CleanedRow, StatsRow } from "../../lib/types";

const RANGE_DAYS: Record<string, number> = { "3d": 3, "7d": 7, "14d": 14, "1m": 30, "3m": 90 };

function formatYTick(value: number, currencySymbol: string): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${currencySymbol}${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${currencySymbol}${(value / 1_000).toFixed(1)}k`;
  return `${currencySymbol}${value.toFixed(0)}`;
}

function MetricBox({
  label,
  value,
  prefix,
  suffix,
  colored,
  icon,
  muted,
}: {
  label: string;
  value: number | string | undefined;
  prefix?: string;
  suffix?: string;
  colored?: boolean;
  icon: React.ReactNode;
  muted?: boolean;
}) {
  const numVal = typeof value === "number" ? value : undefined;
  const formatted =
    value === undefined
      ? "---"
      : typeof value === "string"
        ? value
        : `${prefix ?? ""}${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix ?? ""}`;
  const isPositive = numVal === undefined || numVal >= 0;
  const colorClass =
    colored && numVal !== undefined
      ? isPositive ? "text-positive" : "text-negative"
      : muted ? "text-slate-400" : "text-slate-100";
  const iconBg =
    colored && numVal !== undefined
      ? isPositive ? "bg-positiveSoft" : "bg-negativeSoft"
      : "bg-white/[0.03]";

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-2">
      <div className={cn("h-5 w-5 rounded-md flex items-center justify-center mb-1", iconBg)}>
        {icon}
      </div>
      <div className="text-[0.5rem] uppercase tracking-[0.16em] text-slate-600 font-medium">{label}</div>
      <div className={cn("font-mono text-[0.7rem] font-semibold tabular-nums mt-0.5", colorClass)}>
        {colored && numVal !== undefined ? (isPositive ? "+" : "-") : ""}{formatted}
      </div>
    </div>
  );
}

function SplitMetricBox({
  label,
  leftLabel,
  rightLabel,
  leftValue,
  rightValue,
  leftPrefix,
  rightPrefix,
  leftSuffix,
  rightSuffix,
  leftColored,
  rightColored,
  icon,
  className,
  muted,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  leftValue: number | string | undefined;
  rightValue: number | string | undefined;
  leftPrefix?: string;
  rightPrefix?: string;
  leftSuffix?: string;
  rightSuffix?: string;
  leftColored?: boolean;
  rightColored?: boolean;
  icon: React.ReactNode;
  className?: string;
  muted?: boolean;
}) {
  const fmtSide = (v: number | string | undefined, pre?: string, suf?: string, clr?: boolean) => {
    if (v === undefined) return { text: "---", cls: muted ? "text-slate-400" : "text-slate-100" };
    if (typeof v === "string") return { text: v, cls: muted ? "text-slate-400" : "text-slate-100" };
    const abs = Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sign = clr ? (v >= 0 ? "+" : "-") : "";
    const cls = clr ? (v >= 0 ? "text-positive" : "text-negative") : muted ? "text-slate-400" : "text-slate-100";
    return { text: `${sign}${pre ?? ""}${abs}${suf ?? ""}`, cls };
  };

  const left = fmtSide(leftValue, leftPrefix, leftSuffix, leftColored);
  const right = fmtSide(rightValue, rightPrefix, rightSuffix, rightColored);

  return (
    <div className={cn("rounded-xl bg-white/[0.03] border border-white/[0.04] p-2", className)}>
      <div className="flex items-center gap-1.5 mb-1">
        <div className="h-5 w-5 rounded-md bg-white/[0.03] flex items-center justify-center">
          {icon}
        </div>
        <div className="text-[0.5rem] uppercase tracking-[0.16em] text-slate-600 font-medium">{label}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[0.45rem] uppercase tracking-[0.14em] text-slate-700 mb-0.5">{leftLabel}</div>
          <div className={cn("font-mono text-[0.6rem] font-semibold tabular-nums truncate", left.cls)}>{left.text}</div>
        </div>
        <div className="w-px h-5 bg-white/[0.06]" />
        <div className="flex-1 min-w-0">
          <div className="text-[0.45rem] uppercase tracking-[0.14em] text-slate-700 mb-0.5">{rightLabel}</div>
          <div className={cn("font-mono text-[0.6rem] font-semibold tabular-nums truncate", right.cls)}>{right.text}</div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-2 text-[0.5rem] font-semibold uppercase tracking-[0.2em] text-slate-600 pt-2 pb-0.5">
      {children}
    </div>
  );
}

function DailyPnlChart({ rows, currencySymbol, accentColor }: { rows: CleanedRow[]; currencySymbol: string; accentColor: string }) {
  const data = useMemo(() => {
    return rows
      .filter(r => r.closed_pnl !== 0)
      .map(r => ({ date: r.date, pnl: r.closed_pnl }));
  }, [rows]);

  if (data.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
        Daily P&L
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid horizontal vertical={false} stroke="rgba(255,255,255,0.03)" />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => {
                const dt = new Date(d + "T00:00:00");
                return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              }}
              minTickGap={40}
              tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" />
            <Tooltip
              contentStyle={{
                background: "rgba(6,8,14,0.96)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "6px",
                fontSize: "9px",
                color: "#e2e8f0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                padding: "4px 8px"
              }}
              labelFormatter={(d: string) => {
                const dt = new Date(d + "T00:00:00");
                return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              }}
              labelStyle={{ color: "#64748b", fontSize: "8px", fontFamily: "monospace" }}
              itemStyle={{ color: "#e2e8f0", fontSize: "9px", fontFamily: "monospace" }}
              formatter={(val: number) => [
                `${val >= 0 ? "+" : "-"}${currencySymbol}${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                "P&L"
              ]}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              wrapperStyle={{ zIndex: 100 }}
            />
            <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.pnl >= 0 ? accentColor : "rgba(100,116,139,0.45)"}
                  fillOpacity={entry.pnl >= 0 ? 0.6 : 0.5}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MonthlyBreakdown({ rows, currencySymbol }: { rows: CleanedRow[]; currencySymbol: string }) {
  const months = useMemo(() => {
    const map = new Map<string, { pnl: number; wins: number; losses: number }>();
    for (const r of rows) {
      const month = r.date.substring(0, 7);
      const entry = map.get(month) || { pnl: 0, wins: 0, losses: 0 };
      entry.pnl += r.closed_pnl;
      if (r.win_loss === 1) entry.wins++;
      else if (r.win_loss === 0) entry.losses++;
      map.set(month, entry);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, data]) => ({ month, ...data }));
  }, [rows]);

  if (months.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
        Monthly Breakdown
      </div>
      <div className="space-y-1">
        {months.map(m => {
          const positive = m.pnl >= 0;
          const monthLabel = new Date(m.month + "-01T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
          return (
            <div key={m.month} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.02] border border-white/[0.03]">
              <span className="text-[0.6rem] text-slate-500 font-mono">{monthLabel}</span>
              <div className="flex items-center gap-3">
                <span className="text-[0.5rem] text-slate-600 font-mono">{m.wins}W / {m.losses}L</span>
                <span className={cn(
                  "text-[0.7rem] font-mono font-semibold tabular-nums min-w-[70px] text-right",
                  positive ? "text-positive" : "text-negative"
                )}>
                  {positive ? "+" : "-"}{currencySymbol}{Math.abs(m.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AccountDetailModal({
  account,
  onClose,
  color,
  stats,
  cleanedRows,
  fxAudUsd,
}: {
  account: AccountCard | null;
  onClose: () => void;
  color: string;
  stats: StatsRow | null;
  cleanedRows: CleanedRow[];
  fxAudUsd: number;
}) {
  const [modalRange, setModalRange] = useState<RangeKey>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Lock background scroll and pause Lenis when modal is open
  useEffect(() => {
    if (!account) return;
    stopLenis();
    document.body.style.overflow = "hidden";
    return () => { startLenis(); document.body.style.overflow = ""; };
  }, [account]);

  // Capture wheel events on the scroll container so they don't leak to the page
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !account) return;
    const handler = (e: WheelEvent) => {
      e.stopPropagation();
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [account]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const useNative = account ? account.base_currency !== "USD" && account.balance_native != null : false;
  const currencySymbol = account?.base_currency === "AUD" ? "A$" : "$";

  // Compute all metrics from cleanedRows filtered by account + range
  const computed = useMemo(() => {
    if (!account || cleanedRows.length === 0) return null;

    const accountRows = cleanedRows.filter(
      r => r.broker === account.broker && r.account_number === account.account_number
    );
    if (accountRows.length === 0) return null;

    const allDates = [...new Set(accountRows.map(r => r.date))].sort();
    const rangeDates = modalRange === "all"
      ? new Set(allDates)
      : new Set(allDates.slice(-(RANGE_DAYS[modalRange] ?? allDates.length)));
    const rangeRows = accountRows.filter(r => rangeDates.has(r.date));
    if (rangeRows.length === 0) return null;

    // Sort by date for sequential computations
    const sortedRows = [...rangeRows].sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate metrics
    let totalPnl = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let wins = 0;
    let losses = 0;
    let bestDay = -Infinity;
    let worstDay = Infinity;
    let winPnlSum = 0;
    let lossPnlSum = 0;

    for (const r of sortedRows) {
      totalPnl += r.closed_pnl;
      if (r.closed_pnl > 0) grossProfit += r.closed_pnl;
      else if (r.closed_pnl < 0) grossLoss += r.closed_pnl;

      if (r.win_loss === 1) {
        wins++;
        winPnlSum += r.closed_pnl;
      } else if (r.win_loss === 0) {
        losses++;
        lossPnlSum += r.closed_pnl;
      }

      if (r.closed_pnl !== 0) {
        if (r.closed_pnl > bestDay) bestDay = r.closed_pnl;
        if (r.closed_pnl < worstDay) worstDay = r.closed_pnl;
      }
    }

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? wins / totalTrades : undefined;
    const expectancy = totalTrades > 0 ? totalPnl / totalTrades : undefined;
    const avgWin = wins > 0 ? winPnlSum / wins : undefined;
    const avgLoss = losses > 0 ? lossPnlSum / losses : undefined;

    // Return % — use account-level net contributions as denominator
    const netContrib = account.base_currency !== "USD" && account.net_contributions_native != null
      ? account.net_contributions_native
      : account.net_contributions_usd;
    const returnPct = netContrib !== 0 ? totalPnl / netContrib : undefined;

    // Max drawdown from equity_curve
    let peak = 0;
    let maxDD = 0;

    for (const r of sortedRows) {
      if (r.equity_curve > peak) peak = r.equity_curve;
      if (peak > 0) {
        const dd = ((peak - r.equity_curve) / peak) * 100;
        if (dd > maxDD) maxDD = dd;
      }
    }

    // Max Win/Loss Streak
    let maxLossStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let currentWinStreak = 0;
    for (const r of sortedRows) {
      if (r.win_loss === 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      } else if (r.win_loss === 1) {
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      }
    }

    const tradingDays = sortedRows.filter(r => r.win_loss !== null).length;

    return {
      totalPnl,
      grossProfit,
      grossLoss,
      wins,
      losses,
      totalTrades,
      winRate,
      returnPct,
      expectancy,
      avgWin,
      avgLoss,
      bestDay: bestDay === -Infinity ? undefined : bestDay,
      worstDay: worstDay === Infinity ? undefined : worstDay,
      maxDrawdownPct: maxDD,
      maxLossStreak,
      maxWinStreak,
      tradingDays,
      sortedRows,
    };
  }, [account, cleanedRows, modalRange]);

  // Chart data from account.series
  const slicedSeries = useMemo(() => {
    if (!account) return [];
    return sliceByRange(account.series, modalRange);
  }, [account, modalRange]);

  const chartDomain = useMemo(() => {
    if (slicedSeries.length === 0) return undefined;
    const balances = slicedSeries.map(p =>
      useNative && p.balance_native != null ? p.balance_native : p.balance_usd
    );
    const max = Math.max(...balances);
    const min = Math.min(...balances);

    // Short ranges: zoom into data range; long ranges: 0-based (matches hero chart)
    if (modalRange === "3d" || modalRange === "7d" || modalRange === "14d") {
      const valueRange = max - min;
      const padding = Math.max(valueRange * 0.1, max * 0.01);
      return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)] as [number, number];
    }

    const pad = (max || 1) * 0.03;
    return [0, max + pad] as [number, number];
  }, [slicedSeries, useNative, modalRange]);

  const balanceKey = useNative ? "balance_native" : "balance_usd";
  const displayBalance = account ? (useNative ? account.balance_native! : account.balance_usd) : 0;
  const gradientId = account ? `modal-grad-${account.account_number}` : "modal-grad";
  const strokeId = account ? `modal-stroke-${account.account_number}` : "modal-stroke";

  const netContrib = account
    ? (account.base_currency !== "USD" && account.net_contributions_native != null
      ? account.net_contributions_native
      : account.net_contributions_usd)
    : 0;

  return (
    <AnimatePresence>
      {account && (
        <motion.div
          key={`${account.broker}-${account.account_number}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: "none" as const }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          onClick={handleBackdrop}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-5xl max-h-[85vh] rounded-2xl bg-surfaceSolid border border-white/[0.06] shadow-neon-soft flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                {(() => {
                  const isInactive = INACTIVE_ACCOUNTS.has(`${account.broker}-${account.account_number}`);
                  return (
                    <>
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color, boxShadow: isInactive ? "none" : `0 0 8px ${color}60` }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[0.7rem] font-semibold uppercase tracking-[0.15em]",
                            isInactive ? "text-slate-500" : "text-slate-300"
                          )}>
                            {account.broker}
                          </span>
                          {isInactive && (
                            <span className="text-[0.5rem] font-semibold uppercase tracking-[0.12em] text-slate-600 border border-slate-700 rounded px-1.5 py-0.5 leading-none">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-[0.6rem] font-mono text-slate-600 mt-0.5">
                          {account.platform} · {account.base_currency} · #{account.account_number}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-slate-300 transition-all duration-200 border border-white/[0.04]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 md:p-6" style={{ overscrollBehavior: "contain" }}>
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Charts */}
                <div className="flex-1 min-w-0">
                  {/* Balance value */}
                  <div className="mb-3">
                    <div className="text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1">
                      Account Balance
                    </div>
                    <div className="text-xl md:text-2xl text-white font-bold tabular-nums tracking-tight">
                      <span className="text-slate-500 font-normal">{currencySymbol}</span>
                      {displayBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Balance chart */}
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={slicedSeries} margin={{ top: 4, right: 4, bottom: 4, left: 8 }}>
                        <defs>
                          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                            <stop offset="30%" stopColor={color} stopOpacity={0.12} />
                            <stop offset="70%" stopColor={color} stopOpacity={0.04} />
                            <stop offset="100%" stopColor="#0A0A0A" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={color} stopOpacity={0.7} />
                            <stop offset="50%" stopColor={color} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                          </linearGradient>
                          <filter id="modalGlow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                              <feMergeNode in="coloredBlur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        <CartesianGrid horizontal vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(d: string) => {
                            const dt = new Date(d + "T00:00:00");
                            return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                          }}
                          minTickGap={40}
                          tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={chartDomain ?? ["dataMin", "dataMax"]}
                          tickFormatter={(v: number) => formatYTick(v, currencySymbol)}
                          tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace" }}
                          axisLine={false}
                          tickLine={false}
                          width={48}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(6,8,14,0.96)",
                            border: `1px solid ${color}26`,
                            borderRadius: "10px",
                            fontSize: "11px",
                            color: "#e2e8f0",
                            boxShadow: `0 8px 30px rgba(0,0,0,0.5), 0 0 20px ${color}14`,
                            padding: "8px 12px"
                          }}
                          labelFormatter={(d: string) => {
                            const dt = new Date(d + "T00:00:00");
                            return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
                          }}
                          labelStyle={{ color: "#64748b", fontSize: "10px", fontFamily: "monospace" }}
                          formatter={(val: number) => [
                            `${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                            "Balance"
                          ]}
                          cursor={{ stroke: `${color}26`, strokeWidth: 1, strokeDasharray: "4 4" }}
                        />
                        <Area
                          type="monotoneX"
                          dataKey={balanceKey}
                          stroke={`url(#${strokeId})`}
                          strokeWidth={2.5}
                          fill={`url(#${gradientId})`}
                          dot={false}
                          activeDot={{
                            r: 5,
                            fill: "#0A0A0A",
                            stroke: color,
                            strokeWidth: 2,
                            filter: "url(#modalGlow)"
                          }}
                          isAnimationActive
                          animationDuration={400}
                          animationEasing="ease-out"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4">
                    <RangePills value={modalRange} onChange={setModalRange} />
                  </div>

                  {/* Daily P&L bar chart */}
                  {computed && (
                    <DailyPnlChart rows={computed.sortedRows} currencySymbol={currencySymbol} accentColor={color} />
                  )}

                  {/* Monthly breakdown */}
                  {computed && (
                    <MonthlyBreakdown rows={computed.sortedRows} currencySymbol={currencySymbol} />
                  )}
                </div>

                {/* Right: Metrics sidebar */}
                <div className="lg:w-[340px] flex-shrink-0">
                  <div className="glass-card p-4 md:p-5">
                    <div className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
                      Statistics
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={modalRange}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="grid grid-cols-2 gap-2"
                      >
                        {/* Returns — headline P&L and risk */}
                        <SectionLabel>Returns</SectionLabel>
                        <MetricBox
                          label="Closed P&L"
                          value={computed?.totalPnl}
                          prefix={currencySymbol}
                          colored
                          icon={<TrendingUp className="h-3 w-3 text-slate-500" />}
                        />
                        <MetricBox
                          label="Return %"
                          value={computed?.returnPct != null ? computed.returnPct * 100 : undefined}
                          suffix="%"
                          colored
                          icon={<Percent className="h-3 w-3 text-slate-500" />}
                        />
                        <MetricBox
                          label="Max Drawdown"
                          value={computed ? -computed.maxDrawdownPct : undefined}
                          suffix="%"
                          colored
                          icon={<BarChart3 className="h-3 w-3 text-negative/50" />}
                        />
                        <MetricBox
                          label="Net Contributions"
                          value={netContrib}
                          prefix={currencySymbol}
                          icon={<Wallet className="h-3 w-3 text-slate-600" />}
                        />

                        {/* Trades — per-trade quality and sizing */}
                        <SectionLabel>Trades</SectionLabel>
                        <MetricBox
                          label="Win Rate"
                          value={computed?.winRate != null ? computed.winRate * 100 : undefined}
                          suffix="%"
                          icon={<Target className="h-3 w-3 text-accent/60" />}
                        />
                        <MetricBox
                          label="Expectancy"
                          value={computed?.expectancy}
                          prefix={currencySymbol}
                          colored
                          icon={<Zap className="h-3 w-3 text-slate-500" />}
                        />
                        <SplitMetricBox
                          label="Avg Win / Loss"
                          leftLabel="Win"
                          rightLabel="Loss"
                          leftValue={computed?.avgWin}
                          rightValue={computed?.avgLoss != null ? Math.abs(computed.avgLoss) : undefined}
                          leftPrefix={currencySymbol}
                          rightPrefix={currencySymbol}
                          icon={<ArrowUpRight className="h-3 w-3 text-positive/60" />}
                        />
                        <SplitMetricBox
                          label="Best / Worst Day"
                          leftLabel="Best"
                          rightLabel="Worst"
                          leftValue={computed?.bestDay}
                          rightValue={computed?.worstDay}
                          leftPrefix={currencySymbol}
                          rightPrefix={currencySymbol}
                          leftColored
                          rightColored
                          icon={<TrendingUp className="h-3 w-3 text-slate-500" />}
                        />

                        {/* Activity — volume, streaks, account info */}
                        <SectionLabel>Activity</SectionLabel>
                        <MetricBox
                          label="Wins / Losses"
                          value={computed ? `${computed.wins} / ${computed.losses}` : undefined}
                          icon={<Target className="h-3 w-3 text-slate-600" />}
                          muted
                        />
                        <MetricBox
                          label="Win/Loss Streak"
                          value={computed ? `${computed.maxWinStreak}W / ${computed.maxLossStreak}L` : undefined}
                          icon={<Flame className="h-3 w-3 text-accent/50" />}
                          muted
                        />
                        <SplitMetricBox
                          label="Gross P/L"
                          leftLabel="Profit"
                          rightLabel="Loss"
                          leftValue={computed?.grossProfit != null ? `${currencySymbol}${Math.round(computed.grossProfit).toLocaleString()}` : undefined}
                          rightValue={computed?.grossLoss != null ? `${currencySymbol}${Math.round(Math.abs(computed.grossLoss)).toLocaleString()}` : undefined}
                          icon={<ArrowUpRight className="h-3 w-3 text-positive/40" />}
                          muted
                        />
                        <MetricBox
                          label="Trading Days"
                          value={computed?.tradingDays != null ? String(computed.tradingDays) : undefined}
                          icon={<Clock className="h-3 w-3 text-slate-600" />}
                          muted
                        />
                        <MetricBox
                          label="Days Active"
                          value={String(account.days_active)}
                          icon={<Activity className="h-3 w-3 text-slate-600" />}
                          muted
                        />
                        <MetricBox
                          label="Since"
                          value={account.initiation_date}
                          icon={<Calendar className="h-3 w-3 text-slate-600" />}
                          muted
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
