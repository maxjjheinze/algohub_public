"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PnlBin } from "../../../lib/analyticsData";

export function PnlDistributionHistogram({
  data,
}: {
  data: PnlBin[];
}) {
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-xs">No data</div>;

  // Labels use raw values — same bins apply to both AUD and USD
  const chartData = data.map((d) => ({
    ...d,
    displayRange: d.range,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <defs>
          <filter id="pnl-glow-green">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#34D399" floodOpacity="0.45" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="pnl-glow-red">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#EF4444" floodOpacity="0.45" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <CartesianGrid horizontal vertical={false} stroke="rgba(255,255,255,0.03)" />
        <XAxis
          dataKey="displayRange"
          tick={{ fill: "#64748b", fontSize: 7, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={36}
        />
        <YAxis
          tick={{ fill: "#475569", fontSize: 8, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          width={24}
          allowDecimals={false}
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
          labelStyle={{ color: "#64748b", fontSize: "9px", fontFamily: "monospace" }}
          itemStyle={{ color: "#e2e8f0", fontSize: "10px", fontFamily: "monospace" }}
          formatter={(val: number) => [`${val} days`, "Count"]}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="count" radius={[2, 2, 0, 0]} isAnimationActive animationDuration={3000}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.midpoint >= 0 ? "#34D399" : "#EF4444"} fillOpacity={0.85} style={{ filter: entry.midpoint >= 0 ? "url(#pnl-glow-green)" : "url(#pnl-glow-red)" }} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
