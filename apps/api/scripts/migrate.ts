import "dotenv/config";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { runMigrations } from "../src/migrations";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const migrationsDir = fileURLToPath(new URL("../migrations", import.meta.url));

async function run() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !arg.startsWith("--baseline-through=")))
    throw new Error("Only --baseline-through=FILENAME is supported.");
  await runMigrations(sql, migrationsDir, {
    baselineThrough: args
      .find((arg) => arg.startsWith("--baseline-through="))
      ?.split("=")[1],
    log: console.log,
  });
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
