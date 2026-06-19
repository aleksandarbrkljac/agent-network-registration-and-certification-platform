import {
  assertTransition,
  DISCOVERY_ENTRY_STATUS,
  MANUAL_ENTRY_STATUS,
  type Agent,
  type AgentCapability,
  type AgentDependency,
  type AgentIo,
  type AgentStatus,
} from "@agent-network/shared";
import type {
  AgentCreateInput,
  AgentListFilter,
  AgentMetadataUpdate,
  CapabilityDraft,
  DependencyDraft,
  IoDraft,
} from "@agent-network/db";
import type { Context } from "../context.js";

/**
 * Agent service. ALL lifecycle status transitions go through
 * this layer, which calls `assertTransition(current, next)` before
 * `repositories.agents.updateStatus`. Routers stay thin: validate → call here →
 * return a `@agent-network/shared` domain type.
 */

/** Loads an agent by slug or throws a not-found error the router maps to 404-ish. */
async function requireBySlug(ctx: Context, slug: string): Promise<Agent> {
  const agent = await ctx.repositories.agents.getBySlug(slug);
  if (!agent) {
    throw new Error(`Agent not found: ${slug}`);
  }
  return agent;
}

/**
 * The single choke point for status changes: assert the transition is legal
 * (throws `IllegalTransitionError`) BEFORE persisting. Every lifecycle method
 * below funnels through here so no router can move an agent illegally.
 */
async function transition(ctx: Context, agent: Agent, next: AgentStatus): Promise<Agent> {
  assertTransition(agent.status, next);
  ctx.logger.info("agent.transition", { slug: agent.slug, from: agent.status, to: next });
  return ctx.repositories.agents.updateStatus(agent.id, next);
}

export async function list(ctx: Context, filter: AgentListFilter): Promise<Agent[]> {
  return ctx.repositories.agents.list(filter);
}

export async function getBySlug(ctx: Context, slug: string): Promise<Agent> {
  return requireBySlug(ctx, slug);
}

/** Full profile bundle for the agent-profile page. */
export interface AgentDetail {
  agent: Agent;
  capabilities: AgentCapability[];
  dependencies: AgentDependency[];
  io: AgentIo[];
}

export async function getDetail(ctx: Context, slug: string): Promise<AgentDetail> {
  const agent = await requireBySlug(ctx, slug);
  const [capabilities, dependencies, io] = await Promise.all([
    ctx.repositories.capabilities.listByAgent(agent.id),
    ctx.repositories.dependencies.listByAgent(agent.id),
    ctx.repositories.io.listByAgent(agent.id),
  ]);
  return { agent, capabilities, dependencies, io };
}

/** DISCOVERED → REGISTERED. */
export async function promote(ctx: Context, slug: string): Promise<Agent> {
  const agent = await requireBySlug(ctx, slug);
  return transition(ctx, agent, "REGISTERED");
}

/**
 * Manual registration enters the lifecycle at REGISTERED. The entry
 * status is taken from the shared `MANUAL_ENTRY_STATUS` const so the rule lives
 * in one place.
 */
export type ManualRegisterInput = Omit<AgentCreateInput, "status" | "sourceType"> & {
  /** Manual registrations have no upstream source; forced to the manual origin. */
  sourceId?: never;
};

export async function registerManual(ctx: Context, input: ManualRegisterInput): Promise<Agent> {
  ctx.logger.info("agent.registerManual", { slug: input.slug });
  return ctx.repositories.agents.create({
    ...input,
    status: MANUAL_ENTRY_STATUS,
    sourceType: "manual",
  });
}

export async function updateMetadata(
  ctx: Context,
  slug: string,
  patch: AgentMetadataUpdate,
): Promise<Agent> {
  const agent = await requireBySlug(ctx, slug);
  return ctx.repositories.agents.updateMetadata(agent.id, patch);
}

export async function declareCapabilities(
  ctx: Context,
  slug: string,
  drafts: CapabilityDraft[],
): Promise<AgentCapability[]> {
  const agent = await requireBySlug(ctx, slug);
  return ctx.repositories.capabilities.replaceForAgent(agent.id, drafts);
}

export async function declareDependencies(
  ctx: Context,
  slug: string,
  drafts: DependencyDraft[],
): Promise<AgentDependency[]> {
  const agent = await requireBySlug(ctx, slug);
  return ctx.repositories.dependencies.replaceForAgent(agent.id, drafts);
}

export async function setIO(ctx: Context, slug: string, drafts: IoDraft[]): Promise<AgentIo[]> {
  const agent = await requireBySlug(ctx, slug);
  return ctx.repositories.io.replaceForAgent(agent.id, drafts);
}

/** Re-exported so the discovery service shares the same entry-status constant. */
export { DISCOVERY_ENTRY_STATUS, requireBySlug, transition };
