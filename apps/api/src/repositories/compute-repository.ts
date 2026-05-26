import { computeJobSchema } from "@headstrong/core";
import type { DatabaseClient } from "../db";
import { sql } from "../db";

function mapJob(row: Record<string, unknown>) {
  return computeJobSchema.parse({
    id: row.id,
    version: row.version,
    type: row.type,
    status: row.status,
    payload: row.payload,
    providerId: row.provider_id,
    validatorId: row.validator_id,
    result: row.result ?? null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  });
}

export interface ComputeRepository {
  createJob(input: {
    version: "v1";
    type: "inference" | "scoring";
    payload: Record<string, unknown>;
    providerId: string;
    validatorId: string;
  }): Promise<ReturnType<typeof computeJobSchema.parse>>;
  updateJob(
    id: string,
    input: {
      status: "queued" | "running" | "validated" | "failed";
      result?: Record<string, unknown> | null;
    },
  ): Promise<ReturnType<typeof computeJobSchema.parse>>;
  getJobById(
    id: string,
  ): Promise<ReturnType<typeof computeJobSchema.parse> | null>;
  logAuditEvent(input: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}

export function createComputeRepository(
  client: DatabaseClient = sql,
): ComputeRepository {
  return {
    async createJob(input) {
      const [row] = await client`
        insert into compute_jobs (version, type, status, payload, provider_id, validator_id)
        values (${input.version}, ${input.type}, 'queued', ${JSON.stringify(input.payload)}::jsonb, ${input.providerId}, ${input.validatorId})
        returning *
      `;
      return mapJob(row);
    },
    async updateJob(id, input) {
      const [row] = await client`
        update compute_jobs
        set status = ${input.status}, result = ${input.result ? `${JSON.stringify(input.result)}` : null}::jsonb, updated_at = now()
        where id = ${id}
        returning *
      `;
      return mapJob(row);
    },
    async getJobById(id) {
      const [row] = await client`select * from compute_jobs where id = ${id}`;
      return row ? mapJob(row) : null;
    },
    async logAuditEvent(input) {
      await client`
        insert into audit_events (actor_user_id, action, entity_type, entity_id, payload)
        values (${input.actorUserId}, ${input.action}, ${input.entityType}, ${input.entityId}, ${JSON.stringify(input.payload)}::jsonb)
      `;
    },
  };
}
