import type { DiscoveryRun, DiscoveryRunInput } from "@agent-network/shared";
import { prisma } from "../client.js";
import { toDiscoveryRun } from "../mappers.js";

/** Records the outcome of a source scan. */
export async function create(input: DiscoveryRunInput): Promise<DiscoveryRun> {
  const row = await prisma.discoveryRun.create({
    data: {
      sourceId: input.sourceId,
      discoveredCount: input.discoveredCount,
      createdCount: input.createdCount,
      updatedCount: input.updatedCount,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt ?? null,
      durationMs: input.durationMs ?? null,
    },
  });
  return toDiscoveryRun(row);
}

export async function listBySource(sourceId: string, limit = 20): Promise<DiscoveryRun[]> {
  const rows = await prisma.discoveryRun.findMany({
    where: { sourceId },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
  return rows.map(toDiscoveryRun);
}
