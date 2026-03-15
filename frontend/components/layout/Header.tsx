"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Eye } from "lucide-react";

export function Header({ views }: { views: number | null }) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = useMemo(
    () =>
      now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric"
      }),
    [now]
  );

  const timeStr = useMemo(
    () =>
      now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }),
    [now]
  );

  return (
    <header className="mb-10 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
          className="relative"
        >
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/20">
            <Activity className="h-5 w-5 text-accent" />
          </div>
          <div className="absolute -inset-1 rounded-xl bg-accent/10 blur-lg -z-10 animate-glow-breathe" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="text-xl md:text-2xl font-bold tracking-[0.12em] uppercase text-white">
            Algo
            <span className="text-accent ml-0.5">Hub</span>
          </h1>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex items-center gap-5 text-xs text-slate-400"
      >
        <div className="text-right hidden sm:block">
          <div className="text-[0.85rem] font-medium text-slate-300 tracking-wide">{dateStr}</div>
          <div className="font-mono text-[0.8rem] text-slate-600 tabular-nums">{timeStr}</div>
        </div>
        <div className="h-9 w-px bg-gradient-to-b from-transparent via-accent/20 to-transparent hidden sm:block" />
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-slate-600" />
          <div className="font-mono text-sm tabular-nums text-accent/80">
            {views !== null ? views.toLocaleString() : "---"}
          </div>
        </div>
      </motion.div>
    </header>
  );
}
