/**
 * @agent-network/api-client — the shared tRPC client surface
 * (build-frontend-backends §Phase 3).
 *
 * This package is the single place any frontend app talks to the backend. It
 * re-exports ONLY the `AppRouter` *type* from `@agent-network/api` (a type-only
 * import — no server runtime is ever pulled into the browser bundle) plus the
 * client + React-Query plumbing built against that type.
 *
 * CRITICAL integration fact (verified live): the API standalone server has NO
 * data transformer (no superjson). Every link here is therefore configured with
 * NO transformer and a plain `httpBatchLink({ url })`. Adding a transformer would
 * break every call.
 */

// Type-only re-export: AppRouter is erased at runtime, so importing it here does
// NOT bundle any server code into the web app.
export type { AppRouter } from "@agent-network/api";

export { API_URL } from "./config.js";
export { createClient, type ApiClient } from "./client.js";
export {
  trpc,
  createTRPCClientForReact,
  createQueryClient,
  type RouterInputs,
  type RouterOutputs,
} from "./react.js";
