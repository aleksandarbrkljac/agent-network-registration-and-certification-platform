import { expect, test } from "@playwright/test";
import { breakpointFor, ensureBox, expectNoHorizontalOverflow, gotoMocked } from "./helpers.js";

/**
 * Catalog (`/catalog`) responsive design — mocked tRPC.
 *
 * Asserts the filter toolbar renders, the app shell header reflows, and the agent
 * table stays within its card / does not overflow the page.
 *
 * KNOWN RESPONSIVE BUG (documented, not silently patched): the catalog data table
 * has a large intrinsic min-width (~807px) and its card is not a horizontal-scroll
 * container, so the page overflows horizontally below ~808px (Mobile + Tablet).
 * Those assertions are guarded with `test.fail()` keyed off
 * `breakpoint.catalog.tableOverflows`, so the suite records the bug rather than
 * hiding it. When the table card gets `overflow-x-auto`, the guards will flip the
 * tests to "unexpectedly passed" — the signal to delete the guard. See handoff.
 */
test.describe("Catalog design", () => {
  test.beforeEach(async ({ page }) => {
    await gotoMocked(page, "/catalog", "Catalog");
  });

  test("filter toolbar and rows render", async ({ page }) => {
    await expect(page.getByRole("searchbox", { name: "Search agents" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Filter by status" })).toBeVisible();
    await expect(page.getByTestId("catalog-row").first()).toBeVisible();
  });

  test("header reflows to the breakpoint direction", async ({ page }, testInfo) => {
    const bp = breakpointFor(testInfo);
    const headerBar = page.locator("header > div").first();
    await expect(headerBar).toHaveCSS("flex-direction", bp.header.direction);
  });

  test("page has no horizontal overflow", async ({ page }, testInfo) => {
    const bp = breakpointFor(testInfo);
    test.fail(bp.catalog.tableOverflows, "KNOWN BUG: catalog table overflows narrow viewports");
    await expectNoHorizontalOverflow(page);
  });

  test("table stays within its card container", async ({ page }, testInfo) => {
    const bp = breakpointFor(testInfo);
    test.fail(bp.catalog.tableOverflows, "KNOWN BUG: catalog table overflows its card");

    const card = page.locator("table").locator("xpath=ancestor::div[1]");
    const table = page.locator("table");

    const cardBox = await ensureBox(card);
    const tableBox = await ensureBox(table);

    // The table must not bleed past the right edge of the card that frames it.
    expect(Math.round(tableBox.x + tableBox.width)).toBeLessThanOrEqual(
      Math.round(cardBox.x + cardBox.width) + 1,
    );
  });
});
