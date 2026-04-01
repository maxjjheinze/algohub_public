"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { RangePills } from "../hero/RangePills";
import { CurrencyToggle } from "../hero/CurrencyToggle";
import type { RangeKey } from "../../lib/apiClient";
import type { CurrencyKey } from "../../lib/types";
import { ANALYTICS_PALETTE } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { stopLenis, startLenis } from "../ui/SmoothScroll";
import type { AccountCard, CleanedRow } from "../../lib/types";

import {
  computePortfolioBalance,
  computeCumulativePnl,
  computeWinLossStats,
  computeMonthlyPnl,
  computeAccountAllocation,
  computeDrawdownSeries,
  computePnlDistribution,
  computeDayOfWeekPnl,
  computeMonthlyWaterfall,
  computeRollingWinRate,
  computeRollingExpectancy,
  computeCapitalFlows,
  computeMonthlyReturnPct,
} from "../../lib/analyticsData";

import { BalanceStackedArea } from "../charts/analytics/BalanceStackedArea";
import { CumulativePnlLine } from "../charts/analytics/EquityCurveLine";
import { WinRateDonut } from "../charts/analytics/WinRateDonut";
import { MonthlyHeatmap } from "../charts/analytics/MonthlyHeatmap";
import { AccountAllocationDonut } from "../charts/analytics/AccountAllocationDonut";
import { DrawdownArea } from "../charts/analytics/DrawdownArea";
import { PnlDistributionHistogram } from "../charts/analytics/PnlDistributionHistogram";
import { DayOfWeekBar } from "../charts/analytics/DayOfWeekBar";
import { MonthlyWaterfall } from "../charts/analytics/MonthlyWaterfall";
import { RollingWinRateLine } from "../charts/analytics/RollingWinRateLine";
import { RollingExpectancyLine } from "../charts/analytics/RollingExpectancyLine";
import { CapitalFlowTimeline } from "../charts/analytics/CapitalFlowTimeline";
import { MonthlyReturnPctBar } from "../charts/analytics/MonthlyReturnPctBar";

function ChartCard({
  title,
  span = 1,
  height = "h-[220px]",
  children,
}: {
  title: string;
  span?: 1 | 2 | 3;
  height?: string;
  children: React.ReactNode;
}) {
  const spanClass = span === 3 ? "col-span-3" : span === 2 ? "col-span-2" : "col-span-1";
  return (
    <div className={cn("rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 shadow-[0_0_12px_rgba(255,255,255,0.02)]", spanClass)}>
      <div className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
        {title}
      </div>
      <div className={height}>{children}</div>
    </div>
  );
}

export function PortfolioAnalyticsModal({
  open,
  onClose,
  accounts,
  cleanedRows,
  fxAudUsd,
}: {
  open: boolean;
  onClose: () => void;
  accounts: AccountCard[];
  cleanedRows: CleanedRow[];
  fxAudUsd: number;
}) {
  const [activeRange, setActiveRange] = useState<RangeKey>("all");
  const [currency, setCurrency] = useState<CurrencyKey>("USD");
  const [enabledAccounts, setEnabledAccounts] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Currency display values — data is always in USD, sym/fx convert for display
  const sym = currency === "USD" ? "$" : "A$";
  const fx = currency === "USD" ? 1 : 1 / fxAudUsd;

  // Initialize enabled accounts when modal opens
  useEffect(() => {
    if (open && accounts.length > 0) {
      setEnabledAccounts(new Set(accounts.map((a) => `${a.broker}-${a.account_number}`)));
    }
  }, [open, accounts]);

  // Lock scroll
  useEffect(() => {
    if (!open) return;
    stopLenis();
    document.body.style.overflow = "hidden";
    return () => {
      startLenis();
      document.body.style.overflow = "";
    };
  }, [open]);

  // Prevent wheel leaking
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !open) return;
    const handler = (e: WheelEvent) => e.stopPropagation();
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [open]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const toggleAccount = useCallback((key: string) => {
    setEnabledAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Build stable color map
  const accountColorMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((acc, i) => {
      map.set(`${acc.broker}-${acc.account_number}`, ANALYTICS_PALETTE[i % ANALYTICS_PALETTE.length]);
    });
    return map;
  }, [accounts]);

  const accountKeys = useMemo(
    () => accounts
      .filter((a) => enabledAccounts.has(`${a.broker}-${a.account_number}`))
      .map((a) => `${a.broker}-${a.account_number}`),
    [accounts, enabledAccounts]
  );

  // Compute all chart data
  const balanceData = useMemo(
    () => computePortfolioBalance(accounts, enabledAccounts, activeRange),
    [accounts, enabledAccounts, activeRange]
  );

  const cumulativePnlData = useMemo(
    () => computeCumulativePnl(cleanedRows, enabledAccounts, fxAudUsd, activeRange),
    [cleanedRows, enabledAccounts, fxAudUsd, activeRange]
  );

  const winLossStats = useMemo(
    () => computeWinLossStats(cleanedRows, enabledAccounts, activeRange),
    [cleanedRows, enabledAccounts, activeRange]
  );

  const monthlyPnl = useMemo(
    () => computeMonthlyPnl(cleanedRows, enabledAccounts, fxAudUsd, activeRange),
    [cleanedRows, enabledAccounts, fxAudUsd, activeRange]
  );

  const allocation = useMemo(
    () => computeAccountAllocation(accounts, enabledAccounts),
    [accounts, enabledAccounts]
  );

  const drawdownData = useMemo(
    () => computeDrawdownSeries(balanceData, accountKeys, accounts),
    [balanceData, accountKeys, accounts]
  );

  const pnlDist = useMemo(
    () => computePnlDistribution(cleanedRows, enabledAccounts, fxAudUsd, activeRange),
    [cleanedRows, enabledAccounts, fxAudUsd, activeRange]
  );

  const dowPnl = useMemo(
    () => computeDayOfWeekPnl(cleanedRows, enabledAccounts, fxAudUsd, activeRange),
    [cleanedRows, enabledAccounts, fxAudUsd, activeRange]
  );

  const waterfall = useMemo(
    () => computeMonthlyWaterfall(cleanedRows, enabledAccounts, fxAudUsd, activeRange),
    [cleanedRows, enabledAccounts, fxAudUsd, activeRange]
  );

  const rollingWR = useMemo(
    () => computeRollingWinRate(cleanedRows, enabledAccounts, 30, activeRange),
    [cleanedRows, enabledAccounts, activeRange]
  );

  const rollingExpect = useMemo(
    () => computeRollingExpectancy(cleanedRows, enabledAccounts, fxAudUsd, 30, activeRange),
    [cleanedRows, enabledAccounts, fxAudUsd, activeRange]
  );

  const capitalFlows = useMemo(
    () => computeCapitalFlows(cleanedRows, enabledAccounts, fxAudUsd, activeRange),
    [cleanedRows, enabledAccounts, fxAudUsd, activeRange]
  );

  const monthlyReturnPct = useMemo(
    () => computeMonthlyReturnPct(accounts, enabledAccounts, activeRange, cleanedRows, fxAudUsd),
    [accounts, enabledAccounts, activeRange, cleanedRows, fxAudUsd]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="portfolio-analytics-backdrop"
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
            className="w-full max-w-7xl max-h-[90vh] rounded-2xl bg-surfaceSolid border border-white/[0.06] shadow-neon-soft flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/[0.04] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-accent/60" />
                <h2 className="text-[0.75rem] font-bold uppercase tracking-[0.2em] text-slate-300">
                  Portfolio Analytics
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <CurrencyToggle value={currency} onChange={setCurrency} id="analytics-currency" />
                <RangePills value={activeRange} onChange={setActiveRange} />
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-slate-300 transition-all duration-200 border border-white/[0.04]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Account Filter Bar */}
            <div className="px-5 md:px-6 py-3 border-b border-white/[0.04] flex-shrink-0 overflow-x-auto">
              <div className="flex gap-1.5 flex-wrap">
                {accounts.map((acc) => {
                  const key = `${acc.broker}-${acc.account_number}`;
                  const color = accountColorMap.get(key) ?? "#3B82F6";
                  const active = enabledAccounts.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleAccount(key)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.55rem] font-semibold uppercase tracking-[0.12em] transition-all duration-200 border",
                        active
                          ? "border-white/[0.1] text-slate-300"
                          : "border-white/[0.03] text-slate-600 opacity-50"
                      )}
                      style={{
                        backgroundColor: active ? `${color}15` : "transparent",
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 transition-opacity"
                        style={{
                          backgroundColor: color,
                          opacity: active ? 1 : 0.3,
                          boxShadow: active ? `0 0 6px ${color}40` : "none",
                        }}
                      />
                      {acc.broker} #{acc.account_number}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chart Grid */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 md:p-6" style={{ overscrollBehavior: "contain" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeRange}-${[...enabledAccounts].sort().join(",")}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3"
                >
                  {/* Row 1: Portfolio Balance [span-3] */}
                  <ChartCard title="Portfolio Balance" span={3} height="h-[260px]">
                    <BalanceStackedArea data={balanceData} accountKeys={accountKeys} colorMap={accountColorMap} sym={sym} fx={fx} />
                  </ChartCard>

                  {/* Row 2: Equity Curve [span-2] + Win Rate [span-1] */}
                  <ChartCard title="Cumulative P&L" span={2}>
                    <CumulativePnlLine data={cumulativePnlData} sym={sym} fx={fx} />
                  </ChartCard>
                  <ChartCard title="Win Rate">
                    <WinRateDonut stats={winLossStats} />
                  </ChartCard>

                  {/* Row 3: Monthly Heatmap [span-2] + Allocation [span-1] */}
                  <ChartCard title="Monthly P&L Heatmap" span={2} height="h-[240px]">
                    <MonthlyHeatmap data={monthlyPnl} sym={sym} fx={fx} />
                  </ChartCard>
                  <ChartCard title="Account Allocation">
                    <AccountAllocationDonut data={allocation} colorMap={accountColorMap} sym={sym} fx={fx} />
                  </ChartCard>

                  {/* Row 4: Drawdown [span-2] + Distribution [span-1] */}
                  <ChartCard title="Drawdown" span={2}>
                    <DrawdownArea data={drawdownData} />
                  </ChartCard>
                  <ChartCard title="P&L Distribution">
                    <PnlDistributionHistogram data={pnlDist} />
                  </ChartCard>

                  {/* Row 5: Day of Week [span-1] + Waterfall [span-2] */}
                  <ChartCard title="Avg P&L by Day of Week">
                    <DayOfWeekBar data={dowPnl} sym={sym} fx={fx} />
                  </ChartCard>
                  <ChartCard title="Monthly P&L Waterfall" span={2}>
                    <MonthlyWaterfall data={waterfall} sym={sym} fx={fx} />
                  </ChartCard>

                  {/* Row 6: Monthly Return % [span-2] + Capital Flows [span-1] */}
                  <ChartCard title="Monthly Return %" span={2}>
                    <MonthlyReturnPctBar data={monthlyReturnPct} />
                  </ChartCard>
                  <ChartCard title="Capital Flows">
                    <CapitalFlowTimeline data={capitalFlows} sym={sym} fx={fx} />
                  </ChartCard>

                  {/* Row 7: Rolling Win Rate [span-3] */}
                  <ChartCard title="Rolling Win Rate (30d)" span={3}>
                    <RollingWinRateLine data={rollingWR} />
                  </ChartCard>

                  {/* Row 8: Rolling Expectancy [span-3] */}
                  <ChartCard title="Rolling Expectancy (30d)" span={3}>
                    <RollingExpectancyLine data={rollingExpect} sym={sym} fx={fx} />
                  </ChartCard>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
