"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DayOfWeekEntry } from "../../../lib/analyticsData";

export function DayOfWeekBar({
  data,
  sym = "$",
  fx = 1,
}: {
  data: DayOfWeekEntry[];
  sym?: string;
  fx?: number;
}) {
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-xs">No data</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <defs>
          <filter id="dow-glow-cyan">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#38BDF8" floodOpacity="0.4" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="dow-glow-yellow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#FACC15" floodOpacity="0.4" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <CartesianGrid horizontal={false} vertical stroke="rgba(255,255,255,0.03)" />
        <XAxis
          type="number"
          tick={{ fill: "#64748b", fontSize: 8, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${sym}${Math.round(v * fx)}`}
        />
        <YAxis
          type="category"
          dataKey="day"
          tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <ReferenceLine x={0} stroke="rgba(255,255,255,0.06)" />
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
          formatter={(val: number, _: string, props: { payload?: DayOfWeekEntry }) => [
            `Avg: ${sym}${(val * fx).toFixed(2)} | Total: ${sym}${((props.payload?.totalPnl ?? 0) * fx).toFixed(2)} (${props.payload?.count ?? 0} days)`,
            props.payload?.day ?? "",
          ]}
          labelStyle={{ display: "none" }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="avgPnl" radius={[0, 3, 3, 0]} isAnimationActive animationDuration={3000} style={{ filter: "url(#dow-glow-cyan)" }}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.avgPnl >= 0 ? "#38BDF8" : "#FACC15"} fillOpacity={0.85} style={{ filter: entry.avgPnl >= 0 ? "url(#dow-glow-cyan)" : "url(#dow-glow-yellow)" }} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
