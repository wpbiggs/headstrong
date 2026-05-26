import {
  computeJobEventSchema,
  computeJobListResponseSchema,
  computeJobResultSchema,
  computeJobSchema,
} from "@headstrong/core";
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
    retryCount: Number(row.retry_count ?? 0),
    lastError: row.last_error ?? null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  });
}

function encodeCursor(timestamp: string, id: string) {
  return Buffer.from(`${timestamp}|${id}`, "utf8").toString("base64url");
}

function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  const [timestamp, id] = Buffer.from(cursor, "base64url")
    .toString("utf8")
    .split("|");
  if (!timestamp || !id) throw new Error("Invalid cursor.");
  return { timestamp, id };
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
      status: "queued" | "running" | "succeeded" | "failed";
      result?: Record<string, unknown> | null;
      retryCount?: number;
      lastError?: string | null;
    },
  ): Promise<ReturnType<typeof computeJobSchema.parse>>;
  getJobById(
    id: string,
  ): Promise<ReturnType<typeof computeJobSchema.parse> | null>;
  listJobs(input: {
    state?: "queued" | "running" | "succeeded" | "failed";
    cursor?: string;
    limit: number;
  }): Promise<ReturnType<typeof computeJobListResponseSchema.parse>>;
  createJobEvent(input: {
    jobId: string;
    type: "queued" | "started" | "succeeded" | "failed" | "retry_scheduled";
    payload: Record<string, unknown>;
  }): Promise<ReturnType<typeof computeJobEventSchema.parse>>;
  getJobEvents(
    jobId: string,
  ): Promise<Array<ReturnType<typeof computeJobEventSchema.parse>>>;
  upsertJobResult(input: {
    jobId: string;
    output: string;
    score: number;
    valid: boolean;
    penaltyApplied: boolean;
  }): Promise<ReturnType<typeof computeJobResultSchema.parse>>;
  createProviderRun(input: {
    jobId: string;
    providerId: string;
    validatorId: string;
    durationMs: number;
    attempt: number;
  }): Promise<void>;
  getNextQueuedJob(): Promise<ReturnType<typeof computeJobSchema.parse> | null>;
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
        set status = ${input.status}, result = ${input.result ? `${JSON.stringify(input.result)}` : null}::jsonb, retry_count = coalesce(${input.retryCount ?? null}, retry_count), last_error = coalesce(${input.lastError ?? null}, last_error), updated_at = now()
        where id = ${id}
        returning *
      `;
      return mapJob(row);
    },
    async getJobById(id) {
      const [row] = await client`select * from compute_jobs where id = ${id}`;
      return row ? mapJob(row) : null;
    },
    async listJobs(input) {
      const decoded = decodeCursor(input.cursor);
      const cursorFilter = decoded
        ? client`and (created_at, id) < (${decoded.timestamp}::timestamptz, ${decoded.id}::uuid)`
        : client``;
      const stateFilter = input.state
        ? client`and status = ${input.state}`
        : client``;
      const rows = await client`
        select * from compute_jobs
        where true ${stateFilter} ${cursorFilter}
        order by created_at desc, id desc
        limit ${input.limit + 1}
      `;
      const hasMore = rows.length > input.limit;
      const sliced = rows.slice(0, input.limit);
      const last = sliced.at(-1);
      return computeJobListResponseSchema.parse({
        items: sliced.map(mapJob),
        nextCursor:
          hasMore && last
            ? encodeCursor(
                new Date(String(last.created_at)).toISOString(),
                String(last.id),
              )
            : null,
      });
    },
    async createJobEvent(input) {
      const [row] = await client`
        insert into compute_job_events (job_id, type, payload)
        values (${input.jobId}, ${input.type}, ${JSON.stringify(input.payload)}::jsonb)
        returning *
      `;
      return computeJobEventSchema.parse({
        id: row.id,
        jobId: row.job_id,
        type: row.type,
        payload: row.payload ?? {},
        createdAt: new Date(String(row.created_at)).toISOString(),
      });
    },
    async getJobEvents(jobId) {
      const rows = await client`
        select * from compute_job_events
        where job_id = ${jobId}
        order by created_at asc, id asc
      `;
      return rows.map((row) =>
        computeJobEventSchema.parse({
          id: row.id,
          jobId: row.job_id,
          type: row.type,
          payload: row.payload ?? {},
          createdAt: new Date(String(row.created_at)).toISOString(),
        }),
      );
    },
    async upsertJobResult(input) {
      const [row] = await client`
        insert into compute_job_results (job_id, output, score, valid, penalty_applied)
        values (${input.jobId}, ${input.output}, ${input.score}, ${input.valid}, ${input.penaltyApplied})
        on conflict (job_id) do update set output = excluded.output, score = excluded.score, valid = excluded.valid, penalty_applied = excluded.penalty_applied
        returning *
      `;
      return computeJobResultSchema.parse({
        output: row.output,
        score: Number(row.score),
        valid: row.valid,
        penaltyApplied: row.penalty_applied,
      });
    },
    async createProviderRun(input) {
      await client`
        insert into provider_runs (job_id, provider_id, validator_id, duration_ms, attempt)
        values (${input.jobId}, ${input.providerId}, ${input.validatorId}, ${input.durationMs}, ${input.attempt})
      `;
    },
    async getNextQueuedJob() {
      const [row] = await client`
        select * from compute_jobs
        where status = 'queued'
        order by created_at asc
        limit 1
      `;
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
