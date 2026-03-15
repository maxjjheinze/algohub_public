import { NextResponse } from "next/server";

const BASE = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api";
const FALLBACK_RATE = 0.66;

async function fetchAudUsd(): Promise<number> {
  try {
    const res = await fetch(`${BASE}@latest/v1/currencies/usd.json`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) return FALLBACK_RATE;

    const data = await res.json();
    const audPerUsd = data.usd?.aud;

    if (audPerUsd == null) return FALLBACK_RATE;

    // audPerUsd = how many AUD per 1 USD; invert for AUD→USD
    return 1 / audPerUsd;
  } catch {
    return FALLBACK_RATE;
  }
}

export async function GET() {
  const rate = await fetchAudUsd();

  return NextResponse.json(
    { audusd: Math.round(rate * 10000) / 10000 },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      },
    }
  );
}
