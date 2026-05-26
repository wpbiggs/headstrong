import { createHash, randomUUID } from "node:crypto";
import { type Session, computeJobRequestSchema } from "@headstrong/core";
import { buildBalancedLedgerTransaction } from "@headstrong/ledger";
import { env } from "../env";
import { createCampaignRepository } from "../repositories/campaign-repository";
import {
  type ComputeRepository,
  createComputeRepository,
} from "../repositories/compute-repository";

interface ComputeLedgerWriter {
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
}

export class ComputeServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function runProvider(job: ReturnType<typeof computeJobRequestSchema.parse>) {
  if (job.type === "inference") {
    const payload = job.payload as { prompt: string };
    return createHash("sha1").update(payload.prompt).digest("hex").slice(0, 16);
  }
  const payload = job.payload as { candidate: string; rubric: string };
  const score =
    ((payload.candidate.length + payload.rubric.length) % 100) / 100;
  return score.toFixed(2);
}

function runValidator(
  job: ReturnType<typeof computeJobRequestSchema.parse>,
  output: string,
) {
  if (job.type === "inference") {
    const payload = job.payload as { expectedOutput?: string };
    const valid = payload.expectedOutput
      ? payload.expectedOutput === output
      : true;
    return { valid, score: valid ? 1 : 0, penaltyApplied: !valid };
  }
  const payload = job.payload as { expectedScore?: number };
  const numeric = Number(output);
  const valid =
    payload.expectedScore === undefined
      ? true
      : Math.abs(payload.expectedScore - numeric) < 0.01;
  return { valid, score: valid ? numeric : 0, penaltyApplied: !valid };
}

export function createComputeService(
  repository: ComputeRepository = createComputeRepository(),
  ledgerRepository: ComputeLedgerWriter = createCampaignRepository(),
) {
  return {
    async scheduleJob(user: Session, input: unknown) {
      if (!["admin", "educator"].includes(user.role)) {
        throw new ComputeServiceError("Forbidden.", 403);
      }
      const parsed = computeJobRequestSchema.parse(input);
      const job = await repository.createJob({
        version: parsed.version,
        type: parsed.type,
        payload: parsed.payload as Record<string, unknown>,
        providerId: parsed.providerId,
        validatorId: parsed.validatorId,
      });
      const running = await repository.updateJob(job.id, {
        status: "running",
        result: null,
      });
      const output = runProvider(parsed);
      const validation = runValidator(parsed, output);
      const finalized = await repository.updateJob(job.id, {
        status: validation.valid ? "validated" : "failed",
        result: {
          output,
          score: validation.score,
          valid: validation.valid,
          penaltyApplied: validation.penaltyApplied,
        },
      });

      if (env.ENABLE_COMPUTE_LEDGER) {
        const transaction = buildBalancedLedgerTransaction({
          reference: `compute:${job.id}:${validation.valid ? "reward" : "penalty"}`,
          description: validation.valid ? "Compute reward" : "Compute penalty",
          entries: validation.valid
            ? [
                {
                  accountCode: "compute_reserve",
                  direction: "debit",
                  amount: 1,
                  currency: "USD",
                },
                {
                  accountCode: "compute_rewards",
                  direction: "credit",
                  amount: 1,
                  currency: "USD",
                },
              ]
            : [
                {
                  accountCode: "compute_penalties",
                  direction: "debit",
                  amount: 1,
                  currency: "USD",
                },
                {
                  accountCode: "compute_reserve",
                  direction: "credit",
                  amount: 1,
                  currency: "USD",
                },
              ],
        });
        await ledgerRepository.createLedgerTransaction(transaction);
      }

      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: validation.valid
          ? "compute_job_validated"
          : "compute_job_penalized",
        entityType: "compute_job",
        entityId: finalized.id,
        payload: finalized.result ?? {},
      });
      return finalized;
    },

    async getJob(user: Session, jobId: string) {
      if (!["admin", "educator"].includes(user.role)) {
        throw new ComputeServiceError("Forbidden.", 403);
      }
      const job = await repository.getJobById(jobId);
      if (!job) throw new ComputeServiceError("Job not found.", 404);
      return job;
    },
  };
}
