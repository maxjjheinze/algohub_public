"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "../ui/card";
import { HeroChart } from "./HeroChart";
import { MetricsPanel } from "./MetricsPanel";
import { RangePills } from "./RangePills";
import { CurrencyToggle } from "./CurrencyToggle";
import { SectionHeading } from "../ui/SectionHeading";
import type { RangeKey } from "../../lib/apiClient";
import type { AccountCard, CleanedRow, CurrencyKey, DepositWithdrawalEvent, HeroMetrics, HeroSeriesPoint } from "../../lib/types";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { CURRENCY_SYMBOLS } from "../../lib/constants";

export function HeroSection({
  series,
  metrics,
  events,
  range,
  onRangeChange,
  currency,
  onCurrencyChange,
  accounts,
  cleanedRows,
  fxAudUsd,
  animateNumbers = true
}: {
  series: HeroSeriesPoint[];
  metrics: HeroMetrics | null;
  events: DepositWithdrawalEvent[];
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
  currency: CurrencyKey;
  onCurrencyChange: (c: CurrencyKey) => void;
  accounts: AccountCard[];
  cleanedRows: CleanedRow[];
  fxAudUsd: number;
  animateNumbers?: boolean;
}) {
  const symbol = CURRENCY_SYMBOLS[currency];

  return (
    <section className="mb-8">
      <div className="glass-card p-4 md:p-5">
        <SectionHeading title="Main" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Card className="h-[320px] md:h-[380px] lg:h-[440px] flex flex-col">
              {/* Top bar: title + balance + controls */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Portfolio Value
                    </span>
                    <CurrencyToggle value={currency} onChange={onCurrencyChange} />
                  </div>
                  <div className="text-hero-sm md:text-hero text-white tabular-nums">
                    {metrics
                      ? (
                        <>
                          <span className="text-slate-500 font-normal">{symbol}</span>
                          <AnimatedNumber
                            value={metrics.total_balance_usd}
                            format={(n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            springConfig={{ stiffness: 50, damping: 16 }}
                          />
                        </>
                      )
                      : <span className="text-slate-600">---</span>}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <RangePills value={range} onChange={onRangeChange} />
                </div>
              </div>

              {/* Chart */}
              <CardContent className="flex-1 -mx-2">
                <HeroChart data={series} events={events} range={range} currencySymbol={symbol} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <MetricsPanel
              accounts={accounts}
              cleanedRows={cleanedRows}
              fxAudUsd={fxAudUsd}
              currency={currency}
              range={range}
              animateNumbers={animateNumbers}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
