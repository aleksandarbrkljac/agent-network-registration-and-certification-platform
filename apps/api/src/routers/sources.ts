import { sourceInputSchema } from "@agent-network/shared";
import { z } from "zod";
import * as discoveryService from "../services/discovery-service.js";
import { publicProcedure, router, toTRPCError } from "../trpc.js";

/**
 * Sources router: list configured repos, create a new one, and run
 * discovery against one (`scan`). `scan` returns the `DiscoveryRun` summary so the
 * UI can show created/updated counts.
 */
export const sourcesRouter = router({
  list: publicProcedure.query(({ ctx }) => ctx.repositories.sources.list()),

  create: publicProcedure.input(sourceInputSchema).mutation(({ ctx, input }) => {
    return ctx.repositories.sources.create(input);
  }),

  scan: publicProcedure
    .input(z.object({ sourceId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await discoveryService.scan(ctx, input.sourceId);
      } catch (error) {
        throw toTRPCError(error);
      }
    }),
});
