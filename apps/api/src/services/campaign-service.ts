import { randomUUID } from "node:crypto";
import { type Session, createCampaignRequestSchema } from "@headstrong/core";
import { buildBalancedLedgerTransaction } from "@headstrong/ledger";
import {
  type CampaignRepository,
  createCampaignRepository,
  getCampaignDetail,
} from "../repositories/campaign-repository";
import { createCommonsRepository } from "../repositories/commons-repository";

export class CampaignServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function createCampaignService(
  repository: CampaignRepository = createCampaignRepository(),
  commonsRepository = createCommonsRepository(),
) {
  return {
    async createCampaign(user: Session, input: unknown) {
      if (user.role !== "admin") {
        throw new CampaignServiceError("Forbidden.", 403);
      }
      const parsed = createCampaignRequestSchema.parse(input);
      const campaign = await repository.createCampaign({
        educatorUserId: parsed.educatorUserId,
        createdByUserId: user.sub,
        title: parsed.title,
        description: parsed.description,
        status: "live",
      });

      if (parsed.openingPledgeUsd > 0) {
        const transaction = buildBalancedLedgerTransaction({
          reference: `campaign:${campaign.id}:opening-pledge`,
          description: "Opening campaign pledge",
          entries: [
            {
              accountCode: "cash_holding",
              direction: "debit",
              amount: parsed.openingPledgeUsd,
              currency: "USD",
              campaignId: campaign.id,
            },
            {
              accountCode: "campaign_pledges",
              direction: "credit",
              amount: parsed.openingPledgeUsd,
              currency: "USD",
              campaignId: campaign.id,
            },
          ],
        });
        await repository.createLedgerTransaction(transaction);
      }

      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "campaign_created",
        entityType: "campaign",
        entityId: campaign.id,
        payload: parsed,
      });
      return campaign;
    },

    async getCampaign(user: Session, campaignId: string) {
      if (!["admin", "educator", "parent", "expert"].includes(user.role)) {
        throw new CampaignServiceError("Forbidden.", 403);
      }
      const detail = await getCampaignDetail(repository, campaignId);
      if (!detail) {
        throw new CampaignServiceError("Campaign not found.", 404);
      }
      return {
        ...detail,
        contributorScore: await commonsRepository.getContributorScore(
          detail.campaign.educatorUserId,
        ),
      };
    },
  };
}
