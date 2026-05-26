import assert from "node:assert/strict";
import test from "node:test";
import type { ComputeJob } from "@headstrong/core";
import type { ComputeRepository } from "../repositories/compute-repository";
import { createComputeWorkerService } from "./compute-worker-service";

type ComputeEventType = "queued" | "started" | "succeeded" | "failed" | "retry_scheduled";

interface ComputeLedgerWriterStub {
  createLedgerTransaction(input: { reference: string }): Promise<void>;
}

function createRepositoryFixture() {
  const jobs = new Map<string, ComputeJob>();
  const events: Record<string, Array<{ type: ComputeEventType }>> = {};
  const runs: string[] = [];
  const ledgerRefs: string[] = [];

  const job: ComputeJob = {
    id: crypto.randomUUID(),
    version: "v1",
    type: "inference",
    status: "queued",
    payload: {
      model: "local",
      prompt: "hello",
      maxTokens: 16,
      aggregateOnly: true,
    },
    providerId: "provider-1",
    validatorId: "validator-1",
    result: null,
    retryCount: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);

  const repository: ComputeRepository = {
    async createJob() {
      throw new Error("unused");
    },
    async updateJob(id, input) {
      const current = jobs.get(id);

      if (!current) {
        throw new Error("Job missing in fixture.");
      }

      const updated: ComputeJob = {
        ...current,
        status: input.status,
        result: (input.result as ComputeJob["result"]) ?? current.result,
        retryCount: input.retryCount ?? current.retryCount,
        lastError: input.lastError ?? current.lastError,
        updatedAt: new Date().toISOString(),
      };
      jobs.set(id, updated);
      return updated;
    },
    async getJobById(id) {
      return jobs.get(id) ?? null;
    },
    async listJobs() {
      return { items: [...jobs.values()], nextCursor: null };
    },
    async createJobEvent(input) {
      events[input.jobId] = [
        ...(events[input.jobId] ?? []),
        { type: input.type },
      ];
      return {
        id: crypto.randomUUID(),
        jobId: input.jobId,
        type: input.type,
        payload: input.payload,
        createdAt: new Date().toISOString(),
      };
    },
    async getJobEvents(jobId) {
      return (events[jobId] ?? []).map((event) => ({
        id: crypto.randomUUID(),
        jobId,
        type: event.type,
        payload: {},
        createdAt: new Date().toISOString(),
      }));
    },
    async upsertJobResult(input) {
      return {
        output: input.output,
        score: input.score,
        valid: input.valid,
        penaltyApplied: input.penaltyApplied,
      };
    },
    async createProviderRun(input) {
      runs.push(`${input.jobId}:${input.attempt}`);
    },
    async getNextQueuedJob() {
      return (
        [...jobs.values()].find((candidate) => candidate.status === "queued") ??
        null
      );
    },
    async logAuditEvent() {},
  };

  const ledgerRepository: ComputeLedgerWriterStub = {
    async createLedgerTransaction(input: { reference: string }) {
      ledgerRefs.push(input.reference);
    },
  };

  return {
    repository,
    ledgerRepository,
    jobs,
    events,
    runs,
    ledgerRefs,
    jobId: job.id,
  };
}

test("worker processes queued job into succeeded state with events and provider run", async () => {
  const fixture = createRepositoryFixture();
  const worker = createComputeWorkerService(
    fixture.repository,
    fixture.ledgerRepository,
  );
  const processed = await worker.processNextQueuedJob();
  assert.equal(processed?.status, "succeeded");
  assert.equal(fixture.events[fixture.jobId]?.[0]?.type, "started");
  assert.ok(fixture.runs.length === 1);
  assert.ok(fixture.ledgerRefs.length === 1);
});
