"use client";

import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import type { CurrencyKey } from "../../lib/types";

const options: CurrencyKey[] = ["USD", "AUD"];

export function CurrencyToggle({
  value,
  onChange,
  id = "currency-indicator"
}: {
  value: CurrencyKey;
  onChange: (key: CurrencyKey) => void;
  id?: string;
}) {
  return (
    <div className="relative inline-flex rounded-lg bg-white/[0.03] p-0.5 border border-white/[0.04]">
      {options.map(key => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "relative z-10 px-4 py-1.5 rounded-md text-[0.65rem] font-bold uppercase tracking-[0.18em] transition-colors duration-200",
            value === key
              ? "text-accent"
              : "text-slate-600 hover:text-slate-400"
          )}
        >
          {value === key && (
            <motion.div
              layoutId={id}
              className="absolute inset-0 rounded-md bg-accent/[0.08] border border-accent/20"
              style={{ boxShadow: "0 0 20px rgba(245,158,66,0.08)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative">{key}</span>
        </button>
      ))}
    </div>
  );
}
