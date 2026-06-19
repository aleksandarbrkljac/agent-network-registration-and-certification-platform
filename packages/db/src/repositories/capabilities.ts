import type { AgentCapability } from "@agent-network/shared";
import { prisma } from "../client.js";
import { toCapability } from "../mappers.js";
import type { CapabilityDraft } from "./dto.js";

export async function listByAgent(agentId: string): Promise<AgentCapability[]> {
  const rows = await prisma.agentCapability.findMany({
    where: { agentId },
    orderBy: { name: "asc" },
  });
  return rows.map(toCapability);
}

/**
 * Declarative replace: clears the agent's existing capabilities and inserts the
 * supplied set in one transaction (`declareCapabilities`). Idempotent
 * — re-running with the same drafts converges to the same rows.
 */
export async function replaceForAgent(
  agentId: string,
  drafts: CapabilityDraft[],
): Promise<AgentCapability[]> {
  await prisma.$transaction([
    prisma.agentCapability.deleteMany({ where: { agentId } }),
    prisma.agentCapability.createMany({
      data: drafts.map((d) => ({ agentId, name: d.name, description: d.description })),
    }),
  ]);
  return listByAgent(agentId);
}
