"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Database, Minus, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { stopLenis, startLenis } from "../ui/SmoothScroll";
import type { RawRow, CleanedRow, StatsRow } from "../../lib/types";

type TabKey = "raw" | "cleaned" | "stats";
type SortDir = "asc" | "desc";

const TABS: { key: TabKey; label: string }[] = [
  { key: "raw", label: "Raw" },
  { key: "cleaned", label: "Cleaned" },
  { key: "stats", label: "Stats" },
];

const ZOOM_LEVELS = [20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
const DEFAULT_ZOOM = 100;

function sortRows(
  rows: Record<string, unknown>[],
  col: string | null,
  dir: SortDir
): Record<string, unknown>[] {
  if (!col) return rows;
  return [...rows].sort((a, b) => {
    const av = a[col];
    const bv = b[col];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") {
      return dir === "asc" ? av - bv : bv - av;
    }
    const as = String(av);
    const bs = String(bv);
    return dir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
  });
}

function DataTable({
  rows,
  zoom,
  sortCol,
  sortDir,
  onSort,
}: {
  rows: Record<string, unknown>[];
  zoom: number;
  sortCol: string | null;
  sortDir: SortDir;
  onSort: (col: string) => void;
}) {
  const columns = useMemo(() => {
    const keys = new Set<string>();
    rows.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [rows]);

  const sorted = useMemo(
    () => sortRows(rows, sortCol, sortDir),
    [rows, sortCol, sortDir]
  );

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="text-[0.7rem] text-slate-600 font-mono">
          No data available
        </span>
      </div>
    );
  }

  return (
    <div style={{ zoom: zoom / 100 }}>
      <table className="border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-surfaceSolid">
            {columns.map((col) => (
              <th
                key={col}
                onClick={() => onSort(col)}
                className="px-2 py-2 text-left text-[0.6rem] font-bold uppercase tracking-[0.12em] text-slate-500 border-b border-white/[0.06] whitespace-nowrap select-none hover:text-slate-300 transition-colors bg-surfaceSolid"
                style={{ cursor: "pointer" }}
              >
                <span className="inline-flex items-center gap-0.5">
                  {col}
                  {sortCol === col && (
                    sortDir === "asc"
                      ? <ArrowUp className="inline" style={{ width: "0.85em", height: "0.85em" }} />
                      : <ArrowDown className="inline" style={{ width: "0.85em", height: "0.85em" }} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col}
                  className="px-2 py-1.5 text-[0.7rem] font-mono text-slate-400 whitespace-nowrap tabular-nums"
                >
                  {row[col] !== null && row[col] !== undefined ? (
                    String(row[col])
                  ) : (
                    <span className="text-slate-700">&mdash;</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RawDataModal({
  open,
  onClose,
  rows,
  cleanedRows,
  statsRows,
}: {
  open: boolean;
  onClose: () => void;
  rows: RawRow[];
  cleanedRows: CleanedRow[];
  statsRows: StatsRow[];
}) {
  const [tab, setTab] = useState<TabKey>("raw");
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pause Lenis and lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      stopLenis();
      document.body.style.overflow = "hidden";
    } else {
      startLenis();
      document.body.style.overflow = "";
    }
    return () => {
      startLenis();
      document.body.style.overflow = "";
    };
  }, [open]);

  // Capture wheel events on the scroll container so they don't leak to the page
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !open) return;
    const handler = (e: WheelEvent) => {
      e.stopPropagation();
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [open]);

  const activeRows = useMemo(() => {
    switch (tab) {
      case "raw":
        return rows as Record<string, unknown>[];
      case "cleaned":
        return cleanedRows as unknown as Record<string, unknown>[];
      case "stats":
        return statsRows as unknown as Record<string, unknown>[];
    }
  }, [tab, rows, cleanedRows, statsRows]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    activeRows.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [activeRows]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const handleTabChange = useCallback((key: TabKey) => {
    setTab(key);
    setSortCol(null);
    setSortDir("asc");
  }, []);

  const handleSort = useCallback(
    (col: string) => {
      if (sortCol === col) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortCol(col);
        setSortDir("asc");
      }
    },
    [sortCol]
  );

  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const idx = ZOOM_LEVELS.indexOf(z);
      return idx < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[idx + 1] : z;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const idx = ZOOM_LEVELS.indexOf(z);
      return idx > 0 ? ZOOM_LEVELS[idx - 1] : z;
    });
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          onClick={handleBackdrop}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-6xl rounded-2xl bg-surfaceSolid border border-white/[0.06] shadow-neon-soft flex flex-col"
            style={{ height: "85vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/[0.04] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-accent/[0.08] border border-accent/10 flex items-center justify-center">
                  <Database className="h-4 w-4 text-accent/60" />
                </div>
                <div>
                  <div className="text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-slate-300">
                    Data Explorer
                  </div>
                  <div className="text-[0.6rem] font-mono text-slate-600 mt-0.5">
                    {activeRows.length} rows &middot; {columns.length} fields
                  </div>
                </div>
                {/* Zoom controls */}
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={zoomOut}
                    disabled={zoom === ZOOM_LEVELS[0]}
                    className="h-6 w-6 rounded-md bg-white/[0.03] hover:bg-white/[0.06] disabled:opacity-30 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-all border border-white/[0.04]"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-[0.55rem] font-mono text-slate-600 w-8 text-center tabular-nums">
                    {zoom}%
                  </span>
                  <button
                    onClick={zoomIn}
                    disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                    className="h-6 w-6 rounded-md bg-white/[0.03] hover:bg-white/[0.06] disabled:opacity-30 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-all border border-white/[0.04]"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-slate-300 transition-all duration-200 border border-white/[0.04]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-5 md:px-6 pt-3 pb-2 flex-shrink-0">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleTabChange(key)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-[0.6rem] font-semibold uppercase tracking-[0.15em] transition-all duration-150",
                    tab === key
                      ? "bg-accent/[0.08] text-accent border border-accent/15"
                      : "text-slate-600 hover:text-slate-400 border border-transparent"
                  )}
                >
                  {label}
                </button>
              ))}
              {sortCol && (
                <button
                  onClick={() => { setSortCol(null); setSortDir("asc"); }}
                  className="ml-2 px-2.5 py-1.5 rounded-lg text-[0.55rem] font-mono text-slate-600 hover:text-slate-400 border border-white/[0.04] hover:border-white/[0.08] transition-all"
                >
                  Clear sort
                </button>
              )}
            </div>

            {/* Table — scrollable area with visible scrollbars */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-scroll data-table-scroll"
              style={{ overscrollBehavior: "contain" }}
            >
              <DataTable
                rows={activeRows}
                zoom={zoom}
                sortCol={sortCol}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
