"use client";

import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { RANGE_PILLS } from "../../lib/constants";
import type { RangeKey } from "../../lib/apiClient";

export function RangePills({
  value,
  onChange
}: {
  value: RangeKey;
  onChange: (key: RangeKey) => void;
}) {
  return (
    <div className="relative inline-flex gap-0.5 rounded-lg bg-white/[0.03] p-0.5 border border-white/[0.04]">
      {RANGE_PILLS.map(p => (
        <button
          key={p.key}
          className={cn(
            "relative z-10 px-3 py-1.5 rounded-md text-[0.6rem] font-bold uppercase tracking-[0.14em] transition-colors duration-200",
            value === p.key
              ? "text-accent"
              : "text-slate-600 hover:text-slate-400"
          )}
          onClick={() => onChange(p.key)}
        >
          {value === p.key && (
            <motion.div
              layoutId="range-pill-indicator"
              className="absolute inset-0 rounded-md bg-accent/[0.08] border border-accent/20"
              style={{ boxShadow: "0 0 20px rgba(245,158,66,0.08)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative">{p.label}</span>
        </button>
      ))}
    </div>
  );
}
