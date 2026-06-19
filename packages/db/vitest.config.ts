import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Repository tests touch a shared SQLite file; run serially so they don't
    // race on schema push / row clears.
    fileParallelism: false,
    globalSetup: ["./test/global-setup.ts"],
    include: ["src/**/*.test.ts"],
    // Worker processes don't inherit env mutations from globalSetup, so pin the
    // isolated test DB here too.
    env: {
      DATABASE_URL: "file:./prisma/test.db",
    },
  },
});
