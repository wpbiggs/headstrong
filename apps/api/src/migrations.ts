import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { DatabaseClient } from "./db";

export async function readMigrations(directory: string) {
  const names = (await readdir(directory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  return Promise.all(
    names.map(async (name) => {
      const source = await readFile(path.join(directory, name), "utf8");
      // 0012 shipped with an outer transaction. The runner owns transactions now.
      const sql = source.replace(/^\s*begin;([\s\S]*)commit;\s*$/i, "$1");
      return {
        name,
        sql,
        checksum: createHash("sha256").update(source).digest("hex"),
      };
    }),
  );
}

export async function runMigrations(
  client: DatabaseClient,
  directory: string,
  options: { baselineThrough?: string; log?: (message: string) => void } = {},
) {
  const migrations = await readMigrations(directory);
  const connection = await client.reserve();
  async function transaction(work: (tx: typeof connection) => Promise<void>) {
    await connection.unsafe("begin");
    try {
      await work(connection);
      await connection.unsafe("commit");
    } catch (error) {
      await connection.unsafe("rollback");
      throw error;
    }
  }
  try {
    // Session-scoped lock serializes both bootstrap and upgrades across processes.
    await connection`select pg_advisory_lock(734903221)`;
    const [history] =
      await connection`select to_regclass('public.headstrong_migrations') as name`;
    const [legacy] =
      await connection`select to_regclass('public.users') as name`;
    if (!history.name && legacy.name && !options.baselineThrough) {
      throw new Error(
        "Untracked legacy schema: inspect a backup, then explicitly select --baseline-through=LAST_APPLIED_FILE. No migrations applied.",
      );
    }
    if (
      options.baselineThrough &&
      (history.name ||
        !legacy.name ||
        !migrations.some(
          (migration) => migration.name === options.baselineThrough,
        ))
    ) {
      throw new Error(
        "Baseline requires an untracked existing schema and an exact migration filename.",
      );
    }
    await transaction(async (tx) => {
      await tx`create table if not exists headstrong_migrations (
        name text primary key, checksum text not null, baselined boolean not null default false,
        applied_at timestamptz not null default now()
      )`;
      if (options.baselineThrough) {
        for (const migration of migrations.filter(
          (item) => item.name <= (options.baselineThrough ?? ""),
        )) {
          await tx`insert into headstrong_migrations (name, checksum, baselined)
            values (${migration.name}, ${migration.checksum}, true)`;
        }
      }
    });
    const applied =
      await connection`select name, checksum from headstrong_migrations order by name`;
    // Validate the whole history before applying anything new.
    for (const record of applied) {
      if (
        migrations.find((migration) => migration.name === record.name)
          ?.checksum !== record.checksum
      ) {
        throw new Error(
          `Migration missing or changed after application: ${record.name}`,
        );
      }
    }
    const latest = applied.at(-1)?.name as string | undefined;
    const pending = migrations.filter(
      (item) => !applied.some((record) => record.name === item.name),
    );
    if (latest && pending.some((item) => item.name < latest))
      throw new Error("Out-of-order migration refused.");
    for (const migration of pending) {
      options.log?.(`Applying ${migration.name}`);
      await transaction(async (tx) => {
        await tx.unsafe(migration.sql);
        await tx`insert into headstrong_migrations (name, checksum) values (${migration.name}, ${migration.checksum})`;
      });
    }
    return {
      applied: pending.map((item) => item.name),
      baselinedThrough: options.baselineThrough ?? null,
    };
  } finally {
    try {
      await connection`select pg_advisory_unlock(734903221)`;
    } finally {
      connection.release();
    }
  }
}
