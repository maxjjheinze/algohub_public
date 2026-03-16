"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Database } from "lucide-react";
import { Header } from "../components/layout/Header";
import { HeroSection } from "../components/hero/HeroSection";
import { AccountSection } from "../components/accounts/AccountSection";
import { RawDataModal } from "../components/modals/RawDataModal";
import { AccountDetailModal } from "../components/modals/AccountDetailModal";
import { PortfolioAnalyticsModal } from "../components/modals/PortfolioAnalyticsModal";
import { OverviewStrip } from "../components/overview/OverviewStrip";
import { Footer } from "../components/layout/Footer";
import { GlowButton } from "../components/ui/GlowButton";
import { NEON_PALETTE, INACTIVE_ACCOUNTS, INACTIVE_COLOR, HIDDEN_ACCOUNTS } from "../lib/constants";
import { getBundle, getFxRate, getViews, incrementView, deriveHeroFromAccounts, fillAccountSeries, applyLiveFx, getLatestStatsPerAccount, sliceByRange, type RangeKey } from "../lib/apiClient";
import type { AccountCard, CleanedRow, CurrencyKey, RawRow, StatsRow } from "../lib/types";

export default function Page() {
  const [range, setRange] = useState<RangeKey>("all");
  const [currency, setCurrency] = useState<CurrencyKey>("USD");
  const [allAccounts, setAllAccounts] = useState<AccountCard[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [cleanedRows, setCleanedRows] = useState<CleanedRow[]>([]);
  const [allStats, setAllStats] = useState<StatsRow[]>([]);
  const [views, setViews] = useState<number | null>(null);
  const [fxAudUsd, setFxAudUsd] = useState(0.66);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountCard | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [animateNumbers, setAnimateNumbers] = useState(true);

  const handleRangeChange = useCallback((r: RangeKey) => {
    setAnimateNumbers(false);
    setRange(r);
  }, []);

  const handleCurrencyChange = useCallback((c: CurrencyKey) => {
    setAnimateNumbers(true);
    setCurrency(c);
  }, []);

  // Single /bundle endpoint returns accounts + cleaned + stats + raw in one
  // request. FX rate fetched in parallel. All state set in one batch.
  useEffect(() => {
    incrementView().then(v => setViews(v.total_views)).catch(() => {});
    getViews().then(v => setViews(v.total_views)).catch(() => {});

    void (async () => {
      const [bundle, fx] = await Promise.all([
        getBundle(),
        getFxRate().catch(() => 0.66),
      ]);
      setRawRows(bundle.raw);
      setCleanedRows(bundle.cleaned);
      setAllStats(bundle.stats);
      setAllAccounts(fillAccountSeries(bundle.accounts));
      setFxAudUsd(fx);
    })();
  }, []);

  // Re-derive USD values from native using live FX rate
  const fxAccounts = useMemo(() => applyLiveFx(allAccounts, fxAudUsd), [allAccounts, fxAudUsd]);

  const statsMap = useMemo(() => getLatestStatsPerAccount(allStats), [allStats]);

  const { heroSeries, heroMetrics, heroEvents } = useMemo(() => {
    const { series, metrics, events } = deriveHeroFromAccounts(fxAccounts, currency, fxAudUsd);
    return { heroSeries: sliceByRange(series, range), heroMetrics: metrics, heroEvents: events };
  }, [fxAccounts, currency, fxAudUsd, range]);

  // Filter out hidden accounts from display, sort inactive accounts last
  const displayAccounts = useMemo(
    () => fxAccounts
      .filter(a => !HIDDEN_ACCOUNTS.has(a.account_number))
      .sort((a, b) => {
        const aInactive = INACTIVE_ACCOUNTS.has(`${a.broker}-${a.account_number}`) ? 1 : 0;
        const bInactive = INACTIVE_ACCOUNTS.has(`${b.broker}-${b.account_number}`) ? 1 : 0;
        return aInactive - bInactive;
      }),
    [fxAccounts]
  );

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    let activeIdx = 0;
    displayAccounts.forEach((acc) => {
      const key = `${acc.broker}-${acc.account_number}`;
      if (INACTIVE_ACCOUNTS.has(key)) {
        map.set(key, INACTIVE_COLOR);
      } else {
        map.set(key, NEON_PALETTE[activeIdx % NEON_PALETTE.length]);
        activeIdx++;
      }
    });
    return map;
  }, [displayAccounts]);

  return (
    <main className="min-h-screen px-5 py-6 md:px-8 lg:px-12 md:py-8 max-w-[1440px] mx-auto">
      <Header views={views} />

      <div className="scanline mb-8" />

      <OverviewStrip accounts={fxAccounts} statsMap={statsMap} cleanedRows={cleanedRows} fxAudUsd={fxAudUsd} currency={currency} onCurrencyChange={handleCurrencyChange} onAnalyticsClick={() => setAnalyticsOpen(true)} />

      <HeroSection
        series={heroSeries}
        metrics={fxAccounts.length > 0 ? heroMetrics : null}
        events={heroEvents}
        range={range}
        onRangeChange={handleRangeChange}
        currency={currency}
        onCurrencyChange={handleCurrencyChange}
        accounts={fxAccounts}
        cleanedRows={cleanedRows}
        fxAudUsd={fxAudUsd}
        animateNumbers={animateNumbers}
      />

      <AccountSection
        accounts={displayAccounts}
        colorMap={colorMap}
        statsMap={statsMap}
        onAccountClick={setSelectedAccount}
      />

      <Footer />

      <GlowButton onClick={() => setModalOpen(true)}>
        <Database className="h-5 w-5" />
      </GlowButton>

      <RawDataModal open={modalOpen} onClose={() => setModalOpen(false)} rows={rawRows} cleanedRows={cleanedRows} statsRows={allStats} />

      <AccountDetailModal
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        color={selectedAccount ? colorMap.get(`${selectedAccount.broker}-${selectedAccount.account_number}`) ?? "#F59E42" : "#F59E42"}
        stats={selectedAccount ? statsMap.get(`${selectedAccount.broker}:${selectedAccount.account_number}`) ?? null : null}
        cleanedRows={cleanedRows}
        fxAudUsd={fxAudUsd}
      />

      <PortfolioAnalyticsModal
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        accounts={fxAccounts}
        cleanedRows={cleanedRows}
        fxAudUsd={fxAudUsd}
      />
    </main>
  );
}
