import {
  canPublishToMarketplace,
  type Agent,
  type AgentCapability,
  type AgentDependency,
  type AgentIo,
} from "@agent-network/shared";
import type { Context } from "../context.js";
import { requireBySlug } from "./agent-service.js";

/**
 * Marketplace service (README invariant). The load-bearing rule is
 * here: an agent may only be listed/published when it is CERTIFIED, enforced via
 * the shared `canPublishToMarketplace` predicate. This is the service that
 * "prevents non-certified agents in the marketplace".
 *
 * Publishing does not move the lifecycle status (a CERTIFIED agent stays
 * CERTIFIED); it asserts the certification gate and exposes the listing. Listings
 * are therefore derived from `status === CERTIFIED`, so the gate and the catalog
 * can never disagree.
 */

/** Error thrown when a non-certified agent is published — mapped to 4xx by the router. */
export class PublishNotAllowedError extends Error {
  readonly slug: string;
  readonly status: Agent["status"];
  constructor(slug: string, status: Agent["status"]) {
    super(
      `Cannot publish "${slug}" to the marketplace: only CERTIFIED agents may be listed (current status: ${status}).`,
    );
    this.name = "PublishNotAllowedError";
    this.slug = slug;
    this.status = status;
  }
}

/** A marketplace listing is a certified agent plus its install/usage-facing detail. */
export interface MarketplaceListing {
  agent: Agent;
  capabilities: AgentCapability[];
  dependencies: AgentDependency[];
  io: AgentIo[];
}

async function toListing(ctx: Context, agent: Agent): Promise<MarketplaceListing> {
  const [capabilities, dependencies, io] = await Promise.all([
    ctx.repositories.capabilities.listByAgent(agent.id),
    ctx.repositories.dependencies.listByAgent(agent.id),
    ctx.repositories.io.listByAgent(agent.id),
  ]);
  return { agent, capabilities, dependencies, io };
}

/**
 * Publish gate. Throws `PublishNotAllowedError` for any non-CERTIFIED agent.
 * Returns the listing on success so the caller can render it immediately.
 */
export async function publish(ctx: Context, slug: string): Promise<MarketplaceListing> {
  const agent = await requireBySlug(ctx, slug);
  if (!canPublishToMarketplace(agent.status)) {
    ctx.logger.warn("marketplace.publish.rejected", { slug, status: agent.status });
    throw new PublishNotAllowedError(slug, agent.status);
  }
  ctx.logger.info("marketplace.publish", { slug });
  return toListing(ctx, agent);
}

/** All currently-listable agents: CERTIFIED only. */
export async function listPublished(ctx: Context): Promise<MarketplaceListing[]> {
  const certified = await ctx.repositories.agents.list({ status: "CERTIFIED" });
  return Promise.all(certified.map((agent) => toListing(ctx, agent)));
}

/**
 * Detail for one marketplace listing. Returns null when the agent does not exist
 * OR is not certified, so the marketplace can never reveal a non-certified agent.
 */
export async function getListing(ctx: Context, slug: string): Promise<MarketplaceListing | null> {
  const agent = await ctx.repositories.agents.getBySlug(slug);
  if (!agent || !canPublishToMarketplace(agent.status)) {
    return null;
  }
  return toListing(ctx, agent);
}
