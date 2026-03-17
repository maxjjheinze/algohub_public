"use client";

import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from "recharts";
import type { CumulativePnlPoint } from "../../../lib/analyticsData";

const fmtDate = (d: string) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const COLOR = "#F97316"; // Orange — distinct from other chart colors

export function CumulativePnlLine({
  data,
  sym = "$",
  fx = 1,
}: {
  data: CumulativePnlPoint[];
  sym?: string;
  fx?: number;
}) {
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-xs">No data</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id="cum-pnl-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COLOR} stopOpacity={0.03} />
          </linearGradient>
          <filter id="cum-pnl-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <CartesianGrid horizontal vertical={false} stroke="rgba(255,255,255,0.03)" />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          minTickGap={50}
          tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#475569", fontSize: 9, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(v: number) => {
            const d = v * fx;
            return `${sym}${Math.abs(d) >= 1000 ? `${(d / 1000).toFixed(1)}k` : d.toFixed(0)}`;
          }}
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
        <Tooltip
          contentStyle={{
            background: "rgba(6,8,14,0.96)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            fontSize: "10px",
            color: "#e2e8f0",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            padding: "6px 10px",
          }}
          labelFormatter={fmtDate}
          labelStyle={{ color: "#64748b", fontSize: "9px", fontFamily: "monospace" }}
          itemStyle={{ color: "#e2e8f0", fontSize: "10px", fontFamily: "monospace" }}
          formatter={(val: number) => {
            const d = val * fx;
            return [
              `${d >= 0 ? "+" : "-"}${sym}${Math.abs(d).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
              "Total P&L",
            ];
          }}
          cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }}
        />
        <Area
          type="monotoneX"
          dataKey="pnl"
          stroke={COLOR}
          strokeWidth={2}
          fill="url(#cum-pnl-grad)"
          style={{ filter: `drop-shadow(0 0 6px ${COLOR}90)` }}
          dot={false}
          isAnimationActive
          animationDuration={3000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
