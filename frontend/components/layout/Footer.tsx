"use client";

import { motion } from "framer-motion";

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
      className="mt-12 mb-20"
    >
      <div className="scanline mb-6" />
      <div className="flex flex-col items-center gap-1.5">
        <div className="text-sm font-bold tracking-[0.12em] uppercase">
          <span className="text-slate-500">Algo</span>
          <span className="text-accent/60 ml-0.5">Hub</span>
        </div>
        <div className="text-slate-700 text-[0.5rem] uppercase tracking-[0.15em]">
          Algo trading analytics
        </div>
        <div className="font-mono text-[0.5rem] text-slate-700">
          v0.1.0
        </div>
      </div>
    </motion.footer>
  );
}
