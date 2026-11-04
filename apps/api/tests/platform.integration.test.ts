import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { Session } from "@headstrong/core";
import { runMigrations } from "../src/migrations";
import { createCampaignRepository } from "../src/repositories/campaign-repository";
import { createCommonsRepository } from "../src/repositories/commons-repository";
import { createComputeRepository } from "../src/repositories/compute-repository";
import { createCampaignService } from "../src/services/campaign-service";
import { createCommonsService } from "../src/services/commons-service";
import { createComputeService } from "../src/services/compute-service";
import { createComputeWorkerService } from "../src/services/compute-worker-service";
import { createDisposableDatabase } from "./learning-fixture";

test("platform PostgreSQL: scoped discovery, atomic due claims, retries and immutable finalization", async (t) => {
  const db = await createDisposableDatabase();
  t.after(() => db.cleanup());
  await runMigrations(
    db.client,
    fileURLToPath(new URL("../migrations", import.meta.url)),
  );
  const campaigns = createCampaignRepository(db.client);
  const compute = createComputeRepository(db.client);
  async function actor(role: Session["role"]): Promise<Session> {
    const id = randomUUID();
    const email = `platform-${id}@example.test`;
    await db.client`insert into users (id, email, role) values (${id}, ${email}, ${role})`;
    return { sub: id, email, role, sessionId: randomUUID() };
  }
  const admin = await actor("admin");
  const educator = await actor("educator");
  const otherEducator = await actor("educator");
  const campaignService = createCampaignService(campaigns);
  await t.test(
    "Commons authoring persists tags, attribution and filters; unauthorized/invalid writes fail",
    async () => {
      const commons = createCommonsService(createCommonsRepository(db.client));
      const input = {
        title: "Synthetic curriculum",
        slug: "synthetic-original",
        summary: "Local authoring fixture",
        subject: "math",
        gradeBand: "3-5",
        license: "CC BY 4.0",
        sourceUrl: "https://example.test/source",
        tags: ["fractions"],
      };
      const asset = await commons.createAsset(educator, input);
      assert.deepEqual(asset.tags, ["fractions"]);
      const remix = await commons.remixAsset(otherEducator, asset.id, {
        title: "Synthetic adaptation",
        slug: "synthetic-adaptation",
        summary: "Local derivative fixture",
        relation: "adapted_from",
      });
      assert.ok(remix);
      assert.equal(remix.parents[0]?.id, asset.id);
      assert.equal(remix.asset.license, asset.license);
      assert.equal(remix.asset.sourceUrl, asset.sourceUrl);
      assert.equal(remix.asset.contributorUserId, otherEducator.sub);
      assert.equal(
        (await commons.listAssets({ tag: "fractions" })).items.length,
        2,
      );
      assert.equal(
        (await commons.listAssets({ subject: "science" })).items.length,
        0,
      );
      for (const role of ["student", "parent"] as const) {
        await assert.rejects(
          () =>
            commons.createAsset(
              { ...educator, role },
              { ...input, slug: `denied-${role}` },
            ),
          /Forbidden/,
        );
        await assert.rejects(
          () =>
            commons.remixAsset({ ...educator, role }, asset.id, {
              title: "Denied",
              slug: `denied-${role}`,
              summary: "Denied",
              relation: "remixed_from",
            }),
          /Forbidden/,
        );
      }
      await assert.rejects(() =>
        commons.createAsset(educator, { ...input, slug: "invalid slug" }),
      );
      await assert.rejects(() => commons.createAsset(educator, input)); // Unique slug prevents duplicate publication.
      const [audit] =
        await db.client`select payload from audit_events where entity_id = ${asset.id}`;
      assert.equal(audit.payload.slug, input.slug);
    },
  );
  await t.test(
    "educator discovery applies ownership/status filters in SQL",
    async () => {
      for (const [owner, status] of [
        [educator, "live"],
        [educator, "closed"],
        [otherEducator, "live"],
      ] as const) {
        await campaigns.createCampaign({
          educatorUserId: owner.sub,
          createdByUserId: admin.sub,
          title: "Synthetic platform fixture",
          description: "No real participant data",
          status,
        });
      }
      assert.equal(
        (await campaignService.listCampaigns(admin, {})).items.length,
        3,
      );
      const own = await campaignService.listCampaigns(educator, {
        status: "live",
      });
      assert.equal(own.items.length, 1);
      assert.equal(own.items[0]?.educatorUserId, educator.sub);
      const other = await campaignService.listCampaigns(otherEducator, {});
      assert.ok(other.items[0]);
      await assert.rejects(
        () => campaignService.getCampaignHistory(educator, other.items[0].id),
        /Forbidden/,
      );
      await assert.rejects(
        () =>
          campaignService.listCampaigns({ ...educator, role: "parent" }, {}),
        /Forbidden/,
      );
    },
  );
  async function enqueue() {
    return compute.createJob({
      version: "v1",
      type: "inference",
      payload: {
        model: "stub",
        prompt: "Synthetic aggregate task",
        maxTokens: 16,
        aggregateOnly: true,
      },
      providerId: "synthetic-provider",
      validatorId: "synthetic-validator",
    });
  }
  await t.test(
    "due-only claim is atomic across concurrent workers and terminal jobs cannot be reopened",
    async () => {
      const job = await enqueue();
      const claims = await Promise.all(
        Array.from({ length: 8 }, () => compute.getNextQueuedJob()),
      );
      assert.equal(claims.filter(Boolean).length, 1);
      assert.equal(claims.find(Boolean)?.retryCount, 1);
      await compute.updateJob(job.id, {
        status: "queued",
        lastError: "transient",
        nextAttemptAt: new Date(Date.now() + 60000).toISOString(),
      });
      assert.equal(await compute.getNextQueuedJob(), null);
      const stored = await compute.getJobById(job.id);
      assert.ok(stored?.nextAttemptAt);
      await db.client`update compute_jobs set next_attempt_at = now() - interval '1 second' where id = ${job.id}`;
      assert.equal((await compute.getNextQueuedJob())?.retryCount, 2);
      const finalized = await compute.updateJob(job.id, {
        status: "succeeded",
        lastError: null,
        nextAttemptAt: null,
      });
      assert.equal(finalized.lastError, null);
      assert.equal(finalized.nextAttemptAt, null);
      await assert.rejects(
        () => compute.updateJob(job.id, { status: "queued" }),
        /immutable/,
      );
      assert.equal(await compute.getNextQueuedJob(), null);
    },
  );
  await t.test(
    "worker persists a typed result, provider run, nullable system audit and one balanced reward",
    async () => {
      const job = await enqueue();
      const worker = createComputeWorkerService(compute, campaigns);
      const result = await worker.processNextQueuedJob();
      assert.equal(result?.id, job.id);
      assert.equal(result?.status, "succeeded");
      assert.equal(await worker.processNextQueuedJob(), null);
      const detail = await createComputeService(compute).getJob(admin, job.id);
      assert.equal(detail.providerRuns.length, 1);
      assert.equal(detail.providerRuns[0]?.attempt, 1);
      assert.deepEqual(
        detail.events.map((event) => event.type),
        ["started", "succeeded"],
      );
      const [reward] =
        await db.client`select count(*)::int as count from ledger_transactions where reference = ${`compute:${job.id}:reward`}`;
      assert.equal(reward.count, 1);
      const [balance] =
        await db.client`select sum(case when direction = 'debit' then amount else -amount end)::text as amount from ledger_entries`;
      assert.equal(Number(balance.amount), 0);
      const [audit] =
        await db.client`select actor_user_id from audit_events where entity_id = ${job.id}`;
      assert.equal(audit.actor_user_id, null);
      const [transaction] =
        await db.client`select * from ledger_transactions where reference = ${`compute:${job.id}:reward`}`;
      await assert.rejects(() =>
        campaigns.createLedgerTransaction({
          id: randomUUID(),
          reference: String(transaction.reference),
          description: "replay",
          entries: [],
        }),
      );
      assert.equal(
        (
          await db.client`select count(*)::int as count from ledger_transactions where reference = ${transaction.reference}`
        )[0].count,
        1,
      );
    },
  );
});
