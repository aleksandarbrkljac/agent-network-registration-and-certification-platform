import { QueryClient } from "@tanstack/react-query";
import { httpBatchLink, type TRPCClient } from "@trpc/client";
import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@agent-network/api";
import { API_URL } from "./config.js";

/**
 * The `@trpc/react-query` hooks object, typed by the backend `AppRouter`. Apps
 * call `trpc.<router>.<procedure>.useQuery()/useMutation()` against this.
 *
 * Annotated with the public `CreateTRPCReact` type rather than left to inference:
 * the inferred type references deep internal modules (of `@agent-network/api` and
 * `@trpc/react-query`) that TypeScript cannot name portably when this package
 * emits declarations (TS2742).
 */
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();

/**
 * Builds the React tRPC client. NO transformer (the server has none — verified
 * live); a single `httpBatchLink` against the centralized API URL. Return type is
 * annotated explicitly for the same portable-`.d.ts` reason as `trpc` above.
 */
export function createTRPCClientForReact(url: string = API_URL): TRPCClient<AppRouter> {
  return trpc.createClient({
    links: [httpBatchLink({ url })],
  });
}

/** A `QueryClient` with demo-friendly defaults (no aggressive refetch storms). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 10_000,
      },
    },
  });
}

/** End-to-end-typed inputs/outputs per router, e.g. `RouterOutputs["agents"]["list"]`. */
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
