import postgres from "postgres";
export type DatabaseClient = ReturnType<typeof postgres>;
let localClient: DatabaseClient | undefined;

// Node-only default. Workers inject a request-owned client into repositories.
// Importing repositories must not initialize a connection or parse unrelated integrations.
export function getDefaultDatabase(): DatabaseClient {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  localClient ??= postgres(process.env.DATABASE_URL, { max: 10 });
  return localClient;
}
