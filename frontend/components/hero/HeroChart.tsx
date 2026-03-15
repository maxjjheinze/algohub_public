"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DepositWithdrawalEvent, HeroSeriesPoint } from "../../lib/types";
import type { RangeKey } from "../../lib/apiClient";

const tooltipStyle = {
  background: "rgba(6,8,14,0.96)",
  border: "1px solid rgba(245,158,66,0.15)",
  borderRadius: "10px",
  fontSize: "11px",
  color: "#e2e8f0",
  boxShadow: "0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(245,158,66,0.08)",
  padding: "8px 12px"
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatXTick(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: HeroSeriesPoint & { eventAmount?: number } }>;
  label?: string;
  eventMap: Map<string, number>;
}

function CustomTooltip({ active, payload, label, eventMap }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || !label) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  const eventAmount = eventMap.get(label);

  return (
    <div style={tooltipStyle}>
      <div style={{ color: "#64748b", fontSize: "10px", fontFamily: "monospace", marginBottom: 4 }}>
        {formatDateLabel(label)}
      </div>
      <div style={{ color: "#e2e8f0", fontSize: "12px", fontWeight: 600 }}>
        ${pt.total_balance_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        <span style={{ color: "#64748b", fontWeight: 400, marginLeft: 6 }}>Balance</span>
      </div>
      {eventAmount != null && (
        <div style={{ marginTop: 4, fontSize: "11px", color: eventAmount > 0 ? "#FFFFFF" : "#94A3B8" }}>
          {eventAmount > 0 ? "Deposit" : "Withdrawal"}: {eventAmount > 0 ? "+" : "-"}${Math.abs(eventAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
}

function formatYTick(value: number, currencySymbol: string): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${currencySymbol}${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${currencySymbol}${(value / 1_000).toFixed(1)}k`;
  return `${currencySymbol}${value.toFixed(0)}`;
}

const SHORT_RANGES = new Set<RangeKey>(["3d", "7d", "14d"]);

export function HeroChart({ data, events, range, currencySymbol }: { data: HeroSeriesPoint[]; events: DepositWithdrawalEvent[]; range: RangeKey; currencySymbol: string }) {
  // Dynamic Y-axis domain: zoomed for short ranges, 0-based for long ranges
  const domain = useMemo(() => {
    if (data.length === 0) return [0, 1] as [number, number];
    const values = data.map(d => d.total_balance_usd);
    const max = Math.max(...values);
    const min = Math.min(...values);

    if (SHORT_RANGES.has(range)) {
      const valueRange = max - min;
      const padding = Math.max(valueRange * 0.1, max * 0.01);
      return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)] as [number, number];
    }

    const pad = (max || 1) * 0.03;
    return [0, max + pad] as [number, number];
  }, [data, range]);

  // Event map for tooltip
  const eventMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) m.set(e.date, e.amount);
    return m;
  }, [events]);

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 8 }}>
          <defs>
            <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E42" stopOpacity={0.35} />
              <stop offset="30%" stopColor="#F59E42" stopOpacity={0.12} />
              <stop offset="70%" stopColor="#D4882F" stopOpacity={0.04} />
              <stop offset="100%" stopColor="#0A0A0A" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="heroStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#D4882F" />
              <stop offset="50%" stopColor="#F59E42" />
              <stop offset="100%" stopColor="#D4882F" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid horizontal vertical={false} stroke="rgba(255,255,255,0.03)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatXTick}
            minTickGap={40}
            tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={domain}
            tickFormatter={(v: number) => formatYTick(v, currencySymbol)}
            tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={<CustomTooltip eventMap={eventMap} />}
            cursor={{ stroke: "rgba(245,158,66,0.15)", strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Area
            type="monotoneX"
            dataKey="total_balance_usd"
            stroke="url(#heroStroke)"
            strokeWidth={2.5}
            fill="url(#heroGradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "#0A0A0A",
              stroke: "#F59E42",
              strokeWidth: 2,
              filter: "url(#glow)"
            }}
            isAnimationActive
            animationDuration={400}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
