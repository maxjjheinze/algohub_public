"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import type { CapitalFlowEntry } from "../../../lib/analyticsData";

const fmtMonth = (m: string) => {
  const dt = new Date(m + "-01T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};

export function CapitalFlowTimeline({
  data,
  sym = "$",
  fx = 1,
}: {
  data: CapitalFlowEntry[];
  sym?: string;
  fx?: number;
}) {
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-xs">No capital flows</div>;

  // Aggregate by month to eliminate sparse gaps between individual dates
  const monthMap = new Map<string, { deposit: number; withdrawal: number }>();
  for (const entry of data) {
    const month = entry.date.substring(0, 7); // "YYYY-MM"
    const existing = monthMap.get(month) ?? { deposit: 0, withdrawal: 0 };
    existing.deposit += entry.deposit;
    existing.withdrawal += entry.withdrawal;
    monthMap.set(month, existing);
  }

  const chartData = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { deposit, withdrawal }]) => ({
      month,
      deposit: Math.round(deposit * 100) / 100,
      withdrawal: Math.round(withdrawal * 100) / 100,
    }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <defs>
          <filter id="cf-glow-grey">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#CBD5E1" floodOpacity="0.35" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="cf-glow-red">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#EF4444" floodOpacity="0.45" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <CartesianGrid horizontal vertical={false} stroke="rgba(255,255,255,0.03)" />
        <XAxis
          dataKey="month"
          tickFormatter={fmtMonth}
          minTickGap={30}
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
            const abs = Math.abs(d);
            if (abs >= 1000) return `${sym}${(d / 1000).toFixed(1)}k`;
            return `${sym}${d.toFixed(0)}`;
          }}
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
          labelFormatter={(m: string) => {
            const dt = new Date(m + "-01T00:00:00");
            return dt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          }}
          labelStyle={{ color: "#64748b", fontSize: "9px", fontFamily: "monospace" }}
          itemStyle={{ color: "#e2e8f0", fontSize: "10px", fontFamily: "monospace" }}
          formatter={(val: number, name: string) => {
            const d = val * fx;
            return [
              `${d >= 0 ? "+" : "-"}${sym}${Math.abs(d).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              name === "deposit" ? "Deposit" : "Withdrawal",
            ];
          }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="deposit" radius={[2, 2, 0, 0]} isAnimationActive animationDuration={3000}>
          {chartData.map((_, i) => (
            <Cell key={`dep-${i}`} fill="#CBD5E1" fillOpacity={0.7} style={{ filter: "url(#cf-glow-grey)" }} />
          ))}
        </Bar>
        <Bar dataKey="withdrawal" radius={[0, 0, 2, 2]} isAnimationActive animationDuration={3000}>
          {chartData.map((_, i) => (
            <Cell key={`wdl-${i}`} fill="#EF4444" fillOpacity={0.8} style={{ filter: "url(#cf-glow-red)" }} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
