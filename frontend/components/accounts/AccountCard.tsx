"use client";

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { cn } from "../../lib/utils";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { INACTIVE_ACCOUNTS } from "../../lib/constants";
import type { AccountCard as AccountCardType, StatsRow } from "../../lib/types";

export function AccountCard({
  account,
  color,
  stats,
  onClick
}: {
  account: AccountCardType;
  color: string;
  stats: StatsRow | null;
  onClick?: () => void;
}) {
  const inactive = INACTIVE_ACCOUNTS.has(`${account.broker}-${account.account_number}`);
  const useNative = account.base_currency !== "USD" && account.balance_native != null;
  const displayBalance = useNative ? account.balance_native! : account.balance_usd;
  const displayPnl = useNative ? (account.closed_pnl_native ?? account.closed_pnl_usd) : account.closed_pnl_usd;
  const pnlPositive = displayPnl >= 0;
  const gainPositive = account.percent_gain >= 0;
  const currencySymbol = account.base_currency === "AUD" ? "A$" : "$";
  const sparkDataKey = useNative ? "balance_native" : "balance_usd";

  return (
    <div
      className="glass-card p-4 md:p-5 transition-all duration-300 hover:border-white/[0.1] hover:shadow-card-hover cursor-pointer"
      onClick={onClick}
    >
      {/* Top row: broker + account */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: color, boxShadow: inactive ? "none" : `0 0 4px ${color}40` }}
            />
            <span className={cn(
              "text-[0.7rem] font-semibold uppercase tracking-[0.1em] truncate",
              inactive ? "text-slate-500" : "text-slate-300"
            )}>
              {account.broker}
            </span>
            {inactive && (
              <span className="text-[0.5rem] font-semibold uppercase tracking-[0.12em] text-slate-600 border border-slate-700 rounded px-1.5 py-0.5 leading-none flex-shrink-0">
                Inactive
              </span>
            )}
          </div>
          <div className="text-[0.6rem] text-slate-600 font-mono tracking-wide ml-4">
            {account.platform} · {account.base_currency} · #{account.account_number}
          </div>
        </div>
      </div>

      {/* Balance + P&L */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.15em] text-slate-600 font-medium mb-1">Balance</div>
          <div className="text-xl font-bold text-white tabular-nums tracking-tight">
            <span className="text-slate-500 text-sm font-normal">{currencySymbol}</span>
            <AnimatedNumber
              value={displayBalance}
              format={(n) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              springConfig={{ stiffness: 65, damping: 18 }}
            />
          </div>
        </div>
        <div className="text-right">
          <div
            className={cn(
              "font-mono text-sm font-semibold tabular-nums",
              pnlPositive ? "text-positive" : "text-negative"
            )}
          >
            {pnlPositive ? "+" : "-"}{currencySymbol}<AnimatedNumber
              value={Math.abs(displayPnl)}
              format={(n) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              springConfig={{ stiffness: 65, damping: 18 }}
            />
          </div>
          <div
            className={cn(
              "font-mono text-xs tabular-nums",
              gainPositive ? "text-positive/70" : "text-negative/70"
            )}
          >
            {gainPositive ? "+" : ""}{(account.percent_gain * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Activity info */}
      <div className="flex gap-3 text-[0.55rem] text-slate-600 font-mono tracking-wide mb-3">
        <span>{account.initiation_date}</span>
        <span className="text-white/[0.06]">|</span>
        {stats?.cumulative_trading_days != null && (
          <>
            <span>{stats.cumulative_trading_days} TD</span>
            <span className="text-white/[0.06]">|</span>
          </>
        )}
        <span>{account.days_active} AD</span>
      </div>

      {/* Sparkline */}
      <div className="h-24 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={account.series} className="sparkline">
            <defs>
              <linearGradient id={`spark-${account.account_number}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis hide domain={["dataMin", "dataMax"]} padding={{ top: 8, bottom: 8 }} />
            <Area
              type="natural"
              dataKey={sparkDataKey}
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#spark-${account.account_number})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
