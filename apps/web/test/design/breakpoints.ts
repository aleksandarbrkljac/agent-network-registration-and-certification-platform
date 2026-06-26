/**
 * Breakpoint matrix for the mocked `test/design` Playwright specs.
 *
 * This is the single source of truth for both the Playwright *projects*
 * (`playwright.config.ts` reads the viewports from here) and the per-breakpoint
 * design expectations the specs assert against.
 *
 * There is no Figma file for this project, so the expectations are derived from
 * the Tailwind default breakpoints used by the app (sm=640, md=768, lg=1024) and
 * the actual responsive class lists in `src/components/Layout.tsx`,
 * `src/pages/DashboardPage.tsx`, `src/pages/MarketplacePage.tsx`, and
 * `src/pages/AgentProfilePage.tsx`. Each value below maps to a concrete
 * `sm:`/`lg:` utility in those files.
 */

export type BreakpointName = "Mobile" | "Tablet" | "Desktop";

export interface Breakpoint {
  name: BreakpointName;
  viewport: { width: number; height: number };

  /** App shell header (`<header> > div`): `flex-col` below sm, `sm:flex-row` at/above. */
  header: {
    direction: "column" | "row";
  };

  /** Dashboard responsive grids. */
  dashboard: {
    /** Inventory tiles: `grid-cols-2 sm:grid-cols-4 lg:grid-cols-8`. */
    statusColumns: number;
    /** Certification + Run-metrics row: single column, `lg:grid-cols-2`. */
    certRunsColumns: number;
  };

  /** Catalog page. */
  catalog: {
    /**
     * KNOWN BUG: the catalog data table has a large intrinsic min-width and is
     * not wrapped in a horizontal-scroll container, so the page overflows
     * horizontally on viewports narrower than the table (~807px). True where the
     * overflow currently occurs; the affected assertions are marked `test.fail`
     * so the suite documents the bug instead of hiding it. See the handoff notes.
     */
    tableOverflows: boolean;
  };

  /** Marketplace listings rail: `grid gap-6 lg:grid-cols-2`. */
  marketplace: {
    listingsColumns: number;
  };

  /** Agent profile responsive grids. */
  profile: {
    /** "What & how" definition list: `grid sm:grid-cols-2`. */
    whatHowColumns: number;
    /** Run-history metrics row: `grid-cols-2 sm:grid-cols-4`. */
    metricsColumns: number;
    /** KNOWN BUG: run-history table overflows on the smallest viewport (same root cause). */
    runTableOverflows: boolean;
  };
}

export const BREAKPOINTS: Record<BreakpointName, Breakpoint> = {
  // Below sm (640): the most compact layout — header stacks, grids collapse.
  Mobile: {
    name: "Mobile",
    viewport: { width: 375, height: 812 },
    header: { direction: "column" },
    dashboard: { statusColumns: 2, certRunsColumns: 1 },
    catalog: { tableOverflows: true },
    marketplace: { listingsColumns: 1 },
    profile: { whatHowColumns: 1, metricsColumns: 2, runTableOverflows: true },
  },
  // sm + md active, lg not yet (640 <= w < 1024): header is a row, mid-density grids.
  Tablet: {
    name: "Tablet",
    viewport: { width: 768, height: 1024 },
    header: { direction: "row" },
    dashboard: { statusColumns: 4, certRunsColumns: 1 },
    catalog: { tableOverflows: true },
    marketplace: { listingsColumns: 1 },
    profile: { whatHowColumns: 2, metricsColumns: 4, runTableOverflows: false },
  },
  // lg active (>= 1024): the widest layout — every `lg:` utility engages.
  Desktop: {
    name: "Desktop",
    viewport: { width: 1440, height: 900 },
    header: { direction: "row" },
    dashboard: { statusColumns: 8, certRunsColumns: 2 },
    catalog: { tableOverflows: false },
    marketplace: { listingsColumns: 2 },
    profile: { whatHowColumns: 2, metricsColumns: 4, runTableOverflows: false },
  },
};

export const BREAKPOINT_LIST: Breakpoint[] = Object.values(BREAKPOINTS);
