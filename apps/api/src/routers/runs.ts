import { agentRunStatusSchema } from "@agent-network/shared";
import { z } from "zod";
import * as runService from "../services/run-service.js";
import { publicProcedure, router, toTRPCError } from "../trpc.js";

/**
 * Runs router. Records runs, lists per-agent run
 * history, aggregates metrics, and exposes `simulateRun` so the demo can move the
 * adoption metrics without a real agent runtime.
 */

const slugInput = z.object({ slug: z.string().min(1) });

const recordInput = z.object({
  slug: z.string().min(1),
  status: agentRunStatusSchema,
  startedAt: z.coerce.date().optional(),
  finishedAt: z.coerce.date().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  caller: z.string().optional(),
});

export const runsRouter = router({
  record: publicProcedure.input(recordInput).mutation(async ({ ctx, input }) => {
    try {
      return await runService.record(ctx, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  listByAgent: publicProcedure.input(slugInput).query(async ({ ctx, input }) => {
    try {
      return await runService.listByAgent(ctx, input.slug);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  metrics: publicProcedure
    .input(z.object({ slug: z.string().min(1).optional() }).optional())
    .query(async ({ ctx, input }) => {
      try {
        return await runService.metrics(ctx, input?.slug);
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  simulateRun: publicProcedure.input(slugInput).mutation(async ({ ctx, input }) => {
    try {
      return await runService.simulateRun(ctx, input.slug);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),
});
