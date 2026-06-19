import type { AgentRun, AgentRunStatus } from "@agent-network/shared";
import type { RunMetrics } from "@agent-network/db";
import type { Context } from "../context.js";
import { requireBySlug } from "./agent-service.js";

/**
 * Run service. Records run history and aggregates
 * usage metrics. `simulateRun` is the demo convenience that fabricates a single
 * realistic run so adoption metrics move on screen without a real agent runtime.
 */

export interface RecordRunArgs {
  slug: string;
  status: AgentRunStatus;
  startedAt?: Date;
  finishedAt?: Date;
  durationMs?: number;
  caller?: string;
}

export async function record(ctx: Context, args: RecordRunArgs): Promise<AgentRun> {
  const agent = await requireBySlug(ctx, args.slug);
  return ctx.repositories.runs.record({
    agentId: agent.id,
    status: args.status,
    startedAt: args.startedAt ?? new Date(),
    finishedAt: args.finishedAt,
    durationMs: args.durationMs,
    caller: args.caller,
  });
}

export async function listByAgent(ctx: Context, slug: string): Promise<AgentRun[]> {
  const agent = await requireBySlug(ctx, slug);
  return ctx.repositories.runs.listByAgent(agent.id);
}

/** Per-agent metrics (slug given) or fleet-wide aggregate (slug omitted). */
export async function metrics(ctx: Context, slug?: string): Promise<RunMetrics> {
  if (slug) {
    const agent = await requireBySlug(ctx, slug);
    return ctx.repositories.runs.metrics(agent.id);
  }
  // Fleet-wide: fold every agent's metrics into one aggregate.
  const agents = await ctx.repositories.agents.list({});
  const perAgent = await Promise.all(
    agents.map((agent) => ctx.repositories.runs.metrics(agent.id)),
  );
  return foldMetrics(perAgent);
}

function foldMetrics(parts: RunMetrics[]): RunMetrics {
  let total = 0;
  let succeeded = 0;
  let failed = 0;
  let running = 0;
  let cancelled = 0;
  let durationSum = 0;
  let durationCount = 0;
  for (const part of parts) {
    total += part.total;
    succeeded += part.succeeded;
    failed += part.failed;
    running += part.running;
    cancelled += part.cancelled;
    if (part.avgDurationMs !== null) {
      // Weight each agent's average by the runs that contributed a duration.
      const contributing = part.succeeded + part.failed + part.cancelled;
      durationSum += part.avgDurationMs * contributing;
      durationCount += contributing;
    }
  }
  return {
    total,
    succeeded,
    failed,
    running,
    cancelled,
    avgDurationMs: durationCount > 0 ? durationSum / durationCount : null,
  };
}

/**
 * Demo convenience: records one synthetic completed run so
 * the dashboard adoption trend and per-agent metrics visibly change. Mostly
 * succeeds; occasionally fails to keep the success-rate realistic.
 */
export async function simulateRun(ctx: Context, slug: string): Promise<AgentRun> {
  const failed = Math.random() < 0.2;
  const durationMs = 1500 + Math.floor(Math.random() * 4000);
  const startedAt = new Date();
  const finishedAt = new Date(startedAt.getTime() + durationMs);
  return record(ctx, {
    slug,
    status: failed ? "failed" : "succeeded",
    startedAt,
    finishedAt,
    durationMs,
    caller: "demo-simulator",
  });
}
