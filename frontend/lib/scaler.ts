const SCALE_FACTOR = 5;

/** Fields stripped from all responses to avoid leaking private data. */
const STRIP_FIELDS = ["account_name", "gmail_message_id", "ingested_at"];

function stripSensitive(row: Record<string, unknown>): void {
  for (const f of STRIP_FIELDS) delete row[f];
}

/** Deterministic hash-based obfuscation: djb2 hash → 6-digit number string. */
export function obfuscateAccountNumber(real: string): string {
  let hash = 5381;
  for (let i = 0; i < real.length; i++) {
    hash = ((hash << 5) + hash + real.charCodeAt(i)) | 0;
  }
  const sixDigit = Math.abs(hash) % 900000 + 100000;
  return String(sixDigit);
}

function scale(value: unknown): number | null {
  if (value == null || typeof value !== "number") return value as null;
  return Math.round(value * SCALE_FACTOR * 100) / 100;
}

function scaleAccountCards(data: Record<string, unknown>[]): Record<string, unknown>[] {
  const dollarFields = [
    "balance_usd", "balance_native",
    "closed_pnl_usd", "closed_pnl_native",
    "net_contributions_usd", "net_contributions_native",
    "total_deposits_usd", "total_deposits_native",
    "total_withdrawals_usd", "total_withdrawals_native",
  ];
  const seriesFields = ["balance_usd", "balance_native", "deposit_withdrawal_usd"];

  return data.map(card => {
    const scaled: Record<string, unknown> = { ...card };

    for (const f of dollarFields) {
      if (f in scaled) scaled[f] = scale(scaled[f]);
    }

    stripSensitive(scaled);

    if (typeof scaled.account_number === "string") {
      scaled.account_number = obfuscateAccountNumber(scaled.account_number as string);
    }

    if (Array.isArray(scaled.series)) {
      scaled.series = (scaled.series as Record<string, unknown>[]).map(pt => {
        const sPt: Record<string, unknown> = { ...pt };
        for (const f of seriesFields) {
          if (f in sPt) sPt[f] = scale(sPt[f]);
        }
        return sPt;
      });
    }

    return scaled;
  });
}

function scaleCleanedRows(data: Record<string, unknown>[]): Record<string, unknown>[] {
  const fields = [
    "closed_pnl", "deposit", "withdrawal", "balance",
    "cumulative_pnl", "cumulative_deposits", "cumulative_withdrawals",
  ];

  return data.map(row => {
    const scaled: Record<string, unknown> = { ...row };
    stripSensitive(scaled);
    for (const f of fields) {
      if (f in scaled) scaled[f] = scale(scaled[f]);
    }
    if (typeof scaled.account_number === "string") {
      scaled.account_number = obfuscateAccountNumber(scaled.account_number as string);
    }
    return scaled;
  });
}

function scaleStatsRows(data: Record<string, unknown>[]): Record<string, unknown>[] {
  const fields = [
    "gross_profit", "gross_loss", "max_drawdown_amount",
    "best_day", "worst_day", "avg_win", "avg_loss", "expectancy",
  ];

  return data.map(row => {
    const scaled: Record<string, unknown> = { ...row };
    stripSensitive(scaled);
    for (const f of fields) {
      if (f in scaled) scaled[f] = scale(scaled[f]);
    }
    if (typeof scaled.account_number === "string") {
      scaled.account_number = obfuscateAccountNumber(scaled.account_number as string);
    }
    return scaled;
  });
}

function scaleRawRows(data: Record<string, unknown>[]): Record<string, unknown>[] {
  const fields = ["closed_pnl", "deposit_withdrawal", "balance"];

  return data.map(row => {
    const scaled: Record<string, unknown> = { ...row };
    stripSensitive(scaled);
    for (const f of fields) {
      if (f in scaled) scaled[f] = scale(scaled[f]);
    }
    if (typeof scaled.account_number === "string") {
      scaled.account_number = obfuscateAccountNumber(scaled.account_number as string);
    }
    return scaled;
  });
}

/** Route to correct scaler based on the first path segment of the API endpoint. */
export function transformResponse(path: string, data: unknown): unknown {
  if (!Array.isArray(data)) return data;

  switch (path) {
    case "accounts":
      return scaleAccountCards(data as Record<string, unknown>[]);
    case "cleaned":
      return scaleCleanedRows(data as Record<string, unknown>[]);
    case "stats":
      return scaleStatsRows(data as Record<string, unknown>[]);
    case "raw":
      return scaleRawRows(data as Record<string, unknown>[]);
    default:
      return data;
  }
}
