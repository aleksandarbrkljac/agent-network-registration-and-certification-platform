import type { AgentIo } from "@agent-network/shared";
import { ioDirectionSchema } from "@agent-network/shared";
import { prisma } from "../client.js";
import { toIo } from "../mappers.js";
import type { IoDraft } from "./dto.js";

export async function listByAgent(agentId: string): Promise<AgentIo[]> {
  const rows = await prisma.agentIO.findMany({
    where: { agentId },
    orderBy: [{ direction: "asc" }, { name: "asc" }],
  });
  return rows.map(toIo);
}

/** Declarative replace of an agent's IO contract (`setIO`). */
export async function replaceForAgent(agentId: string, drafts: IoDraft[]): Promise<AgentIo[]> {
  await prisma.$transaction([
    prisma.agentIO.deleteMany({ where: { agentId } }),
    prisma.agentIO.createMany({
      data: drafts.map((d) => ({
        agentId,
        direction: ioDirectionSchema.parse(d.direction),
        name: d.name,
        type: d.type,
        description: d.description ?? null,
      })),
    }),
  ]);
  return listByAgent(agentId);
}
