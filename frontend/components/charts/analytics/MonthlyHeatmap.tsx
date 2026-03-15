"use client";

import { cn } from "../../../lib/utils";
import type { MonthlyPnlEntry } from "../../../lib/analyticsData";

function getBgStyle(pnl: number, maxAbs: number): string {
  if (maxAbs === 0) return "rgba(255,255,255,0.03)";
  const intensity = Math.min(Math.abs(pnl) / maxAbs, 1);
  if (pnl >= 0) {
    const alpha = 0.12 + intensity * 0.48;
    return `rgba(16, 185, 129, ${alpha})`;
  }
  const alpha = 0.12 + intensity * 0.48;
  return `rgba(239, 68, 68, ${alpha})`;
}

function getGlowStyle(pnl: number, maxAbs: number): string {
  if (maxAbs === 0) return "none";
  const intensity = Math.min(Math.abs(pnl) / maxAbs, 1);
  const glowAlpha = (0.1 + intensity * 0.35).toFixed(2);
  if (pnl >= 0) return `0 0 ${4 + intensity * 8}px rgba(16, 185, 129, ${glowAlpha})`;
  return `0 0 ${4 + intensity * 8}px rgba(239, 68, 68, ${glowAlpha})`;
}

export function MonthlyHeatmap({
  data,
  sym = "$",
  fx = 1,
}: {
  data: MonthlyPnlEntry[];
  sym?: string;
  fx?: number;
}) {
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-xs">No data</div>;

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.pnl)));

  const years = new Map<string, MonthlyPnlEntry[]>();
  for (const entry of data) {
    const year = entry.month.substring(0, 4);
    if (!years.has(year)) years.set(year, []);
    years.get(year)!.push(entry);
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto">
      {Array.from(years.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([year, entries]) => {
          const monthMap = new Map(entries.map((e) => [parseInt(e.month.substring(5, 7)) - 1, e]));
          return (
            <div key={year}>
              <div className="text-[0.5rem] font-mono text-slate-600 mb-1.5">{year}</div>
              <div className="grid grid-cols-6 gap-1">
                {MONTHS.map((m, i) => {
                  const entry = monthMap.get(i);
                  const displayPnl = entry ? entry.pnl * fx : 0;
                  return (
                    <div
                      key={m}
                      className="rounded-md text-center border border-white/[0.04] h-[44px] flex flex-col items-center justify-center"
                      style={{
                        backgroundColor: entry ? getBgStyle(entry.pnl, maxAbs) : "rgba(255,255,255,0.02)",
                        boxShadow: entry ? getGlowStyle(entry.pnl, maxAbs) : "none",
                      }}
                    >
                      <div className="text-[0.5rem] font-medium text-slate-300 leading-tight">{m}</div>
                      {entry && (
                        <div
                          className={cn(
                            "text-[0.55rem] font-mono font-semibold tabular-nums mt-0.5 leading-tight",
                            entry.pnl >= 0 ? "text-emerald-300" : "text-red-300"
                          )}
                        >
                          {displayPnl >= 0 ? "+" : ""}{sym}{Math.abs(displayPnl) >= 1000
                            ? `${(displayPnl / 1000).toFixed(1)}k`
                            : Math.round(displayPnl)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
