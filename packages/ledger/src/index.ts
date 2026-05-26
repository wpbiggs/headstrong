import { randomUUID } from "node:crypto";
import { ledgerTransactionSchema } from "@headstrong/core";

type LedgerEntryInput = {
  accountCode: string;
  direction: "debit" | "credit";
  amount: number;
  currency?: "USD";
  campaignId?: string;
  metadata?: Record<string, unknown>;
};

export function buildBalancedLedgerTransaction(input: {
  reference: string;
  description: string;
  entries: LedgerEntryInput[];
}) {
  const normalized = input.entries.map((entry) => ({
    ...entry,
    currency: entry.currency ?? "USD",
  }));
  const debit = normalized
    .filter((entry) => entry.direction === "debit")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const credit = normalized
    .filter((entry) => entry.direction === "credit")
    .reduce((sum, entry) => sum + entry.amount, 0);

  if (normalized.length < 2) {
    throw new Error("Ledger transaction requires at least two entries.");
  }
  if (Math.abs(debit - credit) > 0.000001) {
    throw new Error("Ledger transaction is unbalanced.");
  }

  return ledgerTransactionSchema.parse({
    id: randomUUID(),
    reference: input.reference,
    description: input.description,
    entries: normalized,
    createdAt: new Date().toISOString(),
  });
}

export function summarizeCampaignTotals(
  transactions: Array<{
    entries: Array<{
      accountCode: string;
      direction: "debit" | "credit";
      amount: number;
    }>;
  }>,
) {
  const totals = {
    pledgedUsd: 0,
    allocatedUsd: 0,
    reservedUsd: 0,
  };

  for (const transaction of transactions) {
    for (const entry of transaction.entries) {
      if (
        entry.accountCode === "campaign_pledges" &&
        entry.direction === "credit"
      ) {
        totals.pledgedUsd += entry.amount;
      }
      if (
        entry.accountCode === "campaign_allocations" &&
        entry.direction === "credit"
      ) {
        totals.allocatedUsd += entry.amount;
      }
      if (
        entry.accountCode === "campaign_reserve" &&
        entry.direction === "credit"
      ) {
        totals.reservedUsd += entry.amount;
      }
    }
  }

  return totals;
}
