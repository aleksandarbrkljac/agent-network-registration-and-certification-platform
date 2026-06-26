/**
 * Shared helpers for the mocked design specs: breakpoint lookup, deterministic
 * page setup, and geometry/layout assertions.
 */

import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { BREAKPOINTS, type Breakpoint, type BreakpointName } from "./breakpoints.js";
import { installTrpcMock } from "./mock-api.js";

/** Resolve the breakpoint config for the current Playwright project. */
export function breakpointFor(testInfo: TestInfo): Breakpoint {
  const name = testInfo.project.name as BreakpointName;
  const breakpoint = BREAKPOINTS[name];
  if (!breakpoint) {
    throw new Error(
      `No breakpoint config for project "${testInfo.project.name}". ` +
        `Expected one of: ${Object.keys(BREAKPOINTS).join(", ")}.`,
    );
  }
  return breakpoint;
}

/**
 * Deterministic page setup: install the tRPC mock, navigate, wait for the page
 * heading, then wait for fonts so font-size/box assertions are stable.
 */
export async function gotoMocked(
  page: Page,
  path: string,
  headingText: string | RegExp,
): Promise<void> {
  await installTrpcMock(page);
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByRole("heading", { name: headingText, level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** Bounding box that is asserted to exist (skill `ensureBox` pattern). */
export async function ensureBox(locator: Locator): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box as { x: number; y: number; width: number; height: number };
}

/**
 * Count the resolved column tracks of a CSS grid. `grid-template-columns`
 * computes to a space-separated list of track sizes (e.g. "100px 100px"), so the
 * token count is the rendered column count.
 */
export async function gridColumnCount(locator: Locator): Promise<number> {
  await expect(locator).toBeVisible();
  const template = await locator.evaluate(
    (el) => getComputedStyle(el as HTMLElement).gridTemplateColumns,
  );
  return template
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t !== "none").length;
}

/**
 * Assert the document does not scroll horizontally at the current viewport.
 * Allows 1px of sub-pixel slack.
 */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}
