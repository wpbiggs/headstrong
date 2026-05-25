import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { env } from "../src/env";

const sql = postgres(env.DATABASE_URL);
const migrationsDir = path.resolve(process.cwd(), "migrations");

async function run() {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const contents = await readFile(path.join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}`);
    await sql.unsafe(contents);
  }

  await sql.end();
}

run().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
