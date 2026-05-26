import assert from "node:assert/strict";
import test from "node:test";
import type { ComputeJob, Session } from "@headstrong/core";
import type { ComputeRepository } from "../repositories/compute-repository";
import { ComputeServiceError, createComputeService } from "./compute-service";

interface LedgerRepositoryStub {
  createLedgerTransaction(input: { reference: string }): Promise<void>;
}

function createSessionFixture(overrides: Partial<Session>): Session {
  return {
    sub: overrides.sub ?? crypto.randomUUID(),
    email: overrides.email ?? "teacher@example.com",
    role: overrides.role ?? "educator",
    sessionId: overrides.sessionId ?? crypto.randomUUID(),
  };
}

function createRepositoryFixture() {
  const jobs = new Map<string, ComputeJob>();
  const auditLogs: string[] = [];
  const ledgerTransactions: string[] = [];

  const repository: ComputeRepository = {
    async createJob(input) {
      const job: ComputeJob = {
        id: crypto.randomUUID(),
        version: input.version,
        type: input.type,
        status: "queued" as const,
        payload: input.payload as ComputeJob["payload"],
        providerId: input.providerId,
        validatorId: input.validatorId,
        result: null,
        retryCount: 0,
        lastError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      jobs.set(job.id, job);
      return job;
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
    async createJobEvent() {
      return {
        id: crypto.randomUUID(),
        jobId: crypto.randomUUID(),
        type: "queued",
        payload: {},
        createdAt: new Date().toISOString(),
      };
    },
    async getJobEvents() {
      return [];
    },
    async upsertJobResult() {
      throw new Error("unused");
    },
    async createProviderRun() {
      throw new Error("unused");
    },
    async getNextQueuedJob() {
      return null;
    },
    async logAuditEvent(input) {
      auditLogs.push(input.action);
    },
  };

  const ledgerRepository: LedgerRepositoryStub = {
    async createLedgerTransaction(input: { reference: string }) {
      ledgerTransactions.push(input.reference);
    },
  };

  return { repository, ledgerRepository, jobs, auditLogs, ledgerTransactions };
}

test("valid inference job is scheduled into queued state", async () => {
  const fixture = createRepositoryFixture();
  const service = createComputeService(fixture.repository);
  const educator = createSessionFixture({});
  const job = await service.scheduleJob(educator, {
    version: "v1",
    type: "inference",
    payload: {
      model: "local",
      prompt: "hello",
      maxTokens: 16,
      aggregateOnly: true,
    },
    providerId: "provider-1",
    validatorId: "validator-1",
  });
  assert.equal(job.status, "queued");
  assert.ok(fixture.auditLogs.includes("compute_job_queued"));
  assert.equal(fixture.ledgerTransactions.length, 0);
});

test("scheduling preserves queued state even with expected output present", async () => {
  const fixture = createRepositoryFixture();
  const service = createComputeService(fixture.repository);
  const educator = createSessionFixture({});
  const job = await service.scheduleJob(educator, {
    version: "v1",
    type: "inference",
    payload: {
      model: "local",
      prompt: "hello",
      expectedOutput: "wrong",
      maxTokens: 16,
      aggregateOnly: true,
    },
    providerId: "provider-1",
    validatorId: "validator-1",
  });
  assert.equal(job.status, "queued");
  assert.ok(fixture.auditLogs.includes("compute_job_queued"));
  assert.equal(fixture.ledgerTransactions.length, 0);
});

test("unauthorized users cannot schedule jobs", async () => {
  const fixture = createRepositoryFixture();
  const service = createComputeService(fixture.repository);
  await assert.rejects(
    () =>
      service.scheduleJob(createSessionFixture({ role: "student" }), {
        version: "v1",
        type: "scoring",
        payload: { candidate: "answer", rubric: "rubric", aggregateOnly: true },
        providerId: "provider-1",
        validatorId: "validator-1",
      }),
    (error: unknown) => {
      assert.ok(error instanceof ComputeServiceError);
      assert.equal(error.status, 403);
      return true;
    },
  );
});
