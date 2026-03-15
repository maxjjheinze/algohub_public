import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("glass-card p-5 md:p-6", className)}>{children}</div>;
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex items-center justify-between mb-5", className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <h2 className={cn("text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500", className)}>
      {children}
    </h2>
  );
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn(className)}>{children}</div>;
}
