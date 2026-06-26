import { defineConfig, devices } from "@playwright/test";
import { BREAKPOINT_LIST } from "./test/design/breakpoints.js";

/**
 * Playwright config for the mocked responsive *design* specs (`test/design`).
 *
 * Isolated from the vitest unit runner: vitest still owns `pnpm test`
 * (component/render tests under `src/**`); this config only drives the
 * breakpoint design suite via `pnpm test:design`.
 *
 * Each breakpoint in `test/design/breakpoints.ts` becomes a Playwright project
 * (Mobile / Tablet / Desktop) so a single `test:design` run exercises the whole
 * matrix. The tRPC API is mocked at the network layer (`test/design/mock-api.ts`),
 * so the suite needs only the Vite dev server on :5173 — no live :3001 backend.
 */

const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./test/design",
  testMatch: "**/*.design.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: BREAKPOINT_LIST.map((bp) => ({
    name: bp.name,
    use: {
      ...devices["Desktop Chrome"],
      viewport: bp.viewport,
    },
  })),
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
