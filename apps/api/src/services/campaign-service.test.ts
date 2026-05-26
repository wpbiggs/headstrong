import assert from "node:assert/strict";
import test from "node:test";
import type { Campaign, Session } from "@headstrong/core";
import type { CampaignRepository } from "../repositories/campaign-repository";
import {
  CampaignServiceError,
  createCampaignService,
} from "./campaign-service";

type StoredLedgerTransaction = Parameters<
  CampaignRepository["createLedgerTransaction"]
>[0];

function createSessionFixture(overrides: Partial<Session>): Session {
  return {
    sub: overrides.sub ?? crypto.randomUUID(),
    email: overrides.email ?? "admin@example.com",
    role: overrides.role ?? "admin",
    sessionId: overrides.sessionId ?? crypto.randomUUID(),
  };
}

function createRepositoryFixture() {
  const campaigns = new Map<string, Campaign>();
  const transactions = new Map<string, StoredLedgerTransaction[]>();
  const auditLogs: string[] = [];

  const repository: CampaignRepository = {
    async createCampaign(input) {
      const campaign: Campaign = {
        id: crypto.randomUUID(),
        educatorUserId: input.educatorUserId,
        createdByUserId: input.createdByUserId,
        title: input.title,
        description: input.description,
        status: input.status,
        createdAt: new Date().toISOString(),
      };
      campaigns.set(campaign.id, campaign);
      return campaign;
    },
    async createLedgerTransaction(input) {
      const current =
        transactions.get(input.entries[0]?.campaignId ?? "") ?? [];
      current.push(input);
      transactions.set(input.entries[0]?.campaignId ?? "", current);
    },
    async getCampaignById(id) {
      return campaigns.get(id) ?? null;
    },
    async getCampaignTransactions(id) {
      return (transactions.get(id) ?? []).map((transaction) => ({
        ...transaction,
        createdAt: new Date().toISOString(),
        entries: transaction.entries.map((entry) => ({
          ...entry,
          metadata: entry.metadata ?? {},
        })),
      }));
    },
    async logAuditEvent(input) {
      auditLogs.push(input.action);
    },
  };

  return { repository, campaigns, transactions, auditLogs };
}

test("admin can create campaign and opening pledge is reflected in totals", async () => {
  const fixture = createRepositoryFixture();
  const service = createCampaignService(fixture.repository, {
    getContributorScore: async (contributorUserId: string) => ({
      contributorUserId,
      assetCount: 0,
      remixCount: 0,
      impactCount: 0,
      score: 0,
    }),
  } as never);
  const admin = createSessionFixture({ role: "admin" });
  const campaign = await service.createCampaign(admin, {
    educatorUserId: crypto.randomUUID(),
    title: "Support Teacher Mina",
    description: "Initial campaign",
    openingPledgeUsd: 100,
  });
  const detail = await service.getCampaign(admin, campaign.id);
  assert.equal(detail.totals.pledgedUsd, 100);
  assert.ok(fixture.auditLogs.includes("campaign_created"));
});

test("non-admin cannot create campaign", async () => {
  const fixture = createRepositoryFixture();
  const service = createCampaignService(fixture.repository, {
    getContributorScore: async (contributorUserId: string) => ({
      contributorUserId,
      assetCount: 0,
      remixCount: 0,
      impactCount: 0,
      score: 0,
    }),
  } as never);
  await assert.rejects(
    () =>
      service.createCampaign(createSessionFixture({ role: "educator" }), {
        educatorUserId: crypto.randomUUID(),
        title: "Blocked campaign",
        description: "Nope",
        openingPledgeUsd: 0,
      }),
    (error: unknown) => {
      assert.ok(error instanceof CampaignServiceError);
      assert.equal(error.status, 403);
      return true;
    },
  );
});
