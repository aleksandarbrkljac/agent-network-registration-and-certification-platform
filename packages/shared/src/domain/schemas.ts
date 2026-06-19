import { z } from "zod";
import { agentStatusSchema } from "./status.js";

/**
 * Zod schemas for every domain entity, plus the small reusable
 * enums they share. Persisted entities carry server-generated fields (`id`,
 * timestamps); each exposes a matching `*InputSchema` without those fields so
 * the API layer (a later milestone) can validate create payloads directly.
 *
 * All TypeScript types are derived from the schemas via `z.infer` — there is a
 * single source of truth for shape and runtime validation.
 */

// --- Shared scalar building blocks ------------------------------------------

const idSchema = z.string().min(1);
const nonEmptyString = z.string().min(1);

// --- Reusable enums ---------------------------------------------------------

export const sourceTypeSchema = z.enum(["github", "manual"]);
export type SourceType = z.infer<typeof sourceTypeSchema>;

export const dependencyKindSchema = z.enum(["tool", "datasource", "agent", "package", "skill"]);
export type DependencyKind = z.infer<typeof dependencyKindSchema>;

export const ioDirectionSchema = z.enum(["input", "output"]);
export type IoDirection = z.infer<typeof ioDirectionSchema>;

export const reviewDecisionSchema = z.enum(["approved", "changes_requested", "rejected"]);
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;

export const userRoleSchema = z.enum(["operator", "reviewer", "developer"]);
export type UserRole = z.infer<typeof userRoleSchema>;

// --- Agent ------------------------------------------------------------------

export const agentInputSchema = z.object({
  slug: nonEmptyString,
  name: nonEmptyString,
  description: z.string(),
  purpose: z.string(),
  version: z.string(),
  status: agentStatusSchema,
  ownerId: idSchema.optional(),
  sourceType: sourceTypeSchema,
  // Absent for manually-registered agents that have no upstream repo.
  sourceRepo: z.string().optional(),
  sourcePath: z.string().optional(),
  sourceCommit: z.string().optional(),
  // Free-form model identifier (e.g. "gpt-5.5-high"); never constrained.
  model: z.string().optional(),
  // May be empty until an operator fills the metadata in.
  documentation: z.string().optional(),
  installInstructions: z.string().optional(),
  usageGuidance: z.string().optional(),
});

export const agentSchema = agentInputSchema.extend({
  id: idSchema,
});

export type AgentInput = z.infer<typeof agentInputSchema>;
export type Agent = z.infer<typeof agentSchema>;

// --- AgentCapability --------------------------------------------------------

export const agentCapabilityInputSchema = z.object({
  agentId: idSchema,
  name: nonEmptyString,
  description: z.string(),
});

export const agentCapabilitySchema = agentCapabilityInputSchema.extend({
  id: idSchema,
});

export type AgentCapabilityInput = z.infer<typeof agentCapabilityInputSchema>;
export type AgentCapability = z.infer<typeof agentCapabilitySchema>;

// --- AgentDependency --------------------------------------------------------

export const agentDependencyInputSchema = z.object({
  agentId: idSchema,
  kind: dependencyKindSchema,
  name: nonEmptyString,
  // `ref` points at the dependency target (skill path, agent slug, package
  // name, …); optional because not every mention carries a resolvable ref.
  ref: z.string().optional(),
});

export const agentDependencySchema = agentDependencyInputSchema.extend({
  id: idSchema,
});

export type AgentDependencyInput = z.infer<typeof agentDependencyInputSchema>;
export type AgentDependency = z.infer<typeof agentDependencySchema>;

// --- AgentIO ----------------------------------------------------------------

export const agentIoInputSchema = z.object({
  agentId: idSchema,
  direction: ioDirectionSchema,
  name: nonEmptyString,
  type: z.string(),
  description: z.string().optional(),
});

export const agentIoSchema = agentIoInputSchema.extend({
  id: idSchema,
});

export type AgentIoInput = z.infer<typeof agentIoInputSchema>;
export type AgentIo = z.infer<typeof agentIoSchema>;

// --- CertificationReview ----------------------------------------------------

export const certificationReviewInputSchema = z.object({
  agentId: idSchema,
  reviewerId: idSchema,
  decision: reviewDecisionSchema,
  notes: z.string(),
  evaluationOutcome: z.string().optional(),
});

export const certificationReviewSchema = certificationReviewInputSchema.extend({
  id: idSchema,
  createdAt: z.date(),
});

export type CertificationReviewInput = z.infer<typeof certificationReviewInputSchema>;
export type CertificationReview = z.infer<typeof certificationReviewSchema>;

// --- AgentRun ---------------------------------------------------------------

export const agentRunStatusSchema = z.enum(["succeeded", "failed", "running", "cancelled"]);
export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;

export const agentRunInputSchema = z.object({
  agentId: idSchema,
  status: agentRunStatusSchema,
  startedAt: z.date(),
  finishedAt: z.date().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  caller: z.string().optional(),
});

export const agentRunSchema = agentRunInputSchema.extend({
  id: idSchema,
});

export type AgentRunInput = z.infer<typeof agentRunInputSchema>;
export type AgentRun = z.infer<typeof agentRunSchema>;

// --- Source -----------------------------------------------------------------

export const sourceInputSchema = z.object({
  type: sourceTypeSchema,
  repoUrl: z.string(),
  branch: z.string(),
  agentsPath: z.string(),
  enabled: z.boolean(),
});

export const sourceSchema = sourceInputSchema.extend({
  id: idSchema,
});

export type SourceInput = z.infer<typeof sourceInputSchema>;
export type Source = z.infer<typeof sourceSchema>;

// --- DiscoveryRun -----------------------------------------------------------

export const discoveryRunInputSchema = z.object({
  sourceId: idSchema,
  discoveredCount: z.number().int().nonnegative(),
  createdCount: z.number().int().nonnegative(),
  updatedCount: z.number().int().nonnegative(),
  startedAt: z.date(),
  finishedAt: z.date().optional(),
  durationMs: z.number().int().nonnegative().optional(),
});

export const discoveryRunSchema = discoveryRunInputSchema.extend({
  id: idSchema,
});

export type DiscoveryRunInput = z.infer<typeof discoveryRunInputSchema>;
export type DiscoveryRun = z.infer<typeof discoveryRunSchema>;

// --- User -------------------------------------------------------------------

export const userInputSchema = z.object({
  name: nonEmptyString,
  email: z.string().email(),
  role: userRoleSchema,
});

export const userSchema = userInputSchema.extend({
  id: idSchema,
});

export type UserInput = z.infer<typeof userInputSchema>;
export type User = z.infer<typeof userSchema>;
