import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const artifacts = path.join(root, "artifacts/local-verification");
const checks = [];
const servers = [];
const startedAt = new Date().toISOString();
const cloudflare = process.argv.includes("--cloudflare");
const environment = {
  ...process.env,
  TEST_DATABASE_ADMIN_URL:
    process.env.TEST_DATABASE_ADMIN_URL ??
    `postgres://${encodeURIComponent(process.env.USER ?? "postgres")}@127.0.0.1:5432/postgres`,
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
  NEXT_PUBLIC_API_URL: "http://127.0.0.1:4000",
  NEXT_PUBLIC_ENABLE_LEARNING_JOURNEYS: "true",
  MOODLE_BASE_URL: "https://moodle.example.test",
  MOODLE_TOKEN: "unused-fixture",
  ERPNEXT_BASE_URL: "https://erpnext.example.test",
  ERPNEXT_API_KEY: "unused-fixture",
  ERPNEXT_API_SECRET: "unused-fixture",
};
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!environment.PLAYWRIGHT_CHROME_PATH && existsSync(chrome))
  environment.PLAYWRIGHT_CHROME_PATH = chrome;

async function run(name, args, capture = false) {
  console.log(`\n[verify:local] ${name}`);
  const start = Date.now();
  const child = spawn("pnpm", args, {
    cwd: root,
    env: {
      ...environment,
      ...(args[0] === "build" ? { NODE_ENV: "production" } : {}),
    },
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  let output = "";
  if (capture)
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
  const code = await new Promise((resolve) => {
    child.once("error", (error) => {
      console.error(error.message);
      resolve(1);
    });
    child.once("close", (exitCode) => resolve(exitCode ?? 1));
  });
  checks.push({
    name,
    command: ["pnpm", ...args],
    exitCode: code,
    durationMs: Date.now() - start,
  });
  if (capture)
    await writeFile(
      path.join(
        artifacts,
        typeof capture === "string" ? capture : "security-audit.json",
      ),
      output,
    );
  return code;
}

async function ensurePortFree(port) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", () =>
      reject(
        new Error(
          `Port ${port} is already in use; stop that server yourself. No existing process was changed.`,
        ),
      ),
    );
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
  });
}

function startServer(args) {
  const child = spawn("pnpm", args, {
    cwd: root,
    env: {
      ...environment,
      NODE_ENV: args.includes("test:learning:serve")
        ? "test"
        : args.includes("dev:vinext:fixture")
          ? "development"
          : "production",
    },
    stdio: "inherit",
    detached: true,
  });
  servers.push(child);
  return child;
}

async function ready(url, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error(`Fixture server exited before becoming ready: ${url}`);
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out starting local fixture: ${url}`);
}

async function stopServers() {
  await Promise.all(
    servers.map(async (child) => {
      if (child.exitCode !== null) return;
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        return;
      }
      await Promise.race([
        new Promise((resolve) => child.once("close", resolve)),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
    }),
  );
}

for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    stopServers().finally(() => process.exit(130));
  });

await mkdir(artifacts, { recursive: true });
try {
  // Refuse before touching .next/typecheck output if another developer server is running.
  await ensurePortFree(3000);
  await ensurePortFree(4000);
  await run("Lint", ["lint"]);
  await run("Type checking", ["typecheck"]);
  if (cloudflare) {
    await run("API Worker binding types", [
      "--filter",
      "@headstrong/api",
      "typecheck:cloudflare",
    ]);
    await run("Web Worker binding types", [
      "--filter",
      "@headstrong/web",
      "typecheck:cloudflare",
    ]);
    await run("Access and gateway security tests", [
      "--filter",
      "@headstrong/api",
      "test:cloudflare",
    ]);
    await run("API Worker packaging (no upload)", [
      "--filter",
      "@headstrong/api",
      "check:cloudflare",
    ]);
    await run("Cloudflare frontend build", [
      "--filter",
      "@headstrong/web",
      "build:cloudflare",
    ]);
    await run("Web Worker packaging (no upload)", [
      "--filter",
      "@headstrong/web",
      "check:cloudflare",
    ]);
    await run("Built web Worker access gate in workerd", [
      "--filter",
      "@headstrong/api",
      "test:cloudflare:runtime",
    ]);
  }
  await run("Unit and scaffold tests", ["test"]);
  await run("Additional ledger/LMS tests", [
    "--filter",
    "@headstrong/api",
    "exec",
    "node",
    "--import",
    "tsx",
    "--test",
    "../../packages/ledger/src/index.test.ts",
    "../../packages/lms-adapters/src/index.test.ts",
  ]);
  const integration = await run("Disposable PostgreSQL integration tests", [
    "--filter",
    "@headstrong/api",
    "test:integration",
  ]);
  // Never overlap build and typecheck or reuse a developer's running web server.
  const build = await run("Local production web build", ["build"]);
  if (integration === 0 && build === 0) {
    await ensurePortFree(3000);
    await ensurePortFree(4000);
    const api = startServer([
      "--filter",
      "@headstrong/api",
      "test:learning:serve",
    ]);
    await ready("http://127.0.0.1:4000/__fixture", api);
    const web = startServer([
      "--filter",
      "@headstrong/web",
      "start",
      "--hostname",
      "127.0.0.1",
    ]);
    await ready("http://127.0.0.1:3000/learn", web);
    await run("Browser acceptance", ["test:learning:browser"]);
    if (cloudflare) {
      await stopServers();
      servers.length = 0;
      const fixture = startServer([
        "--filter",
        "@headstrong/api",
        "test:learning:serve",
      ]);
      await ready("http://127.0.0.1:4000/__fixture", fixture);
      const vinext = startServer([
        "--filter",
        "@headstrong/web",
        "dev:vinext:fixture",
      ]);
      await ready("http://127.0.0.1:3000/learn", vinext);
      await run("vinext browser compatibility", ["test:learning:browser"]);
    }
  } else {
    checks.push({
      name: "Browser acceptance",
      skipped: true,
      reason: "Build or database integration checks failed.",
      exitCode: 1,
    });
  }
  await run(
    "Production dependency advisory audit",
    ["audit", "--prod", "--json"],
    true,
  );
  if (cloudflare)
    await run(
      "Complete toolchain dependency advisory audit",
      ["audit", "--json"],
      "security-toolchain-audit.json",
    );
} catch (error) {
  checks.push({
    name: "Verification harness",
    exitCode: 1,
    error: error.message,
  });
  console.error(error.message);
} finally {
  await stopServers();
  const passed =
    checks.length > 0 && checks.every((check) => check.exitCode === 0);
  await writeFile(
    path.join(artifacts, "report.json"),
    `${JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), passed, checks }, null, 2)}\n`,
  );
  console.log(`\nLocal report: ${path.join(artifacts, "report.json")}`);
  console.log(
    passed
      ? "All local checks passed."
      : "Some checks failed or were skipped. See the report; no CI or deployment was used.",
  );
  process.exitCode = passed ? 0 : 1;
}
