"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useTransform, motion } from "framer-motion";

const DEFAULT_SPRING = { stiffness: 60, damping: 18 };

export function AnimatedNumber({
  value,
  format,
  springConfig,
  animate = true,
}: {
  value: number | undefined;
  format: (n: number) => string;
  springConfig?: { stiffness: number; damping: number };
  animate?: boolean;
}) {
  const spring = springConfig ?? DEFAULT_SPRING;
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, spring);
  const display = useTransform(springValue, (v) => format(v));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      motionValue.set(value);
    }
  }, [value, motionValue]);

  // Subscribe to display changes and update DOM directly
  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent = v;
      }
    });
    return unsubscribe;
  }, [display]);

  if (value === undefined) {
    return <span>---</span>;
  }

  if (!animate) {
    return <span>{format(value)}</span>;
  }

  return <motion.span ref={ref}>{format(0)}</motion.span>;
}
