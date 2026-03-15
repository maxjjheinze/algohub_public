import type { ReactNode } from "react";

export function SectionHeading({
  title,
  badge,
  action,
  right
}: {
  title: string;
  badge?: string;
  action?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-1 h-4 rounded-full bg-accent/60" />
        <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-slate-400">
          {title}
        </h2>
        {badge && (
          <span className="text-[0.6rem] rounded-md bg-white/[0.04] px-2 py-0.5 text-slate-600 font-mono tracking-wide">
            {badge}
          </span>
        )}
        {action}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
