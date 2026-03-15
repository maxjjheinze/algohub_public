"use client";

import { useMemo } from "react";
import {
  Line, LineChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend
} from "recharts";
import type { BalanceStackedPoint } from "../../../lib/analyticsData";

const fmtDate = (d: string) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function BalanceStackedArea({
  data,
  accountKeys,
  colorMap,
  sym = "$",
  fx = 1,
}: {
  data: BalanceStackedPoint[];
  accountKeys: string[];
  colorMap: Map<string, string>;
  sym?: string;
  fx?: number;
}) {
  const fmtTick = (v: number) => {
    const d = v * fx;
    const abs = Math.abs(d);
    if (abs >= 1_000_000) return `${sym}${(d / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sym}${(d / 1_000).toFixed(1)}k`;
    return `${sym}${d.toFixed(0)}`;
  };

  const lines = useMemo(
    () =>
      accountKeys.map((key) => ({
        key,
        color: colorMap.get(key) ?? "#3B82F6",
        label: key.replace(/-/g, " "),
      })),
    [accountKeys, colorMap]
  );

  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-xs">No data</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
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
          tickFormatter={fmtTick}
          tick={{ fill: "#475569", fontSize: 9, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          width={52}
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
          formatter={(val: number, name: string) => [
            `${sym}${(val * fx).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            name.replace(/-/g, " "),
          ]}
          cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="line"
          iconSize={10}
          wrapperStyle={{ fontSize: "9px", fontFamily: "monospace", paddingBottom: "4px" }}
          formatter={(value: string) => (
            <span style={{ color: "#94a3b8" }}>
              {value.replace(/-/g, " ")}
            </span>
          )}
        />
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotoneX"
            dataKey={l.key}
            stroke={l.color}
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={3000}
            style={{ filter: `drop-shadow(0 0 6px ${l.color}90)` }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
