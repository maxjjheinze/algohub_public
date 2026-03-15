"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WaterfallEntry } from "../../../lib/analyticsData";

export function MonthlyWaterfall({
  data,
  sym = "$",
  fx = 1,
}: {
  data: WaterfallEntry[];
  sym?: string;
  fx?: number;
}) {
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-xs">No data</div>;

  const chartData = data.map((d) => ({
    month: new Date(d.month + "-01T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    base: d.isPositive ? d.start : d.end,
    value: Math.abs(d.pnl),
    pnl: d.pnl,
    isPositive: d.isPositive,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <defs>
          <filter id="wf-glow-khaki">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#D4A76A" floodOpacity="0.45" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="wf-glow-red">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#EF4444" floodOpacity="0.45" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <CartesianGrid horizontal vertical={false} stroke="rgba(255,255,255,0.03)" />
        <XAxis
          dataKey="month"
          tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#475569", fontSize: 9, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v: number) => {
            const d = v * fx;
            return `${sym}${Math.abs(d) >= 1000 ? `${(d / 1000).toFixed(1)}k` : d.toFixed(0)}`;
          }}
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
          itemStyle={{ color: "#e2e8f0", fontSize: "10px", fontFamily: "monospace" }}
          formatter={(_: unknown, name: string, props: { payload?: { pnl: number } }) => {
            if (name === "base") return [null, null];
            const pnl = (props.payload?.pnl ?? 0) * fx;
            return [
              `${pnl >= 0 ? "+" : "-"}${sym}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              "P&L",
            ];
          }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="value" stackId="waterfall" radius={[2, 2, 0, 0]} isAnimationActive animationDuration={3000}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.isPositive ? "#D4A76A" : "#EF4444"} fillOpacity={0.85} style={{ filter: entry.isPositive ? "url(#wf-glow-khaki)" : "url(#wf-glow-red)" }} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
