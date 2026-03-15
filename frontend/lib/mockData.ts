import type {
  AccountCard,
  AccountSeriesPoint,
  CurrencyKey,
  HeroMetrics,
  HeroSeriesPoint,
  RawRow,
  Views
} from "./types";

const today = new Date();

function daysAgo(n: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function generateSeries(
  length: number,
  base: number,
  drift: number,
  volatility: number,
  seed: number
): AccountSeriesPoint[] {
  // Simulate a few deposit/withdrawal events
  const dwDays = new Set([0, Math.floor(length * 0.3), Math.floor(length * 0.6)]);
  return Array.from({ length }).map((_, i) => {
    const t = length - i;
    const noise = Math.sin((i + seed) / 5) * volatility + Math.cos((i + seed) / 11) * volatility * 0.4;
    const drawdown = Math.sin((i + seed) / 25) > 0.8 ? -volatility * 1.5 : 0;
    let dw = 0;
    if (dwDays.has(i)) {
      dw = i === 0 ? base : (i === Math.floor(length * 0.6) ? -500 : 1000);
    }
    return {
      date: daysAgo(t),
      balance_usd: Math.round((base + i * drift + noise + drawdown) * 100) / 100,
      deposit_withdrawal_usd: dw
    };
  });
}

const bbSeries = generateSeries(90, 10000, 45, 300, 0);
const icSeries = generateSeries(90, 8000, 55, 250, 17);
const pepSeries = generateSeries(75, 5000, 30, 200, 31);
const fpSeries = generateSeries(60, 12000, 65, 400, 47);
const cpSeries = generateSeries(80, 7000, 35, 180, 63);
const axiSeries = generateSeries(50, 4000, 25, 150, 79);

function lastBalance(s: AccountSeriesPoint[]): number {
  return s[s.length - 1].balance_usd;
}

export const mockAccounts: AccountCard[] = [
  {
    broker: "BlackBull Markets",
    account_number: "501234",
    platform: "MT5",
    base_currency: "USD",
    initiation_date: bbSeries[0].date,
    days_active: bbSeries.length,
    balance_usd: lastBalance(bbSeries),
    closed_pnl_usd: 3850,
    net_contributions_usd: 10000,
    total_deposits_usd: 10000,
    total_deposits_native: 10000,
    total_withdrawals_usd: 0,
    total_withdrawals_native: 0,
    percent_gain: 0.385,
    series: bbSeries
  },
  {
    broker: "IC Markets",
    account_number: "602345",
    platform: "MT5",
    base_currency: "USD",
    initiation_date: icSeries[0].date,
    days_active: icSeries.length,
    balance_usd: lastBalance(icSeries),
    closed_pnl_usd: 4920,
    net_contributions_usd: 8000,
    total_deposits_usd: 8000,
    total_deposits_native: 8000,
    total_withdrawals_usd: 0,
    total_withdrawals_native: 0,
    percent_gain: 0.615,
    series: icSeries
  },
  {
    broker: "Pepperstone",
    account_number: "703456",
    platform: "MT5",
    base_currency: "USD",
    initiation_date: pepSeries[0].date,
    days_active: pepSeries.length,
    balance_usd: lastBalance(pepSeries),
    closed_pnl_usd: 2150,
    net_contributions_usd: 5000,
    total_deposits_usd: 5000,
    total_deposits_native: 5000,
    total_withdrawals_usd: 0,
    total_withdrawals_native: 0,
    percent_gain: 0.43,
    series: pepSeries
  },
  {
    broker: "FP Markets",
    account_number: "804567",
    platform: "MT5",
    base_currency: "USD",
    initiation_date: fpSeries[0].date,
    days_active: fpSeries.length,
    balance_usd: lastBalance(fpSeries),
    closed_pnl_usd: 3780,
    net_contributions_usd: 12000,
    total_deposits_usd: 12000,
    total_deposits_native: 12000,
    total_withdrawals_usd: 0,
    total_withdrawals_native: 0,
    percent_gain: 0.315,
    series: fpSeries
  },
  {
    broker: "Capital Point Trading",
    account_number: "905678",
    platform: "MT5",
    base_currency: "AUD",
    initiation_date: cpSeries[0].date,
    days_active: cpSeries.length,
    balance_usd: lastBalance(cpSeries),
    closed_pnl_usd: 2680,
    net_contributions_usd: 7000,
    total_deposits_usd: 7000,
    total_deposits_native: 7000,
    total_withdrawals_usd: 0,
    total_withdrawals_native: 0,
    percent_gain: 0.383,
    series: cpSeries
  },
  {
    broker: "Axi",
    account_number: "106789",
    platform: "MT5",
    base_currency: "AUD",
    initiation_date: axiSeries[0].date,
    days_active: axiSeries.length,
    balance_usd: lastBalance(axiSeries),
    closed_pnl_usd: 1210,
    net_contributions_usd: 4000,
    total_deposits_usd: 4000,
    total_deposits_native: 4000,
    total_withdrawals_usd: 0,
    total_withdrawals_native: 0,
    percent_gain: 0.303,
    series: axiSeries
  }
];

export function mockHeroForCurrency(
  currency: CurrencyKey,
  accounts: AccountCard[]
): { series: HeroSeriesPoint[]; metrics: HeroMetrics } {
  const filtered = accounts.filter(a => a.base_currency === currency);
  if (filtered.length === 0) {
    return {
      series: [],
      metrics: { total_balance_usd: 0, total_closed_pnl_usd: 0, net_contributions_usd: 0, percent_gain: 0 }
    };
  }

  // Build aggregated series from the union of all dates
  const dateMap = new Map<string, number>();
  for (const acc of filtered) {
    for (const pt of acc.series) {
      dateMap.set(pt.date, (dateMap.get(pt.date) ?? 0) + pt.balance_usd);
    }
  }
  const series: HeroSeriesPoint[] = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total_balance_usd: Math.round(total * 100) / 100 }));

  const totalBalance = filtered.reduce((s, a) => s + a.balance_usd, 0);
  const totalPnl = filtered.reduce((s, a) => s + a.closed_pnl_usd, 0);
  const totalContrib = filtered.reduce((s, a) => s + a.net_contributions_usd, 0);
  const percentGain = totalContrib > 0 ? totalPnl / totalContrib : 0;

  return {
    series,
    metrics: {
      total_balance_usd: Math.round(totalBalance * 100) / 100,
      total_closed_pnl_usd: Math.round(totalPnl * 100) / 100,
      net_contributions_usd: Math.round(totalContrib * 100) / 100,
      percent_gain: Math.round(percentGain * 1000) / 1000
    }
  };
}

// Legacy exports for backwards compatibility with apiClient
export const mockHeroSeries: HeroSeriesPoint[] = mockHeroForCurrency("USD", mockAccounts).series;
export const mockHeroMetrics: HeroMetrics = mockHeroForCurrency("USD", mockAccounts).metrics;

export const mockRawRows: RawRow[] = mockAccounts.map(acc => ({
  statement_date: acc.series[acc.series.length - 1].date,
  broker: acc.broker,
  account_number: acc.account_number,
  balance: acc.balance_usd,
  closed_pnl: acc.closed_pnl_usd,
  deposit_withdrawal: 0,
  currency: acc.base_currency
}));

let mockViews: Views = { total_views: 128 };

export function getMockViews(): Views {
  return mockViews;
}

export function incrementMockViews(): Views {
  mockViews = { total_views: mockViews.total_views + 1 };
  return mockViews;
}
