"use client";

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { motion } from "framer-motion";
import { NEON_PALETTE } from "../../lib/constants";
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

export function ComparisonChart({
  accounts,
  selectedKeys,
  colorMap
}: {
  accounts: AccountCard[];
  selectedKeys: Set<string>;
  colorMap: Map<string, string>;
}) {
  const selectedAccounts = useMemo(
    () => accounts.filter(a => selectedKeys.has(`${a.broker}-${a.account_number}`)),
    [accounts, selectedKeys]
  );

  const data = useMemo(() => {
    if (selectedAccounts.length === 0) return [];
    const dateSet = new Set<string>();
    for (const acc of selectedAccounts) {
      for (const pt of acc.series) dateSet.add(pt.date);
    }
    const dates = Array.from(dateSet).sort();

    return dates.map(date => {
      const point: Record<string, number | string> = { date };
      for (const acc of selectedAccounts) {
        const key = `${acc.broker}-${acc.account_number}`;
        const seriesPoint = acc.series.find(p => p.date === date);
        const start = acc.series[0]?.balance_usd || 1;
        if (seriesPoint) {
          point[key] = Math.round(((seriesPoint.balance_usd - start) / start) * 10000) / 100;
        }
      }
      return point;
    });
  }, [selectedAccounts]);

  const isEmpty = selectedKeys.size === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mb-8"
    >
      <Card>
        <CardHeader>
          <CardTitle>Account Comparison</CardTitle>
          {!isEmpty && (
            <span className="text-[0.6rem] font-mono text-slate-600 tracking-wider">% CHANGE</span>
          )}
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <div className="h-[180px] md:h-[200px] flex flex-col items-center justify-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M2 14L6 8L10 11L16 4" stroke="rgba(148,163,184,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-[0.7rem] text-slate-600">
                Select accounts below to compare
              </p>
            </div>
          ) : (
            <div className="h-[180px] md:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: "#64748b", fontSize: "10px", fontFamily: "monospace" }}
                    formatter={(val: number, name: string) => {
                      const broker = name.split("-")[0];
                      return [`${val >= 0 ? "+" : ""}${val.toFixed(1)}%`, broker];
                    }}
                    cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }}
                  />
                  {selectedAccounts.map(acc => {
                    const key = `${acc.broker}-${acc.account_number}`;
                    const color = colorMap.get(key) || NEON_PALETTE[0];
                    return (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 4,
                          fill: "#0A0A0A",
                          stroke: color,
                          strokeWidth: 2
                        }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
