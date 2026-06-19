import type { Source } from "@agent-network/shared";
import { sourceTypeSchema } from "@agent-network/shared";
import { prisma } from "../client.js";
import { toSource } from "../mappers.js";
import type { SourceDraft } from "./dto.js";

export async function list(): Promise<Source[]> {
  const rows = await prisma.source.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toSource);
}

export async function get(id: string): Promise<Source | null> {
  const row = await prisma.source.findUnique({ where: { id } });
  return row ? toSource(row) : null;
}

export async function create(draft: SourceDraft): Promise<Source> {
  const row = await prisma.source.create({
    data: {
      type: sourceTypeSchema.parse(draft.type),
      repoUrl: draft.repoUrl,
      branch: draft.branch,
      agentsPath: draft.agentsPath,
      enabled: draft.enabled,
    },
  });
  return toSource(row);
}
