import { createTRPCClient, httpBatchLink, type TRPCClient } from "@trpc/client";
import type { AppRouter } from "@agent-network/api";
import { API_URL } from "./config.js";

/**
 * Framework-agnostic vanilla tRPC client, typed by the backend `AppRouter`.
 * Declared as a named alias so the explicit return-type annotation on
 * `createClient` can reference it (required for portable `.d.ts` emit).
 */
export type ApiClient = TRPCClient<AppRouter>;

/**
 * Vanilla (framework-agnostic) tRPC client factory. Useful for non-React callers,
 * scripts, and tests.
 *
 * NO transformer — the server has none (verified live). `httpBatchLink` only.
 *
 * The return type is annotated explicitly (`ApiClient`) rather than inferred:
 * the inferred type otherwise references deep internal modules of
 * `@agent-network/api`, which TypeScript cannot name portably when this package
 * emits declarations (TS2742).
 */
export function createClient(url: string = API_URL): ApiClient {
  return createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url })],
  });
}
