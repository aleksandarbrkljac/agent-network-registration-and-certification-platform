import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Vitest global setup: provision an isolated SQLite test database so repository
 * tests never touch the dev seed DB. Pushes the Prisma schema once before the
 * suite runs and tears the file down afterwards.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(HERE, "..");
const TEST_DB_PATH = join(PKG_ROOT, "prisma", "test.db");
const TEST_DB_URL = "file:./prisma/test.db";

function removeDb(): void {
  for (const suffix of ["", "-journal"]) {
    rmSync(`${TEST_DB_PATH}${suffix}`, { force: true });
  }
}

export default function setup(): () => void {
  process.env.DATABASE_URL = TEST_DB_URL;
  removeDb();
  execSync("prisma db push --skip-generate --accept-data-loss", {
    cwd: PKG_ROOT,
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
  });

  return () => {
    removeDb();
  };
}
