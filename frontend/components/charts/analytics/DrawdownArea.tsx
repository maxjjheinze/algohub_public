"use client";

import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from "recharts";
import type { DrawdownPoint } from "../../../lib/analyticsData";

const fmtDate = (d: string) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function DrawdownArea({ data }: { data: DrawdownPoint[] }) {
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-xs">No data</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id="dd-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.45} />
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
          width={42}
          tickFormatter={(v: number) => `${v.toFixed(1)}%`}
        />
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
          formatter={(val: number) => [`${val.toFixed(2)}%`, "Drawdown"]}
          cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }}
        />
        <Area
          type="monotoneX"
          dataKey="drawdown"
          stroke="#EF4444"
          strokeWidth={1.5}
          fill="url(#dd-grad)"
          style={{ filter: "drop-shadow(0 0 6px rgba(239,68,68,0.5))" }}
          dot={false}
          isAnimationActive
          animationDuration={3000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
