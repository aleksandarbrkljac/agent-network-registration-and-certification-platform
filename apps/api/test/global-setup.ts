import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Vitest global setup for apps/api: provision a throwaway SQLite database so the
 * service + caller tests never touch the dev seed DB.
 *
 * The Prisma schema lives in @agent-network/db, so we push it from there against
 * a test.db file owned by apps/api. The DATABASE_URL is an absolute file URL so
 * the @agent-network/db Prisma singleton resolves the very same file regardless
 * of which package's cwd it is evaluated in.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const API_ROOT = join(HERE, "..");
const DB_PKG_ROOT = join(API_ROOT, "..", "..", "packages", "db");
const TEST_DB_PATH = join(API_ROOT, "test.db");
const TEST_DB_URL = `file:${TEST_DB_PATH.replace(/\\/g, "/")}`;

function removeDb(): void {
  for (const suffix of ["", "-journal"]) {
    rmSync(`${TEST_DB_PATH}${suffix}`, { force: true });
  }
}

export default function setup(): () => void {
  process.env.DATABASE_URL = TEST_DB_URL;
  removeDb();
  // The Prisma schema + CLI live in @agent-network/db. `apps/api` does not depend
  // on prisma directly, so resolve the binary through pnpm's package filter rather
  // than assuming `prisma` is on PATH. The passed DATABASE_URL takes precedence
  // over the db package's `.env`, so the push targets this throwaway test.db.
  execSync(
    "pnpm --filter @agent-network/db exec prisma db push --skip-generate --accept-data-loss",
    {
      cwd: DB_PKG_ROOT,
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    },
  );

  return () => {
    removeDb();
  };
}
