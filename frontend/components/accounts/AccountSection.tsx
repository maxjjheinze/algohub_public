"use client";

import { motion } from "framer-motion";
import { AccountCard } from "./AccountCard";
import { SectionHeading } from "../ui/SectionHeading";
import type { AccountCard as AccountCardType, StatsRow } from "../../lib/types";

export function AccountSection({
  accounts,
  colorMap,
  statsMap,
  onAccountClick
}: {
  accounts: AccountCardType[];
  colorMap: Map<string, string>;
  statsMap: Map<string, StatsRow>;
  onAccountClick: (account: AccountCardType) => void;
}) {
  return (
    <section className="mb-12">
      <SectionHeading title="Accounts" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {accounts.map((acc, idx) => {
          const key = `${acc.broker}-${acc.account_number}`;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.06 * idx + 0.3,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              <AccountCard
                account={acc}
                color={colorMap.get(key) || "#F59E42"}
                stats={statsMap.get(`${acc.broker}:${acc.account_number}`) ?? null}
                onClick={() => onAccountClick(acc)}
              />
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
