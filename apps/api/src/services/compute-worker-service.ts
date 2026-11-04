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
  options: {
    run?: typeof runProviderJob;
    maxRetries?: number;
    retryBaseMs?: number;
    now?: () => number;
  } = {},
) {
  const maxRetries = options.maxRetries ?? env.COMPUTE_MAX_RETRIES;
  const retryBaseMs = options.retryBaseMs ?? env.COMPUTE_RETRY_BASE_MS;
  const now = options.now ?? Date.now;
  if (
    !Number.isInteger(maxRetries) ||
    maxRetries < 0 ||
    maxRetries > 10 ||
    !Number.isInteger(retryBaseMs) ||
    retryBaseMs < 1 ||
    retryBaseMs > 60000
  ) {
    throw new Error("Invalid compute retry configuration.");
  }
  return {
    async processNextQueuedJob() {
      const job = await repository.getNextQueuedJob();
      if (!job) {
        return null;
      }
      const attempt = job.retryCount;
      await repository.createJobEvent({
        jobId: job.id,
        type: "started",
        payload: { attempt },
      });
      let result: ReturnType<typeof validateProviderJob>;
      const startedAt = now();
      try {
        const parsed = computeJobRequestSchema.parse({
          version: job.version,
          type: job.type,
          payload: job.payload,
          providerId: job.providerId,
          validatorId: job.validatorId,
        });
        const output = (options.run ?? runProviderJob)(parsed);
        result = validateProviderJob(parsed, output);
      } catch (error) {
        // MAX_RETRIES counts retries after the initial attempt. Cap exponential delay.
        const shouldRetry = attempt <= maxRetries;
        const nextAttemptAt = shouldRetry
          ? new Date(
              now() + Math.min(3600000, retryBaseMs * 2 ** (attempt - 1)),
            ).toISOString()
          : null;
        const finalized = await repository.updateJob(job.id, {
          status: shouldRetry ? "queued" : "failed",
          retryCount: attempt,
          lastError: error instanceof Error ? error.message : "Unknown error",
          nextAttemptAt,
        });
        await repository.createJobEvent({
          jobId: job.id,
          type: shouldRetry ? "retry_scheduled" : "failed",
          payload: {
            reason: finalized.lastError,
            retryCount: attempt,
            nextAttemptAt,
          },
        });
        return finalized;
      }
      // Persistence/reward/audit errors must never requeue a finalized job.
      await repository.upsertJobResult({ jobId: job.id, ...result });
      const finalized = await repository.updateJob(job.id, {
        status: result.valid ? "succeeded" : "failed",
        result,
        retryCount: attempt,
        nextAttemptAt: null,
        lastError: result.valid ? null : "Validation failed",
      });
      await repository.createProviderRun({
        jobId: job.id,
        providerId: job.providerId,
        validatorId: job.validatorId,
        durationMs: now() - startedAt,
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
        actorUserId: null,
        action: result.valid ? "compute_job_succeeded" : "compute_job_failed",
        entityType: "compute_job",
        entityId: job.id,
        payload: result,
      });
      return finalized;
    },
  };
}
