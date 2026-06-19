import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient, createTRPCClientForReact, trpc } from "@agent-network/api-client";
import { useState, type ReactNode } from "react";

/**
 * tRPC + React Query provider. Re-exports the shared `trpc` hooks so every page
 * imports them from here (one app-level entry point).
 *
 * The client is built by the shared `@agent-network/api-client` factory, which is
 * configured with NO transformer and a single `httpBatchLink` (the server has no
 * superjson — verified live). Created once via `useState` so it is stable across
 * renders.
 */
export { trpc };

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const [trpcClient] = useState(() => createTRPCClientForReact());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
