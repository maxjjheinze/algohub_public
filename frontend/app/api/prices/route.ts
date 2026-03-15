import { NextResponse } from "next/server";

const BASE = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api";

type Rates = Record<string, number>;

interface PriceTicker {
  symbol: string;
  label: string;
  price: number;
  change24h: number;
  changePct: number;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function fetchRates(dateTag: string): Promise<Rates> {
  const res = await fetch(`${BASE}@${dateTag}/v1/currencies/usd.json`, {
    next: { revalidate: 300 } // cache 5 min
  });
  if (!res.ok) throw new Error(`rates fetch failed: ${res.status}`);
  const data = await res.json();
  return data.usd as Rates;
}

function buildTickers(today: Rates, yesterday: Rates): PriceTicker[] {
  const pairs: { code: string; symbol: string; label: string; invert: boolean }[] = [
    { code: "xau", symbol: "XAU/USD", label: "Gold", invert: true },
    { code: "eur", symbol: "EUR/USD", label: "Euro", invert: true },
    { code: "gbp", symbol: "GBP/USD", label: "Pound", invert: true },
    { code: "jpy", symbol: "USD/JPY", label: "Yen", invert: false },
    { code: "aud", symbol: "AUD/USD", label: "AUD", invert: true }
  ];

  return pairs
    .filter(p => today[p.code] != null && yesterday[p.code] != null)
    .map(p => {
      const priceNow = p.invert ? 1 / today[p.code] : today[p.code];
      const pricePrev = p.invert ? 1 / yesterday[p.code] : yesterday[p.code];
      const change = priceNow - pricePrev;
      const pct = pricePrev !== 0 ? (change / pricePrev) * 100 : 0;
      return {
        symbol: p.symbol,
        label: p.label,
        price: Math.round(priceNow * 10000) / 10000,
        change24h: Math.round(change * 10000) / 10000,
        changePct: Math.round(pct * 100) / 100
      };
    });
}

export async function GET() {
  try {
    const [today, yesterday] = await Promise.all([
      fetchRates("latest"),
      fetchRates(getYesterday())
    ]);
    const tickers = buildTickers(today, yesterday);
    return NextResponse.json(tickers, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 502 }
    );
  }
}
