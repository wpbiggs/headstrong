import {
  type Session,
  computeJobListResponseSchema,
  computeJobRequestSchema,
} from "@headstrong/core";
import {
  type ComputeRepository,
  createComputeRepository,
} from "../repositories/compute-repository";

export class ComputeServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function createComputeService(
  repository: ComputeRepository = createComputeRepository(),
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
      await repository.createJobEvent({
        jobId: job.id,
        type: "queued",
        payload: { type: job.type },
      });
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "compute_job_queued",
        entityType: "compute_job",
        entityId: job.id,
        payload: { providerId: job.providerId, validatorId: job.validatorId },
      });
      return job;
    },

    async getJob(user: Session, jobId: string) {
      if (!["admin", "educator"].includes(user.role)) {
        throw new ComputeServiceError("Forbidden.", 403);
      }
      const job = await repository.getJobById(jobId);
      if (!job) throw new ComputeServiceError("Job not found.", 404);
      return {
        job,
        events: await repository.getJobEvents(jobId),
      };
    },

    async listJobs(
      user: Session,
      input: {
        state?: "queued" | "running" | "succeeded" | "failed";
        cursor?: string;
        limit: number;
      },
    ) {
      if (!["admin", "educator"].includes(user.role)) {
        throw new ComputeServiceError("Forbidden.", 403);
      }
      return computeJobListResponseSchema.parse(
        await repository.listJobs(input),
      );
    },
  };
}
