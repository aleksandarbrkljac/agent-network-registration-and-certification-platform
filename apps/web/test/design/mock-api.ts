/**
 * Network-level tRPC mock for the mocked design specs.
 *
 * The web app talks to the standalone tRPC API over HTTP via a single
 * `httpBatchLink` pointed at `VITE_API_URL` (http://localhost:3001/trpc in dev).
 * Rather than run the real :3001 backend, these specs intercept every request to
 * that origin with `page.route(...)` and answer with the deterministic fixtures.
 *
 * tRPC batch wire format (no transformer — verified live):
 *   - queries  -> GET  `/<a.b>,<c.d>?batch=1&input={"0":{..},"1":{..}}`
 *   - mutations-> POST `/<a.b>?batch=1` with body `{"0":{..}}`
 *   - response -> `[{ "result": { "data": <data> } }, ...]` positionally aligned
 *
 * The handler parses the comma-joined procedure path, looks each procedure up in
 * a registry keyed by full path (e.g. `dashboard.statusCounts`), and returns the
 * batched array. Mutations resolve to a benign echo so lifecycle/promote buttons
 * never error the page during a design assertion.
 */

import type { Page, Route, Request } from "@playwright/test";
import {
  ACTIVITY_FEED,
  ADOPTION_TREND,
  AGENTS,
  AGENT_METRICS,
  AGENT_REVIEWS,
  AGENT_RUNS,
  CERTIFICATION_STATS,
  FLEET_METRICS,
  MARKETPLACE_LISTINGS,
  STATUS_COUNTS,
  agentDetail,
  marketplaceListing,
} from "./fixtures.js";

/** The dev API origin the SPA batches against (apps/web/.env: VITE_API_URL). */
const API_PORT = "3001";

type ProcedureInput = Record<string, unknown> | undefined;
type ProcedureHandler = (input: ProcedureInput) => unknown;

function slugOf(input: ProcedureInput): string {
  const slug = input && typeof input["slug"] === "string" ? (input["slug"] as string) : "";
  return slug;
}

/**
 * Procedure registry keyed by the full tRPC path. Queries return fixtures;
 * mutations echo a harmless success so the page never surfaces an error banner.
 */
const REGISTRY: Record<string, ProcedureHandler> = {
  // dashboard
  "dashboard.statusCounts": () => STATUS_COUNTS,
  "dashboard.certificationStats": () => CERTIFICATION_STATS,
  "dashboard.adoptionTrend": () => ADOPTION_TREND,
  "dashboard.activityFeed": () => ACTIVITY_FEED,
  // agents
  "agents.list": () => AGENTS,
  "agents.getDetail": (input) => agentDetail(slugOf(input)),
  "agents.getBySlug": (input) =>
    AGENTS.find((a) => a.slug === slugOf(input)) ?? AGENTS[0],
  "agents.promote": (input) => ({
    ...(AGENTS.find((a) => a.slug === slugOf(input)) ?? AGENTS[0]),
    status: "REGISTERED",
  }),
  // runs
  "runs.metrics": (input) => (slugOf(input) ? AGENT_METRICS : FLEET_METRICS),
  "runs.listByAgent": () => AGENT_RUNS,
  "runs.simulateRun": () => AGENT_RUNS[0],
  // marketplace
  "marketplace.listPublished": () => MARKETPLACE_LISTINGS,
  "marketplace.getListing": (input) => marketplaceListing(slugOf(input)),
  // certification
  "certification.listReviews": () => AGENT_REVIEWS,
};

const CORS_HEADERS: Record<string, string> = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

/** Pull the positional input map from a tRPC batch request (GET query or POST body). */
function readBatchInputs(request: Request): Record<string, ProcedureInput> {
  const url = new URL(request.url());
  const raw = url.searchParams.get("input");
  if (raw) {
    try {
      return JSON.parse(raw) as Record<string, ProcedureInput>;
    } catch {
      return {};
    }
  }
  const post = request.postData();
  if (post) {
    try {
      return JSON.parse(post) as Record<string, ProcedureInput>;
    } catch {
      return {};
    }
  }
  return {};
}

function procedurePaths(request: Request): string[] {
  const url = new URL(request.url());
  // tRPC now lives under the `/trpc` base; strip it before parsing procedure paths
  // (e.g. `/trpc/dashboard.statusCounts,agents.list` -> `dashboard.statusCounts,agents.list`).
  return decodeURIComponent(url.pathname)
    .replace(/^\/+/, "")
    .replace(/^trpc\/?/, "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

async function handle(route: Route, request: Request): Promise<void> {
  if (request.method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: CORS_HEADERS, body: "" });
    return;
  }

  const procedures = procedurePaths(request);
  const inputs = readBatchInputs(request);

  const body = procedures.map((procedure, index) => {
    const handler = REGISTRY[procedure];
    if (!handler) {
      // Surface unmocked procedures loudly in the test output, but keep the
      // batch valid so the rest of the page still renders.
      // eslint-disable-next-line no-console
      console.warn(`[mock-api] no fixture for tRPC procedure "${procedure}"`);
      return {
        error: {
          message: `No mock for ${procedure}`,
          code: -32004,
          data: { code: "NOT_FOUND", httpStatus: 404 },
        },
      };
    }
    return { result: { data: handler(inputs[String(index)]) } };
  });

  await route.fulfill({
    status: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  });
}

/**
 * Install the tRPC mock on a page. Call before `page.goto(...)` so the first
 * batch is intercepted. Routes only the :3001 API origin — the Vite app assets
 * on :5173 are left untouched.
 */
export async function installTrpcMock(page: Page): Promise<void> {
  await page.route(
    (url) => url.port === API_PORT,
    (route, request) => {
      void handle(route, request);
    },
  );
}
