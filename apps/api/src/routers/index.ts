import { router } from "../trpc.js";
import { agentsRouter } from "./agents.js";
import { certificationRouter } from "./certification.js";
import { dashboardRouter } from "./dashboard.js";
import { marketplaceRouter } from "./marketplace.js";
import { runsRouter } from "./runs.js";
import { sourcesRouter } from "./sources.js";

/**
 * Root tRPC router. Merges every domain router. `AppRouter` is the
 * type the shared api-client (M5) re-exports for end-to-end type safety.
 */
export const appRouter = router({
  sources: sourcesRouter,
  agents: agentsRouter,
  certification: certificationRouter,
  marketplace: marketplaceRouter,
  runs: runsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
