import { createHash } from "node:crypto";
import {
  computeJobRequestSchema,
  computeJobResultSchema,
} from "@headstrong/core";

export function runProviderJob(
  job: ReturnType<typeof computeJobRequestSchema.parse>,
) {
  if (job.type === "inference") {
    const payload = job.payload as { prompt: string };
    return createHash("sha1").update(payload.prompt).digest("hex").slice(0, 16);
  }
  const payload = job.payload as { candidate: string; rubric: string };
  const score =
    ((payload.candidate.length + payload.rubric.length) % 100) / 100;
  return score.toFixed(2);
}

export function validateProviderJob(
  job: ReturnType<typeof computeJobRequestSchema.parse>,
  output: string,
) {
  if (job.type === "inference") {
    const payload = job.payload as { expectedOutput?: string };
    const valid = payload.expectedOutput
      ? payload.expectedOutput === output
      : true;
    return computeJobResultSchema.parse({
      output,
      score: valid ? 1 : 0,
      valid,
      penaltyApplied: !valid,
    });
  }
  const payload = job.payload as { expectedScore?: number };
  const numeric = Number(output);
  const valid =
    payload.expectedScore === undefined
      ? true
      : Math.abs(payload.expectedScore - numeric) < 0.01;
  return computeJobResultSchema.parse({
    output,
    score: valid ? numeric : 0,
    valid,
    penaltyApplied: !valid,
  });
}
