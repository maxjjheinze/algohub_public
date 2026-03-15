"use client";

import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

interface PriceTicker {
  symbol: string;
  label: string;
  price: number;
  change24h: number;
  changePct: number;
}

function TickerTile({ ticker }: { ticker: PriceTicker }) {
  const isPositive = ticker.changePct >= 0;

  const formatPrice = (p: number) => {
    if (p > 100) return p.toFixed(2);
    if (p > 10) return p.toFixed(3);
    return p.toFixed(4);
  };

  return (
    <div className="glass-card p-3 flex flex-col justify-between h-[72px]">
      <div className="flex items-center justify-between">
        <span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-slate-400">
          {ticker.symbol}
        </span>
        <div
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            isPositive ? "bg-positive" : "bg-negative"
          )}
          style={{ boxShadow: `0 0 6px ${isPositive ? "#34D399" : "#F87171"}60` }}
        />
      </div>
      <div className="font-mono text-sm font-bold text-white tabular-nums">
        {formatPrice(ticker.price)}
      </div>
    </div>
  );
}

export function MarketTicker() {
  const [tickers, setTickers] = useState<PriceTicker[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/prices");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setTickers(data);
        }
      } catch {
        // silently fail — ticker is non-critical
      }
    }
    load();
    const id = setInterval(load, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(id);
  }, []);

  if (tickers.length === 0) return null;

  return (
    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
      {tickers.map(t => (
        <TickerTile key={t.symbol} ticker={t} />
      ))}
    </div>
  );
}
