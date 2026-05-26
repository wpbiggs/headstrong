import { randomUUID } from "node:crypto";
import {
  runProviderJob,
  validateProviderJob,
} from "@headstrong/compute-worker";
import { computeJobRequestSchema } from "@headstrong/core";
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

export function createComputeWorkerService(
  repository: ComputeRepository = createComputeRepository(),
  ledgerRepository: ComputeLedgerWriter = createCampaignRepository(),
) {
  return {
    async processNextQueuedJob() {
      const job = await repository.getNextQueuedJob();
      if (!job) {
        return null;
      }
      const parsed = computeJobRequestSchema.parse({
        version: job.version,
        type: job.type,
        payload: job.payload,
        providerId: job.providerId,
        validatorId: job.validatorId,
      });
      const attempt = job.retryCount + 1;
      await repository.createJobEvent({
        jobId: job.id,
        type: "started",
        payload: { attempt },
      });
      await repository.updateJob(job.id, {
        status: "running",
        retryCount: attempt,
      });
      const startedAt = Date.now();
      try {
        const output = runProviderJob(parsed);
        const result = validateProviderJob(parsed, output);
        await repository.upsertJobResult({ jobId: job.id, ...result });
        const finalized = await repository.updateJob(job.id, {
          status: result.valid ? "succeeded" : "failed",
          result,
          retryCount: attempt,
          lastError: result.valid ? null : "Validation failed",
        });
        await repository.createProviderRun({
          jobId: job.id,
          providerId: job.providerId,
          validatorId: job.validatorId,
          durationMs: Date.now() - startedAt,
          attempt,
        });
        await repository.createJobEvent({
          jobId: job.id,
          type: result.valid ? "succeeded" : "failed",
          payload: result,
        });

        if (env.ENABLE_COMPUTE_LEDGER) {
          const transaction = buildBalancedLedgerTransaction({
            reference: `compute:${job.id}:${result.valid ? "reward" : "penalty"}`,
            description: result.valid ? "Compute reward" : "Compute penalty",
            entries: result.valid
              ? [
                  {
                    accountCode: "compute_reserve",
                    direction: "debit",
                    amount: 1,
                    currency: "USD",
                    metadata: { jobId: job.id, role: "provider" },
                  },
                  {
                    accountCode: "compute_rewards",
                    direction: "credit",
                    amount: 1,
                    currency: "USD",
                    metadata: { jobId: job.id, role: "provider" },
                  },
                ]
              : [
                  {
                    accountCode: "compute_penalties",
                    direction: "debit",
                    amount: 1,
                    currency: "USD",
                    metadata: { jobId: job.id, role: "provider" },
                  },
                  {
                    accountCode: "compute_reserve",
                    direction: "credit",
                    amount: 1,
                    currency: "USD",
                    metadata: { jobId: job.id, role: "provider" },
                  },
                ],
          });
          await ledgerRepository.createLedgerTransaction(transaction);
        }

        await repository.logAuditEvent({
          actorUserId: randomUUID(),
          action: result.valid ? "compute_job_succeeded" : "compute_job_failed",
          entityType: "compute_job",
          entityId: job.id,
          payload: result,
        });
        return finalized;
      } catch (error) {
        const finalized = await repository.updateJob(job.id, {
          status: "failed",
          retryCount: attempt,
          lastError: error instanceof Error ? error.message : "Unknown error",
        });
        await repository.createJobEvent({
          jobId: job.id,
          type: "failed",
          payload: { reason: finalized.lastError },
        });
        return finalized;
      }
    },
  };
}
