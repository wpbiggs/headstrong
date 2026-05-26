import { z } from "zod";
import { contributorScoreSchema } from "./commons";

export const ledgerAccountTypeSchema = z.enum([
  "cash",
  "liability",
  "revenue",
  "expense",
  "equity",
  "reserve",
]);

export const ledgerEntryDirectionSchema = z.enum(["debit", "credit"]);

export const ledgerEntrySchema = z.object({
  accountCode: z.string().min(1),
  direction: ledgerEntryDirectionSchema,
  amount: z.number().positive(),
  currency: z.literal("USD"),
  campaignId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const ledgerTransactionSchema = z.object({
  id: z.string().uuid(),
  reference: z.string().min(1),
  description: z.string().min(1),
  entries: z.array(ledgerEntrySchema).min(2),
  createdAt: z.string().datetime(),
});

export const campaignStatusSchema = z.enum(["draft", "live", "closed"]);

export const campaignSchema = z.object({
  id: z.string().uuid(),
  educatorUserId: z.string().uuid(),
  createdByUserId: z.string().uuid(),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  status: campaignStatusSchema,
  createdAt: z.string().datetime(),
});

export const createCampaignRequestSchema = z.object({
  educatorUserId: z.string().uuid(),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  openingPledgeUsd: z.number().nonnegative().default(0),
});

export const allocateCampaignRequestSchema = z.object({
  educatorId: z.string().uuid(),
  amount: z.number().positive(),
  note: z.string().min(1).max(500),
});

export const campaignTotalsSchema = z.object({
  pledgedUsd: z.number().nonnegative(),
  allocatedUsd: z.number().nonnegative(),
  reservedUsd: z.number().nonnegative(),
  outstandingUsd: z.number(),
});

export const ledgerHistoryItemSchema = z.object({
  transactionId: z.string().uuid(),
  reference: z.string().min(1),
  description: z.string().min(1),
  accountCode: z.string().min(1),
  direction: ledgerEntryDirectionSchema,
  amount: z.number().positive(),
  currency: z.literal("USD"),
  createdAt: z.string().datetime(),
  actorUserId: z.string().uuid().nullable(),
  note: z.string().nullable(),
});

export const campaignHistoryResponseSchema = z.object({
  items: z.array(ledgerHistoryItemSchema),
  nextCursor: z.string().nullable(),
});

export const campaignDetailSchema = z.object({
  campaign: campaignSchema,
  totals: campaignTotalsSchema,
  contributorScore: contributorScoreSchema.optional(),
  transactions: z.array(ledgerTransactionSchema),
});

export type Campaign = z.infer<typeof campaignSchema>;
