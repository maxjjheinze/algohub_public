"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export function GlowButton({
  onClick,
  children,
  className
}: {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "fixed bottom-6 right-6 md:bottom-10 md:right-10 z-30",
        "h-14 w-14 rounded-2xl",
        "bg-gradient-to-br from-accent/90 to-accentMuted/80",
        "shadow-neon-strong",
        "flex items-center justify-center text-background",
        "hover:shadow-[0_0_30px_rgba(245,158,66,0.5),0_0_80px_rgba(245,158,66,0.15)]",
        "transition-shadow duration-500",
        "border border-accent/30",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
