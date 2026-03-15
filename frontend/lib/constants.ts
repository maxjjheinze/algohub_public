import type { RangeKey } from "./apiClient";
import type { CurrencyKey } from "./types";

export const RANGE_PILLS: { key: RangeKey; label: string }[] = [
  { key: "3d", label: "3D" },
  { key: "7d", label: "7D" },
  { key: "14d", label: "14D" },
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "all", label: "ALL" }
];

export const NEON_PALETTE = [
  "#F59E42"
];

/** Per-account colors for the Portfolio Analytics modal (vibrant on dark backgrounds). */
export const ANALYTICS_PALETTE = [
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#6366F1", // Indigo
  "#14B8A6", // Teal
];

/** Accounts that are no longer actively traded. Keyed by "broker-account_number". */
export const INACTIVE_ACCOUNTS = new Set<string>([]);

/** Muted dot color for inactive accounts. */
export const INACTIVE_COLOR = "#475569";

export const CURRENCY_SYMBOLS: Record<CurrencyKey, string> = {
  USD: "$",
  AUD: "A$"
};
