import { AGENT_STATUSES, type AgentStatus } from "@agent-network/shared";
import type { Context } from "../context.js";

/**
 * Dashboard service. Read-only aggregations over the
 * repositories for the dashboard surface: inventory by status, certification
 * funnel, an adoption trend from run history, and a recent activity feed.
 */

export type StatusCounts = Record<AgentStatus, number>;

export async function statusCounts(ctx: Context): Promise<StatusCounts> {
  const agents = await ctx.repositories.agents.list({});
  // Seed every status to 0 so the dashboard always renders all eight buckets.
  const counts = Object.fromEntries(AGENT_STATUSES.map((s) => [s, 0])) as StatusCounts;
  for (const agent of agents) {
    counts[agent.status] += 1;
  }
  return counts;
}

export interface CertificationStats {
  certified: number;
  inReview: number;
  changesRequested: number;
  rejected: number;
  /** certified / (everything that reached a review-eligible state), 0..1. */
  certificationRate: number;
}

export async function certificationStats(ctx: Context): Promise<CertificationStats> {
  const counts = await statusCounts(ctx);
  const certified = counts.CERTIFIED + counts.DEPRECATED; // DEPRECATED was once certified
  const inReview = counts.IN_REVIEW;
  const changesRequested = counts.CHANGES_REQUESTED;
  const rejected = counts.REJECTED;
  const reviewed = certified + rejected;
  return {
    certified,
    inReview,
    changesRequested,
    rejected,
    certificationRate: reviewed > 0 ? certified / reviewed : 0,
  };
}

export interface AdoptionPoint {
  date: string;
  runs: number;
}

/**
 * Adoption trend: run counts bucketed by calendar day (UTC) across all agents,
 * ascending. Drives the dashboard adoption chart.
 */
export async function adoptionTrend(ctx: Context): Promise<AdoptionPoint[]> {
  const agents = await ctx.repositories.agents.list({});
  const runsByAgent = await Promise.all(
    agents.map((agent) => ctx.repositories.runs.listByAgent(agent.id, 1000)),
  );
  const byDay = new Map<string, number>();
  for (const runs of runsByAgent) {
    for (const run of runs) {
      const day = run.startedAt.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
  }
  return [...byDay.entries()]
    .map(([date, runs]) => ({ date, runs }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface ActivityItem {
  kind: "run" | "review";
  agentSlug: string;
  summary: string;
  at: Date;
}

/**
 * Recent activity feed: the latest runs and certification reviews across all
 * agents, merged and sorted newest-first. Bounded to `limit` items.
 */
export async function activityFeed(ctx: Context, limit = 20): Promise<ActivityItem[]> {
  const agents = await ctx.repositories.agents.list({});
  const items: ActivityItem[] = [];

  const perAgent = await Promise.all(
    agents.map(async (agent) => {
      const [runs, reviews] = await Promise.all([
        ctx.repositories.runs.listByAgent(agent.id, 10),
        ctx.repositories.certification.listByAgent(agent.id),
      ]);
      return { agent, runs, reviews };
    }),
  );

  for (const { agent, runs, reviews } of perAgent) {
    for (const run of runs) {
      items.push({
        kind: "run",
        agentSlug: agent.slug,
        summary: `${agent.name} run ${run.status}`,
        at: run.startedAt,
      });
    }
    for (const review of reviews) {
      items.push({
        kind: "review",
        agentSlug: agent.slug,
        summary: `${agent.name} review: ${review.decision}`,
        at: review.createdAt,
      });
    }
  }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}
