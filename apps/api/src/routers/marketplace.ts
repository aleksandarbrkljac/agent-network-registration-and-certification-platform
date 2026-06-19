import { z } from "zod";
import * as marketplaceService from "../services/marketplace-service.js";
import { publicProcedure, router, toTRPCError } from "../trpc.js";

/**
 * Marketplace router. `publish` goes through the marketplace service,
 * which enforces the README invariant ("prevent non-certified agents in the
 * marketplace") via `canPublishToMarketplace`. Non-CERTIFIED publishes are
 * rejected with a 4xx — the gate is NOT in this router, only the service.
 */

const slugInput = z.object({ slug: z.string().min(1) });

export const marketplaceRouter = router({
  listPublished: publicProcedure.query(({ ctx }) => marketplaceService.listPublished(ctx)),

  getListing: publicProcedure.input(slugInput).query(({ ctx, input }) => {
    return marketplaceService.getListing(ctx, input.slug);
  }),

  publish: publicProcedure.input(slugInput).mutation(async ({ ctx, input }) => {
    try {
      return await marketplaceService.publish(ctx, input.slug);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),
});
