import { expect, test } from "@playwright/test";
import {
  breakpointFor,
  expectNoHorizontalOverflow,
  gotoMocked,
  gridColumnCount,
} from "./helpers.js";

/**
 * Agent Profile (`/agents/:slug`) responsive design — mocked tRPC.
 *
 * The densest surface. Uses the certified `metagross` fixture so every section
 * (what/how, capabilities, IO, dependencies, run metrics, reviews) renders.
 * Asserts the "What & how" definition list (`sm:grid-cols-2`) and the run-metrics
 * row (`grid-cols-2 sm:grid-cols-4`) reflow per breakpoint, plus header reflow and
 * no horizontal overflow.
 */
test.describe("Agent profile design", () => {
  test.beforeEach(async ({ page }) => {
    await gotoMocked(page, "/agents/metagross", "Metagross");
  });

  test("header title row and shell reflow per breakpoint", async ({ page }, testInfo) => {
    const bp = breakpointFor(testInfo);

    const headerBar = page.locator("header > div").first();
    await expect(headerBar).toHaveCSS("flex-direction", bp.header.direction);

    // Status badge sits inline with the agent name in the page title block.
    await expect(page.getByText("CERTIFIED")).toBeVisible();
  });

  test("'What & how' grid reflows", async ({ page }, testInfo) => {
    const bp = breakpointFor(testInfo);

    const whatHow = page
      .locator("section", { hasText: "What & how" })
      .locator("dl.grid")
      .first();

    expect(await gridColumnCount(whatHow)).toBe(bp.profile.whatHowColumns);
    await expect(page.getByText("Purpose")).toBeVisible();
  });

  test("run-metrics row reflows", async ({ page }, testInfo) => {
    const bp = breakpointFor(testInfo);

    const metrics = page
      .locator("section", { hasText: "Run history" })
      .locator("dl.grid")
      .first();

    expect(await gridColumnCount(metrics)).toBe(bp.profile.metricsColumns);
  });

  test("dependency graph and run table render with no horizontal overflow", async ({
    page,
  }, testInfo) => {
    const bp = breakpointFor(testInfo);

    // Agent-to-agent dependency renders as a link to the target profile.
    await expect(page.getByRole("link", { name: /Castform/ })).toBeVisible();
    await expect(page.locator("table")).toBeVisible();

    // KNOWN BUG (same root cause as the catalog table): the run-history table
    // overflows the page on the smallest viewport. Documented as expected-fail.
    test.fail(bp.profile.runTableOverflows, "KNOWN BUG: run-history table overflows on mobile");
    await expectNoHorizontalOverflow(page);
  });
});
