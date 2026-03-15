"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { motion } from "framer-motion";
import type { AccountCard } from "../../lib/types";

const tooltipStyle = {
  background: "rgba(6,8,14,0.96)",
  border: "1px solid rgba(245,158,66,0.15)",
  borderRadius: "10px",
  fontSize: "11px",
  color: "#e2e8f0",
  boxShadow: "0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(245,158,66,0.08)",
  padding: "8px 12px"
};

export function PnlChart({ accounts }: { accounts: AccountCard[] }) {
  const data = useMemo(() => {
    const dateMap = new Map<string, number>();
    for (const acc of accounts) {
      if (acc.series.length === 0) continue;
      const startBalance = acc.series[0].balance_usd;
      for (const pt of acc.series) {
        const pnl = pt.balance_usd - startBalance;
        dateMap.set(pt.date, (dateMap.get(pt.date) ?? 0) + pnl);
      }
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cumulative_pnl]) => ({
        date,
        cumulative_pnl: Math.round(cumulative_pnl * 100) / 100
      }));
  }, [accounts]);

  const latestPnl = data.length > 0 ? data[data.length - 1].cumulative_pnl : 0;
  const isPositive = latestPnl >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mb-8"
    >
      <Card>
        <CardHeader>
          <CardTitle>Cumulative P&L</CardTitle>
          {data.length > 0 && (
            <span className={`font-mono text-sm font-semibold tabular-nums ${isPositive ? "text-positive" : "text-negative"}`}>
              {isPositive ? "+" : "-"}${Math.abs(latestPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-[180px] md:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isPositive ? "#D4A843" : "#94A3B8"} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={isPositive ? "#D4A843" : "#94A3B8"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#64748b", fontSize: "10px", fontFamily: "monospace" }}
                  formatter={(val: number) => [
                    `${val >= 0 ? "+" : "-"}$${Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                    "P&L"
                  ]}
                  cursor={{ stroke: "rgba(245,158,66,0.12)", strokeWidth: 1 }}
                />
                <Area
                  type="natural"
                  dataKey="cumulative_pnl"
                  stroke={isPositive ? "#D4A843" : "#94A3B8"}
                  strokeWidth={2}
                  fill="url(#pnlFill)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "#0A0A0A",
                    stroke: isPositive ? "#D4A843" : "#94A3B8",
                    strokeWidth: 2
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
