import type { AgentDependency } from "@agent-network/shared";
import { dependencyKindSchema } from "@agent-network/shared";
import { prisma } from "../client.js";
import { toDependency } from "../mappers.js";
import type { DependencyDraft } from "./dto.js";

export async function listByAgent(agentId: string): Promise<AgentDependency[]> {
  const rows = await prisma.agentDependency.findMany({
    where: { agentId },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
  return rows.map(toDependency);
}

/** Declarative replace of an agent's dependencies (`declareDependencies`). */
export async function replaceForAgent(
  agentId: string,
  drafts: DependencyDraft[],
): Promise<AgentDependency[]> {
  await prisma.$transaction([
    prisma.agentDependency.deleteMany({ where: { agentId } }),
    prisma.agentDependency.createMany({
      data: drafts.map((d) => ({
        agentId,
        kind: dependencyKindSchema.parse(d.kind),
        name: d.name,
        ref: d.ref ?? null,
      })),
    }),
  ]);
  return listByAgent(agentId);
}
