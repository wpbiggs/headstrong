import type { Campaign } from "@headstrong/core";
import {
  campaignDetailSchema,
  campaignSchema,
  ledgerTransactionSchema,
} from "@headstrong/core";
import { summarizeCampaignTotals } from "@headstrong/ledger";
import type { DatabaseClient } from "../db";
import { sql } from "../db";

interface StoredLedgerTransaction {
  id: string;
  reference: string;
  description: string;
  createdAt: string;
  entries: Array<{
    accountCode: string;
    direction: "debit" | "credit";
    amount: number;
    currency: "USD";
    campaignId?: string;
    metadata: Record<string, unknown>;
  }>;
}

function mapCampaign(row: Record<string, unknown>) {
  return campaignSchema.parse({
    id: row.id,
    educatorUserId: row.educator_user_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: new Date(String(row.created_at)).toISOString(),
  });
}

export interface CampaignRepository {
  createCampaign(input: {
    educatorUserId: string;
    createdByUserId: string;
    title: string;
    description: string;
    status: Campaign["status"];
  }): Promise<Campaign>;
  createLedgerTransaction(input: {
    id: string;
    reference: string;
    description: string;
    entries: Array<{
      accountCode: string;
      direction: "debit" | "credit";
      amount: number;
      currency: "USD";
      campaignId?: string;
      metadata?: Record<string, unknown>;
    }>;
  }): Promise<void>;
  getCampaignById(id: string): Promise<Campaign | null>;
  getCampaignTransactions(
    id: string,
  ): Promise<Array<ReturnType<typeof ledgerTransactionSchema.parse>>>;
  logAuditEvent(input: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}

export function createCampaignRepository(
  client: DatabaseClient = sql,
): CampaignRepository {
  return {
    async createCampaign(input) {
      const [row] = await client`
        insert into campaigns (educator_user_id, created_by_user_id, title, description, status)
        values (${input.educatorUserId}, ${input.createdByUserId}, ${input.title}, ${input.description}, ${input.status})
        returning *
      `;
      return mapCampaign(row);
    },

    async createLedgerTransaction(input) {
      await client.begin(async (tx) => {
        await tx`
          insert into ledger_transactions (id, reference, description)
          values (${input.id}, ${input.reference}, ${input.description})
        `;
        for (const entry of input.entries) {
          await tx`
            insert into ledger_entries (transaction_id, account_code, direction, amount, currency, campaign_id, payload)
            values (
              ${input.id},
              ${entry.accountCode},
              ${entry.direction},
              ${entry.amount},
              ${entry.currency},
              ${entry.campaignId ?? null},
              ${JSON.stringify(entry.metadata ?? {})}::jsonb
            )
          `;
        }
      });
    },

    async getCampaignById(id) {
      const [row] = await client`select * from campaigns where id = ${id}`;
      return row ? mapCampaign(row) : null;
    },

    async getCampaignTransactions(id) {
      const rows = await client`
        select
          ledger_transactions.id as transaction_id,
          ledger_transactions.reference,
          ledger_transactions.description,
          ledger_transactions.created_at,
          ledger_entries.account_code,
          ledger_entries.direction,
          ledger_entries.amount,
          ledger_entries.currency,
          ledger_entries.campaign_id,
          ledger_entries.payload
        from ledger_transactions
        inner join ledger_entries on ledger_entries.transaction_id = ledger_transactions.id
        where ledger_entries.campaign_id = ${id}
        order by ledger_transactions.created_at asc, ledger_entries.created_at asc
      `;
      const grouped = new Map<string, StoredLedgerTransaction>();
      for (const row of rows) {
        const transactionId = String(row.transaction_id);
        const transaction = grouped.get(transactionId) ?? {
          id: transactionId,
          reference: String(row.reference),
          description: String(row.description),
          createdAt: new Date(String(row.created_at)).toISOString(),
          entries: [],
        };
        transaction.entries.push({
          accountCode: row.account_code,
          direction: row.direction,
          amount: Number(row.amount),
          currency: row.currency,
          campaignId: row.campaign_id ?? undefined,
          metadata: row.payload ?? {},
        });
        grouped.set(transactionId, transaction);
      }
      return [...grouped.values()].map((transaction) =>
        ledgerTransactionSchema.parse(transaction),
      );
    },

    async logAuditEvent(input) {
      await client`
        insert into audit_events (actor_user_id, action, entity_type, entity_id, payload)
        values (${input.actorUserId}, ${input.action}, ${input.entityType}, ${input.entityId}, ${JSON.stringify(input.payload)}::jsonb)
      `;
    },
  };
}

export async function getCampaignDetail(
  repository: CampaignRepository,
  id: string,
) {
  const campaign = await repository.getCampaignById(id);
  if (!campaign) return null;
  const transactions = await repository.getCampaignTransactions(id);
  return campaignDetailSchema.parse({
    campaign,
    totals: summarizeCampaignTotals(transactions),
    transactions,
  });
}
