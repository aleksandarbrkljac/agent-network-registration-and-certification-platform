import { assertTransition, type Agent, type CertificationReview } from "@agent-network/shared";
import type { Context } from "../context.js";
import { requireBySlug, transition } from "./agent-service.js";

/**
 * Certification service. Each reviewer decision both writes a
 * `CertificationReview` row AND drives the lifecycle transition through the
 * shared state machine (via `transition`, which asserts legality first). The
 * review and the status change are conceptually one action, so they live here
 * rather than being split across routers.
 */

/** Common shape for the three terminal decisions. */
interface ReviewArgs {
  slug: string;
  notes: string;
  evaluationOutcome?: string;
}

/** REGISTERED | CHANGES_REQUESTED → IN_REVIEW. No review row — this is a submission. */
export async function submitForReview(ctx: Context, slug: string): Promise<Agent> {
  const agent = await requireBySlug(ctx, slug);
  return transition(ctx, agent, "IN_REVIEW");
}

/**
 * Records a decision review then transitions. The transition legality is asserted
 * FIRST (via the shared state machine), so e.g. approving an agent that is not
 * IN_REVIEW throws an `IllegalTransitionError` BEFORE any review row is written —
 * the review and the status change either both happen or neither does.
 */
async function decide(
  ctx: Context,
  args: ReviewArgs,
  decision: "approved" | "changes_requested" | "rejected",
  nextStatus: Agent["status"],
): Promise<{ agent: Agent; review: CertificationReview }> {
  const agent = await requireBySlug(ctx, args.slug);
  // Gate up front: no review is persisted for an illegal decision.
  assertTransition(agent.status, nextStatus);
  const review = await ctx.repositories.certification.create({
    agentId: agent.id,
    reviewerId: ctx.currentUser.id,
    decision,
    notes: args.notes,
    evaluationOutcome: args.evaluationOutcome,
  });
  const updated = await transition(ctx, agent, nextStatus);
  return { agent: updated, review };
}

export async function approve(
  ctx: Context,
  args: ReviewArgs,
): Promise<{ agent: Agent; review: CertificationReview }> {
  return decide(ctx, args, "approved", "CERTIFIED");
}

export async function requestChanges(
  ctx: Context,
  args: ReviewArgs,
): Promise<{ agent: Agent; review: CertificationReview }> {
  return decide(ctx, args, "changes_requested", "CHANGES_REQUESTED");
}

export async function reject(
  ctx: Context,
  args: ReviewArgs,
): Promise<{ agent: Agent; review: CertificationReview }> {
  return decide(ctx, args, "rejected", "REJECTED");
}

export async function listReviews(ctx: Context, slug: string): Promise<CertificationReview[]> {
  const agent = await requireBySlug(ctx, slug);
  return ctx.repositories.certification.listByAgent(agent.id);
}
