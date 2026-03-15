"use client";

import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from "recharts";
import type { RollingExpectancyPoint } from "../../../lib/analyticsData";

const fmtDate = (d: string) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function RollingExpectancyLine({
  data,
  sym = "$",
  fx = 1,
}: {
  data: RollingExpectancyPoint[];
  sym?: string;
  fx?: number;
}) {
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-xs">No data</div>;

  const lastVal = data[data.length - 1].expectancy * fx;
  const isPositive = lastVal >= 0;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id="expect-grad-pos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id="expect-grad-neg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#EF4444" stopOpacity={0.03} />
          </linearGradient>
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
          width={48}
          tickFormatter={(v: number) => `${sym}${(v * fx).toFixed(0)}`}
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
              `${d >= 0 ? "+" : "-"}${sym}${Math.abs(d).toFixed(2)}`,
              "Expectancy (30d)",
            ];
          }}
          cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }}
        />
        <Area
          type="monotoneX"
          dataKey="expectancy"
          stroke={isPositive ? "#06B6D4" : "#EF4444"}
          strokeWidth={2}
          fill={isPositive ? "url(#expect-grad-pos)" : "url(#expect-grad-neg)"}
          style={{ filter: `drop-shadow(0 0 6px ${isPositive ? "rgba(6,182,212,0.5)" : "rgba(239,68,68,0.5)"})` }}
          dot={false}
          isAnimationActive
          animationDuration={3000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
