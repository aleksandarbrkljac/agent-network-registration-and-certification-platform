import { expect, test } from "@playwright/test";
import {
  breakpointFor,
  expectNoHorizontalOverflow,
  gotoMocked,
  gridColumnCount,
} from "./helpers.js";

/**
 * Marketplace (`/marketplace`) responsive design — mocked tRPC.
 *
 * Asserts the listings + detail rail (`grid gap-6 lg:grid-cols-2`) is single
 * column below lg and two columns at desktop, that selecting a listing reveals
 * the detail panel (minimal interaction to reach the visual state), and that the
 * page has no horizontal overflow.
 */
test.describe("Marketplace design", () => {
  test.beforeEach(async ({ page }) => {
    await gotoMocked(page, "/marketplace", "Marketplace");
  });

  test("listings rail uses the breakpoint column count", async ({ page }, testInfo) => {
    const bp = breakpointFor(testInfo);

    await expect(page.getByText(/Listings \(/)).toBeVisible();

    const rail = page.locator("div.grid.gap-6").first();
    expect(await gridColumnCount(rail)).toBe(bp.marketplace.listingsColumns);
  });

  test("selecting a listing reveals the detail panel", async ({ page }) => {
    // Minimal interaction to reach the install/usage visual state.
    await page.getByRole("button", { name: /Metagross/ }).click();

    await expect(page.getByRole("heading", { name: "Metagross", level: 3 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Copy install/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("header reflows to the breakpoint direction", async ({ page }, testInfo) => {
    const bp = breakpointFor(testInfo);
    const headerBar = page.locator("header > div").first();
    await expect(headerBar).toHaveCSS("flex-direction", bp.header.direction);
  });
});
