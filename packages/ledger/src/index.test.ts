import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBalancedLedgerTransaction,
  summarizeCampaignTotals,
} from "./index";

test("ledger transaction enforces sum-to-zero invariant", () => {
  const transaction = buildBalancedLedgerTransaction({
    reference: "campaign:1:pledge",
    description: "Initial pledge",
    entries: [
      { accountCode: "cash_holding", direction: "debit", amount: 100 },
      { accountCode: "campaign_pledges", direction: "credit", amount: 100 },
    ],
  });

  assert.equal(transaction.entries.length, 2);
});

test("ledger transaction rejects imbalance", () => {
  assert.throws(() =>
    buildBalancedLedgerTransaction({
      reference: "bad",
      description: "bad",
      entries: [
        { accountCode: "cash_holding", direction: "debit", amount: 100 },
        { accountCode: "campaign_pledges", direction: "credit", amount: 90 },
      ],
    }),
  );
});

test("campaign totals summarize ledger transactions consistently", () => {
  const transactions = [
    buildBalancedLedgerTransaction({
      reference: "pledge",
      description: "Pledge",
      entries: [
        { accountCode: "cash_holding", direction: "debit", amount: 50 },
        { accountCode: "campaign_pledges", direction: "credit", amount: 50 },
      ],
    }),
    buildBalancedLedgerTransaction({
      reference: "reserve",
      description: "Reserve",
      entries: [
        { accountCode: "cash_holding", direction: "debit", amount: 20 },
        { accountCode: "campaign_reserve", direction: "credit", amount: 20 },
      ],
    }),
  ];
  const totals = summarizeCampaignTotals(transactions);
  assert.equal(totals.pledgedUsd, 50);
  assert.equal(totals.reservedUsd, 20);
});
