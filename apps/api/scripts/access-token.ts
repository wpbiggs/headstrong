import "dotenv/config";
import { roleSchema } from "@headstrong/core";
import { z } from "zod";
import { createSession, signSession } from "../src/auth";
import { getDefaultDatabase } from "../src/db";
import { createQuestRepository } from "../src/repositories/app-repository";
import { createAuthRepository } from "../src/repositories/auth-repository";

// Trusted operator CLI only. Never expose provisioning as an unauthenticated HTTP route.
async function run() {
  const [action, value, requestedRole] = process.argv.slice(2);
  const auth = createAuthRepository();
  const accounts = createQuestRepository();
  if (action === "revoke-user") {
    const userId = z.string().uuid().parse(value);
    await auth.revokeUser(userId);
    console.log("All access tokens for the account have been revoked.");
    return;
  }
  if (action !== "issue")
    throw new Error(
      "Usage: access-token issue EMAIL ROLE | revoke-user USER_UUID",
    );
  const email = z.string().email().parse(value?.trim().toLowerCase());
  const role = roleSchema.parse(requestedRole);
  const existing = await accounts.findUserByEmail(email);
  if (existing && existing.role !== role)
    throw new Error(
      "Existing account role differs; role changes require a separate audited operation.",
    );
  const user = existing ?? (await accounts.createUser(email, role));
  const token = await signSession(
    await createSession(user.id, user.email, user.role),
  );
  // This is a credential, deliberately emitted only to the operator's stdout, never to audit.
  console.log(token);
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => getDefaultDatabase().end());
