import { z } from "zod";
import * as certificationService from "../services/certification-service.js";
import { publicProcedure, router, toTRPCError } from "../trpc.js";

/**
 * Certification router. Each decision both writes a CertificationReview
 * and transitions the agent's lifecycle status — both happen in the service, so an
 * illegal transition (e.g. approving an agent that isn't IN_REVIEW) is rejected.
 */

const slugInput = z.object({ slug: z.string().min(1) });
const decisionInput = z.object({
  slug: z.string().min(1),
  notes: z.string(),
  evaluationOutcome: z.string().optional(),
});

export const certificationRouter = router({
  submitForReview: publicProcedure.input(slugInput).mutation(async ({ ctx, input }) => {
    try {
      return await certificationService.submitForReview(ctx, input.slug);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  approve: publicProcedure.input(decisionInput).mutation(async ({ ctx, input }) => {
    try {
      return await certificationService.approve(ctx, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  requestChanges: publicProcedure.input(decisionInput).mutation(async ({ ctx, input }) => {
    try {
      return await certificationService.requestChanges(ctx, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  reject: publicProcedure.input(decisionInput).mutation(async ({ ctx, input }) => {
    try {
      return await certificationService.reject(ctx, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  listReviews: publicProcedure.input(slugInput).query(async ({ ctx, input }) => {
    try {
      return await certificationService.listReviews(ctx, input.slug);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),
});
