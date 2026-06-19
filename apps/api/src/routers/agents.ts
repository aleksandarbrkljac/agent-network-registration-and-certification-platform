import {
  agentStatusSchema,
  agentCapabilityInputSchema,
  agentDependencyInputSchema,
  agentIoInputSchema,
} from "@agent-network/shared";
import { z } from "zod";
import * as agentService from "../services/agent-service.js";
import { publicProcedure, router, toTRPCError } from "../trpc.js";

/**
 * Agents router. Thin: validate Zod input → call the agent service →
 * return shared domain types. All lifecycle transitions (promote, registerManual)
 * are enforced by the service via the shared state machine, never here.
 */

const slugInput = z.object({ slug: z.string().min(1) });

// `q` is the catalog capability search; maps to the repo's
// case-insensitive capability-name filter.
const listFilterInput = z
  .object({
    status: agentStatusSchema.optional(),
    q: z.string().min(1).optional(),
    sourceId: z.string().min(1).optional(),
  })
  .optional();

// Child-row drafts drop `agentId` (the slug in the path identifies the agent).
const capabilityDraft = agentCapabilityInputSchema.omit({ agentId: true });
const dependencyDraft = agentDependencyInputSchema.omit({ agentId: true });
const ioDraft = agentIoInputSchema.omit({ agentId: true });

const manualRegisterInput = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  purpose: z.string().optional(),
  version: z.string().optional(),
  ownerId: z.string().optional(),
  model: z.string().optional(),
  documentation: z.string().optional(),
  installInstructions: z.string().optional(),
  usageGuidance: z.string().optional(),
});

const metadataUpdateInput = z.object({
  slug: z.string().min(1),
  patch: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    purpose: z.string().optional(),
    version: z.string().optional(),
    model: z.string().optional(),
    ownerId: z.string().optional(),
    documentation: z.string().optional(),
    installInstructions: z.string().optional(),
    usageGuidance: z.string().optional(),
  }),
});

export const agentsRouter = router({
  list: publicProcedure.input(listFilterInput).query(({ ctx, input }) => {
    return agentService.list(ctx, {
      status: input?.status,
      capability: input?.q,
      sourceId: input?.sourceId,
    });
  }),

  getBySlug: publicProcedure.input(slugInput).query(async ({ ctx, input }) => {
    try {
      return await agentService.getBySlug(ctx, input.slug);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  getDetail: publicProcedure.input(slugInput).query(async ({ ctx, input }) => {
    try {
      return await agentService.getDetail(ctx, input.slug);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  promote: publicProcedure.input(slugInput).mutation(async ({ ctx, input }) => {
    try {
      return await agentService.promote(ctx, input.slug);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  registerManual: publicProcedure.input(manualRegisterInput).mutation(async ({ ctx, input }) => {
    try {
      return await agentService.registerManual(ctx, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  updateMetadata: publicProcedure.input(metadataUpdateInput).mutation(async ({ ctx, input }) => {
    try {
      return await agentService.updateMetadata(ctx, input.slug, input.patch);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  declareCapabilities: publicProcedure
    .input(z.object({ slug: z.string().min(1), capabilities: z.array(capabilityDraft) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await agentService.declareCapabilities(ctx, input.slug, input.capabilities);
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  declareDependencies: publicProcedure
    .input(z.object({ slug: z.string().min(1), dependencies: z.array(dependencyDraft) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await agentService.declareDependencies(ctx, input.slug, input.dependencies);
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  setIO: publicProcedure
    .input(z.object({ slug: z.string().min(1), io: z.array(ioDraft) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await agentService.setIO(ctx, input.slug, input.io);
      } catch (error) {
        throw toTRPCError(error);
      }
    }),
});
