"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { WinLossStats } from "../../../lib/analyticsData";

export function WinRateDonut({ stats }: { stats: WinLossStats }) {
  const { wins, losses, winRate } = stats;
  const total = wins + losses;

  if (total === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-xs">No trades</div>;

  const data = [
    { name: "Wins", value: wins },
    { name: "Losses", value: losses },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="relative" style={{ width: 130, height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <filter id="wr-glow-win">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feFlood floodColor="#E2E8F0" floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="wr-glow-loss">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feFlood floodColor="#EF4444" floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={58}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive
              animationDuration={3500}
            >
              <Cell fill="#E2E8F0" opacity={0.65} style={{ filter: "url(#wr-glow-win)" }} />
              <Cell fill="#EF4444" opacity={0.75} style={{ filter: "url(#wr-glow-loss)" }} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white tabular-nums">{(winRate * 100).toFixed(1)}%</span>
          <span className="text-[0.5rem] text-slate-500 uppercase tracking-wider">Win Rate</span>
        </div>
      </div>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-200" />
          <span className="text-[0.55rem] text-slate-400 font-mono">{wins}W</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500 opacity-70" />
          <span className="text-[0.55rem] text-slate-400 font-mono">{losses}L</span>
        </div>
      </div>
    </div>
  );
}
