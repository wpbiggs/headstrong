import type { Campaign } from "@headstrong/core";
import {
  campaignDetailSchema,
  campaignHistoryResponseSchema,
  campaignSchema,
  ledgerHistoryItemSchema,
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
  getLedgerBalance(accountCode: string, campaignId: string): Promise<number>;
  getLedgerHistory(
    campaignId: string,
    cursor?: string,
    limit?: number,
  ): Promise<ReturnType<typeof campaignHistoryResponseSchema.parse>>;
  getLedgerTotalsByCampaign(
    campaignId: string,
  ): Promise<{
    pledgedUsd: number;
    allocatedUsd: number;
    reservedUsd: number;
    outstandingUsd: number;
  }>;
  logAuditEvent(input: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}

function encodeCursor(
  timestamp: string,
  transactionId: string,
  accountCode: string,
) {
  return Buffer.from(
    `${timestamp}|${transactionId}|${accountCode}`,
    "utf8",
  ).toString("base64url");
}

function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  const [timestamp, transactionId, accountCode] = Buffer.from(
    cursor,
    "base64url",
  )
    .toString("utf8")
    .split("|");
  if (!timestamp || !transactionId || !accountCode)
    throw new Error("Invalid cursor.");
  return { timestamp, transactionId, accountCode };
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

    async getLedgerBalance(accountCode, campaignId) {
      const [row] = await client`
        select
          coalesce(sum(case when direction = 'credit' then amount else 0 end), 0) as credit_total,
          coalesce(sum(case when direction = 'debit' then amount else 0 end), 0) as debit_total
        from ledger_entries
        where account_code = ${accountCode} and campaign_id = ${campaignId}
      `;
      return Number(row?.credit_total ?? 0) - Number(row?.debit_total ?? 0);
    },

    async getLedgerHistory(campaignId, cursor, limit = 20) {
      const decoded = decodeCursor(cursor);
      const cursorFilter = decoded
        ? client`and (ledger_entries.created_at, ledger_transactions.id, ledger_entries.account_code) < (${decoded.timestamp}::timestamptz, ${decoded.transactionId}::uuid, ${decoded.accountCode})`
        : client``;
      const rows = await client`
        select
          ledger_transactions.id as transaction_id,
          ledger_transactions.reference,
          ledger_transactions.description,
          ledger_entries.account_code,
          ledger_entries.direction,
          ledger_entries.amount,
          ledger_entries.currency,
          ledger_entries.created_at,
          ledger_entries.payload
        from ledger_entries
        inner join ledger_transactions on ledger_transactions.id = ledger_entries.transaction_id
        where ledger_entries.campaign_id = ${campaignId}
        ${cursorFilter}
        order by ledger_entries.created_at desc, ledger_transactions.id desc, ledger_entries.account_code desc
        limit ${limit + 1}
      `;
      const hasMore = rows.length > limit;
      const sliced = rows.slice(0, limit);
      const last = sliced.at(-1);
      return campaignHistoryResponseSchema.parse({
        items: sliced.map((row) =>
          ledgerHistoryItemSchema.parse({
            transactionId: row.transaction_id,
            reference: row.reference,
            description: row.description,
            accountCode: row.account_code,
            direction: row.direction,
            amount: Number(row.amount),
            currency: row.currency,
            createdAt: new Date(String(row.created_at)).toISOString(),
            actorUserId: (row.payload as Record<string, unknown> | null)
              ?.actorUserId as string | null,
            note: (row.payload as Record<string, unknown> | null)?.note as
              | string
              | null,
          }),
        ),
        nextCursor:
          hasMore && last
            ? encodeCursor(
                new Date(String(last.created_at)).toISOString(),
                String(last.transaction_id),
                String(last.account_code),
              )
            : null,
      });
    },

    async getLedgerTotalsByCampaign(campaignId) {
      const transactions = await this.getCampaignTransactions(campaignId);
      return summarizeCampaignTotals(transactions);
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
