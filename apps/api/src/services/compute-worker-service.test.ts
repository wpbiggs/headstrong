import assert from "node:assert/strict";
import test from "node:test";
import type { ComputeJob } from "@headstrong/core";
import { env } from "../env";
import type { ComputeRepository } from "../repositories/compute-repository";
import { createComputeWorkerService } from "./compute-worker-service";

type ComputeEventType =
  | "queued"
  | "started"
  | "succeeded"
  | "failed"
  | "retry_scheduled";

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
    nextAttemptAt: null,
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
        lastError:
          input.lastError === undefined ? current.lastError : input.lastError,
        nextAttemptAt: input.nextAttemptAt ?? null,
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
      const created: {
        id: string;
        jobId: string;
        type: ComputeEventType;
        payload: Record<string, unknown>;
        createdAt: string;
      } = {
        id: crypto.randomUUID(),
        jobId: input.jobId,
        type: input.type,
        payload: input.payload,
        createdAt: new Date().toISOString(),
      };
      return created;
    },
    async getJobEvents(jobId) {
      return (events[jobId] ?? []).map((event) => {
        const created: {
          id: string;
          jobId: string;
          type: ComputeEventType;
          payload: Record<string, unknown>;
          createdAt: string;
        } = {
          id: crypto.randomUUID(),
          jobId,
          type: event.type,
          payload: {},
          createdAt: new Date().toISOString(),
        };
        return created;
      });
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
    async getProviderRuns() {
      return [];
    },
    async getNextQueuedJob() {
      const job = [...jobs.values()].find(
        (candidate) =>
          candidate.status === "queued" &&
          (!candidate.nextAttemptAt ||
            Date.parse(candidate.nextAttemptAt) <= Date.now()),
      );
      if (!job) return null;
      const claimed = {
        ...job,
        status: "running" as const,
        retryCount: job.retryCount + 1,
        nextAttemptAt: null,
      };
      jobs.set(job.id, claimed);
      return claimed;
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

test("disabled compute ledger never writes a reward or penalty", async (t) => {
  const original = env.ENABLE_COMPUTE_LEDGER;
  env.ENABLE_COMPUTE_LEDGER = false;
  t.after(() => {
    env.ENABLE_COMPUTE_LEDGER = original;
  });
  const fixture = createRepositoryFixture();
  const worker = createComputeWorkerService(
    fixture.repository,
    fixture.ledgerRepository,
  );
  assert.equal((await worker.processNextQueuedJob())?.status, "succeeded");
  assert.equal(fixture.ledgerRefs.length, 0);
});

test("bounded retries delay due work, exhaust once and never reward exceptions", async () => {
  const fixture = createRepositoryFixture();
  const now = Date.now();
  const worker = createComputeWorkerService(
    fixture.repository,
    fixture.ledgerRepository,
    {
      maxRetries: 2,
      retryBaseMs: 500,
      now: () => now,
      run: () => {
        throw new Error("provider unavailable");
      },
    },
  );
  for (const [attempt, delay] of [
    [1, 500],
    [2, 1000],
    [3, 0],
  ]) {
    const processed = await worker.processNextQueuedJob();
    assert.ok(processed);
    assert.equal(processed?.retryCount, attempt);
    assert.equal(processed?.status, delay ? "queued" : "failed");
    assert.equal(
      processed?.nextAttemptAt,
      delay ? new Date(now + delay).toISOString() : null,
    );
    assert.equal(await worker.processNextQueuedJob(), null);
    if (delay)
      fixture.jobs.set(fixture.jobId, { ...processed, nextAttemptAt: null });
  }
  assert.equal(fixture.ledgerRefs.length, 0);
  assert.deepEqual(
    fixture.events[fixture.jobId]?.map((event) => event.type),
    [
      "started",
      "retry_scheduled",
      "started",
      "retry_scheduled",
      "started",
      "failed",
    ],
  );
});

test("zero retries fails the first attempt", async () => {
  const fixture = createRepositoryFixture();
  const worker = createComputeWorkerService(
    fixture.repository,
    fixture.ledgerRepository,
    {
      maxRetries: 0,
      run: () => {
        throw new Error("failed");
      },
    },
  );
  assert.equal((await worker.processNextQueuedJob())?.status, "failed");
  assert.equal(await worker.processNextQueuedJob(), null);
});

test("validator rejection is terminal and records one penalty rather than retrying", async () => {
  const fixture = createRepositoryFixture();
  const job = fixture.jobs.get(fixture.jobId);
  assert.ok(job);
  fixture.jobs.set(fixture.jobId, {
    ...job,
    payload: { ...job.payload, expectedOutput: "not-the-stub-hash" },
  });
  const worker = createComputeWorkerService(
    fixture.repository,
    fixture.ledgerRepository,
  );
  const processed = await worker.processNextQueuedJob();
  assert.equal(processed?.status, "failed");
  assert.equal(processed?.lastError, "Validation failed");
  assert.equal(processed?.nextAttemptAt, null);
  assert.equal(await worker.processNextQueuedJob(), null);
  assert.deepEqual(fixture.ledgerRefs, [`compute:${fixture.jobId}:penalty`]);
});

test("retry settings reject unbounded or invalid values", () => {
  const fixture = createRepositoryFixture();
  for (const maxRetries of [-1, 11, 0.5, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () =>
        createComputeWorkerService(
          fixture.repository,
          fixture.ledgerRepository,
          { maxRetries },
        ),
      /configuration/,
    );
  }
  for (const retryBaseMs of [0, 60001, Number.NaN]) {
    assert.throws(
      () =>
        createComputeWorkerService(
          fixture.repository,
          fixture.ledgerRepository,
          { retryBaseMs },
        ),
      /configuration/,
    );
  }
});

test("post-finalization ledger, event and audit failures cannot requeue or double-reward", async () => {
  for (const failure of ["ledger", "event", "audit", "run"]) {
    const fixture = createRepositoryFixture();
    const fail = async () => {
      throw new Error("downstream unavailable");
    };
    if (failure === "ledger")
      fixture.ledgerRepository.createLedgerTransaction = async (input) => {
        fixture.ledgerRefs.push(input.reference); // Simulate committed write with lost acknowledgement.
        throw new Error("downstream unavailable");
      };
    if (failure === "audit") fixture.repository.logAuditEvent = fail;
    if (failure === "run") fixture.repository.createProviderRun = fail;
    if (failure === "event") {
      const original = fixture.repository.createJobEvent;
      fixture.repository.createJobEvent = (input) =>
        input.type === "succeeded" ? fail() : original(input);
    }
    const worker = createComputeWorkerService(
      fixture.repository,
      fixture.ledgerRepository,
    );
    await assert.rejects(
      () => worker.processNextQueuedJob(),
      /downstream unavailable/,
    );
    assert.equal(fixture.jobs.get(fixture.jobId)?.status, "succeeded");
    const rewards = fixture.ledgerRefs.length;
    assert.equal(await worker.processNextQueuedJob(), null);
    assert.equal(fixture.ledgerRefs.length, rewards);
  }
});

test("a successful retry clears stale errors and terminal jobs are not selected twice", async () => {
  const fixture = createRepositoryFixture();
  const job = fixture.jobs.get(fixture.jobId);
  assert.ok(job);
  fixture.jobs.set(fixture.jobId, {
    ...job,
    lastError: "old error",
    retryCount: 1,
  });
  const worker = createComputeWorkerService(
    fixture.repository,
    fixture.ledgerRepository,
  );
  const results = await Promise.all([
    worker.processNextQueuedJob(),
    worker.processNextQueuedJob(),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(results.find(Boolean)?.lastError, null);
  assert.equal(fixture.ledgerRefs.length, 1);
});
