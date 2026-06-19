import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const HERE = dirname(fileURLToPath(import.meta.url));
// Absolute file URL so the @agent-network/db Prisma client resolves the same
// test.db regardless of which package's cwd it is evaluated in. Must match the
// path computed in test/global-setup.ts.
const TEST_DB_URL = `file:${join(HERE, "test.db").replace(/\\/g, "/")}`;

export default defineConfig({
  test: {
    // Service + caller tests share a single SQLite file; run serially so they
    // don't race on schema push / row clears (mirrors packages/db).
    fileParallelism: false,
    globalSetup: ["./test/global-setup.ts"],
    include: ["src/**/*.test.ts"],
    // Worker processes don't inherit env mutations from globalSetup, so pin the
    // isolated test DB here too.
    env: {
      DATABASE_URL: TEST_DB_URL,
    },
  },
});
