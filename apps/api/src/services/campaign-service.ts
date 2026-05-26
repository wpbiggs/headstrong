import { createHash, randomUUID } from "node:crypto";
import { type Session, createCampaignRequestSchema } from "@headstrong/core";
import { buildBalancedLedgerTransaction } from "@headstrong/ledger";
import { createQuestRepository } from "../repositories/app-repository";
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
  userRepository = createQuestRepository(),
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

    async getCampaignHistory(
      user: Session,
      campaignId: string,
      cursor?: string,
      limit = 20,
    ) {
      if (!["admin", "educator", "parent", "expert"].includes(user.role)) {
        throw new CampaignServiceError("Forbidden.", 403);
      }
      const campaign = await repository.getCampaignById(campaignId);
      if (!campaign) {
        throw new CampaignServiceError("Campaign not found.", 404);
      }
      return repository.getLedgerHistory(campaignId, cursor, limit);
    },

    async allocateCampaign(
      user: Session,
      campaignId: string,
      input: { educatorId: string; amount: number; note: string },
    ) {
      if (user.role !== "admin") {
        throw new CampaignServiceError("Forbidden.", 403);
      }
      const campaign = await repository.getCampaignById(campaignId);
      if (!campaign) {
        throw new CampaignServiceError("Campaign not found.", 404);
      }
      const educator = await userRepository.getUserById(input.educatorId);
      if (!educator || educator.role !== "educator") {
        throw new CampaignServiceError("Invalid educator id.", 422);
      }
      const totals = await repository.getLedgerTotalsByCampaign(campaignId);
      if (input.amount > totals.outstandingUsd) {
        throw new CampaignServiceError(
          "Allocation exceeds campaign balance.",
          409,
        );
      }
      const hash = createHash("sha1")
        .update(
          `${campaignId}:${input.educatorId}:${input.amount}:${input.note}`,
        )
        .digest("hex")
        .slice(0, 12);
      const reference = `campaign:${campaignId}:allocation:${hash}`;
      const transaction = buildBalancedLedgerTransaction({
        reference,
        description: `Campaign allocation to educator ${input.educatorId}`,
        entries: [
          {
            accountCode: "campaign_allocations",
            direction: "credit",
            amount: input.amount,
            currency: "USD",
            campaignId,
            metadata: {
              actorUserId: user.sub,
              note: input.note,
              educatorId: input.educatorId,
              jobId: undefined,
            },
          },
          {
            accountCode: "cash_holding",
            direction: "debit",
            amount: input.amount,
            currency: "USD",
            campaignId,
            metadata: {
              actorUserId: user.sub,
              note: input.note,
              educatorId: input.educatorId,
            },
          },
        ],
      });
      try {
        await repository.createLedgerTransaction(transaction);
      } catch (error) {
        throw new CampaignServiceError(
          "Allocation replay detected or ledger write failed.",
          409,
        );
      }
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "campaign_allocated",
        entityType: "campaign",
        entityId: campaignId,
        payload: input,
      });
      return this.getCampaign(user, campaignId);
    },
  };
}
