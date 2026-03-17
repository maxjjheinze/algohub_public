"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AllocationEntry } from "../../../lib/analyticsData";

export function AccountAllocationDonut({
  data,
  colorMap,
  sym = "$",
  fx = 1,
}: {
  data: AllocationEntry[];
  colorMap: Map<string, string>;
  sym?: string;
  fx?: number;
}) {
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-xs">No data</div>;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="h-full flex items-center gap-3">
      <div className="flex-shrink-0" style={{ width: 180, height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {data.map((entry) => {
                const color = colorMap.get(entry.key) ?? "#3B82F6";
                return (
                  <filter key={`alloc-glow-${entry.key}`} id={`alloc-glow-${entry.key}`}>
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feFlood floodColor={color} floodOpacity="0.5" result="color" />
                    <feComposite in="color" in2="blur" operator="in" result="glow" />
                    <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                );
              })}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive
              animationDuration={3500}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={colorMap.get(entry.key) ?? "#3B82F6"} style={{ filter: `url(#alloc-glow-${entry.key})` }} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgba(6,8,14,0.96)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                fontSize: "8px",
                color: "#e2e8f0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                padding: "4px 8px",
              }}
              itemStyle={{ color: "#e2e8f0", fontSize: "8px", fontFamily: "monospace" }}
              formatter={(val: number, _: string, props: { payload?: AllocationEntry }) => [
                `${sym}${(val * fx).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (${((val / total) * 100).toFixed(0)}%)`,
                props.payload?.name ?? "",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-1.5 min-w-0 overflow-y-auto max-h-full">
        {data.map((entry) => {
          const pct = ((entry.value / total) * 100).toFixed(0);
          return (
            <div key={entry.key} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: colorMap.get(entry.key) ?? "#3B82F6",
                  boxShadow: `0 0 6px ${colorMap.get(entry.key) ?? "#3B82F6"}80`,
                }}
              />
              <div className="min-w-0">
                <div className="text-[0.55rem] text-slate-400 font-mono truncate">
                  {entry.name}
                </div>
                <div className="text-[0.5rem] text-slate-600 font-mono">
                  {pct}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
