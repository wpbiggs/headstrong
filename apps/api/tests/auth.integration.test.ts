import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createSession, signSession, verifySession } from "../src/auth";
import { runMigrations } from "../src/migrations";
import { createQuestRepository } from "../src/repositories/app-repository";
import { createAuthRepository } from "../src/repositories/auth-repository";
import { createDisposableDatabase } from "./learning-fixture";

test("database sessions enforce account roles, expiry and account-wide revocation", async (t) => {
  const db = await createDisposableDatabase();
  t.after(() => db.cleanup());
  await runMigrations(
    db.client,
    fileURLToPath(new URL("../migrations", import.meta.url)),
  );
  const account = await createQuestRepository(db.client).createUser(
    "fixture@example.test",
    "student",
  );
  const repo = createAuthRepository(db.client);
  await assert.rejects(
    signSession(await createSession(account.id, account.email, "admin"), repo),
    /role changed/,
  );
  const session = await createSession(account.id, account.email, account.role);
  const token = await signSession(session, repo);
  assert.equal((await verifySession(token, repo)).role, "student");
  await db.client`update users set role = 'parent' where id = ${account.id}`;
  await assert.rejects(verifySession(token, repo), /account changed/);
  await db.client`update users set role = 'student' where id = ${account.id}`;
  await db.client`update auth_sessions set expires_at = now() - interval '1 minute' where id = ${session.sessionId}`;
  await assert.rejects(verifySession(token, repo), /expired/);
  const tokens = await Promise.all(
    [1, 2].map(async () =>
      signSession(
        await createSession(account.id, account.email, account.role),
        repo,
      ),
    ),
  );
  await repo.revokeUser(account.id);
  for (const candidate of tokens)
    await assert.rejects(verifySession(candidate, repo), /revoked/);
  await db.client`delete from users where id = ${account.id}`;
  assert.equal((await db.client`select * from auth_sessions`).length, 0);
  const execute = promisify(execFile);
  const options = {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, DATABASE_URL: db.url },
  };
  const issued = await execute(
    process.execPath,
    [
      "--import",
      "tsx",
      "scripts/access-token.ts",
      "issue",
      "cli-fixture@example.test",
      "student",
    ],
    options,
  );
  const cliSession = await verifySession(issued.stdout.trim(), repo);
  assert.equal(cliSession.role, "student");
  await assert.rejects(
    execute(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/access-token.ts",
        "issue",
        "cli-fixture@example.test",
        "admin",
      ],
      options,
    ),
  );
  await execute(
    process.execPath,
    [
      "--import",
      "tsx",
      "scripts/access-token.ts",
      "revoke-user",
      cliSession.sub,
    ],
    options,
  );
  await assert.rejects(verifySession(issued.stdout.trim(), repo), /revoked/);
});
