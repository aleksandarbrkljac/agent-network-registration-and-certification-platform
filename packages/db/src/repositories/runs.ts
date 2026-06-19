import type { AgentRun } from "@agent-network/shared";
import { agentRunStatusSchema } from "@agent-network/shared";
import { prisma } from "../client.js";
import { toRun } from "../mappers.js";
import type { RunDraft, RunMetrics } from "./dto.js";

/** Records a single run ("simulate run"). */
export async function record(draft: RunDraft): Promise<AgentRun> {
  const row = await prisma.agentRun.create({
    data: {
      agentId: draft.agentId,
      status: agentRunStatusSchema.parse(draft.status),
      startedAt: draft.startedAt,
      finishedAt: draft.finishedAt ?? null,
      durationMs: draft.durationMs ?? null,
      caller: draft.caller ?? null,
    },
  });
  return toRun(row);
}

export async function listByAgent(agentId: string, limit = 50): Promise<AgentRun[]> {
  const rows = await prisma.agentRun.findMany({
    where: { agentId },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
  return rows.map(toRun);
}

/**
 * Aggregated usage metrics for an agent (profile + dashboard). Computed in the
 * repository so callers receive a clean DTO rather than raw rows.
 */
export async function metrics(agentId: string): Promise<RunMetrics> {
  const [counts, durationAgg] = await Promise.all([
    prisma.agentRun.groupBy({
      by: ["status"],
      where: { agentId },
      _count: { _all: true },
    }),
    prisma.agentRun.aggregate({
      where: { agentId, durationMs: { not: null } },
      _avg: { durationMs: true },
    }),
  ]);

  const byStatus = new Map(counts.map((c) => [c.status, c._count._all]));
  const succeeded = byStatus.get("succeeded") ?? 0;
  const failed = byStatus.get("failed") ?? 0;
  const running = byStatus.get("running") ?? 0;
  const cancelled = byStatus.get("cancelled") ?? 0;

  return {
    total: succeeded + failed + running + cancelled,
    succeeded,
    failed,
    running,
    cancelled,
    avgDurationMs: durationAgg._avg.durationMs ?? null,
  };
}
