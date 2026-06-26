import { expect, test } from "@playwright/test";
import {
  breakpointFor,
  expectNoHorizontalOverflow,
  gotoMocked,
  gridColumnCount,
} from "./helpers.js";

/**
 * Dashboard (`/`) responsive design — mocked tRPC.
 *
 * Runs under every breakpoint project (Mobile / Tablet / Desktop). Asserts the
 * app-shell header reflow, the inventory tile grid (`grid-cols-2 sm:grid-cols-4
 * lg:grid-cols-8`), the certification/run-metrics split (`lg:grid-cols-2`), and
 * that the adoption + activity sections render without horizontal overflow.
 */
test.describe("Dashboard design", () => {
  test.beforeEach(async ({ page }) => {
    await gotoMocked(page, "/", "Dashboard");
  });

  test("app shell header reflows and nav stays visible", async ({ page }, testInfo) => {
    const bp = breakpointFor(testInfo);

    const headerBar = page.locator("header > div").first();
    await expect(headerBar).toHaveCSS("flex-direction", bp.header.direction);

    // The nav is always-on in this app (no hamburger collapse); links stay reachable.
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("link", { name: "Catalog" })).toBeVisible();
  });

  test("inventory tiles use the breakpoint column count", async ({ page }, testInfo) => {
    const bp = breakpointFor(testInfo);

    const statusGrid = page
      .locator("section", { hasText: "Inventory by status" })
      .locator(".grid")
      .first();

    expect(await gridColumnCount(statusGrid)).toBe(bp.dashboard.statusColumns);
  });

  test("certification + run-metrics split stacks below lg", async ({ page }, testInfo) => {
    const bp = breakpointFor(testInfo);

    const splitRow = page.locator("div.grid.gap-6").first();
    expect(await gridColumnCount(splitRow)).toBe(bp.dashboard.certRunsColumns);

    await expect(page.getByText("Certification rate")).toBeVisible();
    await expect(page.getByText("Total runs")).toBeVisible();
  });

  test("adoption + activity sections render with no horizontal overflow", async ({ page }) => {
    await expect(page.getByRole("img", { name: "Adoption trend" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent activity" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
