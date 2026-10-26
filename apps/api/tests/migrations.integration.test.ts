import assert from "node:assert/strict";
import { copyFile, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readMigrations, runMigrations } from "../src/migrations";
import { createDisposableDatabase } from "./learning-fixture";

const directory = fileURLToPath(new URL("../migrations", import.meta.url));

test("migration history serializes runners, rolls back failed DDL, verifies checksums", async (t) => {
  const db = await createDisposableDatabase();
  t.after(() => db.cleanup());
  const temporary = await mkdtemp(
    path.join(tmpdir(), "headstrong-migrations-"),
  );
  t.after(() => rm(temporary, { recursive: true, force: true }));
  for (const name of await readdir(directory))
    if (name.endsWith(".sql"))
      await copyFile(path.join(directory, name), path.join(temporary, name));
  const results = await Promise.all([
    runMigrations(db.client, temporary),
    runMigrations(db.client, temporary),
  ]);
  assert.equal(
    results.reduce((sum, result) => sum + result.applied.length, 0),
    14,
  );
  await writeFile(
    path.join(temporary, "0015_probe.sql"),
    "create table migration_probe (id int); select missing_column from users;",
  );
  await assert.rejects(runMigrations(db.client, temporary), /missing_column/);
  const [probe] =
    await db.client`select to_regclass('migration_probe') as name`;
  assert.equal(probe.name, null);
  assert.equal(
    (await db.client`select * from headstrong_migrations`).length,
    14,
  );
  await writeFile(
    path.join(temporary, "0015_probe.sql"),
    "create table migration_probe (id int);",
  );
  assert.deepEqual((await runMigrations(db.client, temporary)).applied, [
    "0015_probe.sql",
  ]);
  await writeFile(
    path.join(temporary, "0015_probe.sql"),
    "create table migration_probe (id text);",
  );
  await writeFile(
    path.join(temporary, "0016_later.sql"),
    "create table should_not_apply (id int);",
  );
  await assert.rejects(
    runMigrations(db.client, temporary),
    /changed after application/,
  );
  assert.equal(
    (await db.client`select to_regclass('should_not_apply') as name`)[0].name,
    null,
  );
});

test("legacy schemas require explicit baseline and preserve validated compute jobs on upgrade", async (t) => {
  const db = await createDisposableDatabase();
  t.after(() => db.cleanup());
  for (const migration of (await readMigrations(directory)).filter(
    (item) => item.name <= "0009_compute_jobs.sql",
  ))
    await db.client.unsafe(migration.sql);
  await db.client`insert into compute_jobs (version, type, status, payload, provider_id, validator_id)
    values ('v1', 'inference', 'validated', '{}'::jsonb, 'fixture', 'fixture')`;
  const [learner] =
    await db.client`insert into users (email, role) values ('learner@example.test', 'student') returning id`;
  const [parent] =
    await db.client`insert into users (email, role) values ('parent@example.test', 'parent') returning id`;
  await db.client`insert into quests (id, student_id, parent_id, name, summary, current_state, moderation, needs_educator_review)
    values (gen_random_uuid(), ${learner.id}, ${parent.id}, 'Legacy quest', 'Keep this quest', 'draft',
      ${db.client.json(JSON.stringify({ labels: [], verdict: "pass" }))}, false)`;
  await assert.rejects(
    runMigrations(db.client, directory),
    /Untracked legacy schema/,
  );
  assert.equal(
    (await db.client`select to_regclass('headstrong_migrations') as name`)[0]
      .name,
    null,
  );
  await runMigrations(db.client, directory, {
    baselineThrough: "0009_compute_jobs.sql",
  });
  assert.equal(
    (await db.client`select status from compute_jobs`)[0].status,
    "succeeded",
  );
  assert.equal(
    (await db.client`select moderation from quests`)[0].moderation.verdict,
    "pass",
  );
  assert.equal(
    (
      await db.client`select * from headstrong_migrations where baselined = true`
    ).length,
    9,
  );
  assert.deepEqual((await runMigrations(db.client, directory)).applied, []);
});

test("social migration supports the historical status column", async (t) => {
  const db = await createDisposableDatabase();
  t.after(() => db.cleanup());
  await db.client`create table discovery_posts (id uuid, created_at timestamptz, status text, moderation jsonb)`;
  await db.client`insert into discovery_posts (status, moderation) values ('approved', '{}'::jsonb), ('pending_parent_approval', '{}'::jsonb)`;
  const migration = (await readMigrations(directory)).find(
    (item) => item.name === "0006_social_governance.sql",
  );
  assert.ok(migration);
  await db.client.unsafe(migration.sql);
  assert.deepEqual(
    (await db.client`select state from discovery_posts order by state`).map(
      (row) => row.state,
    ),
    ["live", "pending_parent_approval"],
  );
});
