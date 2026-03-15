"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import type { MonthlyReturnPctEntry } from "../../../lib/analyticsData";

export function MonthlyReturnPctBar({ data }: { data: MonthlyReturnPctEntry[] }) {
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-xs">No data</div>;

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.returnPct)));

  const chartData = data.map((d) => ({
    month: new Date(d.month + "-01T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    returnPct: d.returnPct,
    intensity: maxAbs > 0 ? Math.abs(d.returnPct) / maxAbs : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <defs>
          <filter id="mr-glow-green">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#10B981" floodOpacity="0.45" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="mr-glow-red">
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
          width={40}
          tickFormatter={(v: number) => `${v.toFixed(1)}%`}
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" />
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
          formatter={(val: number) => [
            `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`,
            "Return",
          ]}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="returnPct" radius={[2, 2, 0, 0]} isAnimationActive animationDuration={3000}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.returnPct >= 0 ? "#10B981" : "#EF4444"} fillOpacity={0.35 + entry.intensity * 0.55} style={{ filter: entry.returnPct >= 0 ? "url(#mr-glow-green)" : "url(#mr-glow-red)" }} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
