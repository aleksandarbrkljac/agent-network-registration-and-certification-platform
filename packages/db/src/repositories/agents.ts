import type { Agent, AgentStatus } from "@agent-network/shared";
import { agentStatusSchema } from "@agent-network/shared";
import { prisma } from "../client.js";
import { toAgent } from "../mappers.js";
import type { AgentCreateInput, AgentListFilter, AgentMetadataUpdate } from "./dto.js";

/** Sentinel `sourceKey` for manually-registered agents (no upstream source). */
export const MANUAL_SOURCE_KEY = "manual";

/** Resolves the non-null idempotency key from an optional sourceId. */
function sourceKeyFor(sourceId: string | undefined): string {
  return sourceId ?? MANUAL_SOURCE_KEY;
}

/**
 * `list` with optional status / source / capability filters. Capability search
 * is a case-insensitive substring against capability names (catalog search).
 */
export async function list(filter: AgentListFilter = {}): Promise<Agent[]> {
  const rows = await prisma.agent.findMany({
    where: {
      status: filter.status,
      sourceId: filter.sourceId,
      capabilities: filter.capability
        ? { some: { name: { contains: filter.capability } } }
        : undefined,
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toAgent);
}

export async function getBySlug(slug: string): Promise<Agent | null> {
  // A slug is unique per origin (slug, sourceKey); the same slug can in theory
  // exist across sources, so we return the first match deterministically.
  const row = await prisma.agent.findFirst({
    where: { slug },
    orderBy: { createdAt: "asc" },
  });
  return row ? toAgent(row) : null;
}

export async function getById(id: string): Promise<Agent | null> {
  const row = await prisma.agent.findUnique({ where: { id } });
  return row ? toAgent(row) : null;
}

export async function create(input: AgentCreateInput): Promise<Agent> {
  const row = await prisma.agent.create({
    data: {
      slug: input.slug,
      name: input.name,
      description: input.description ?? "",
      purpose: input.purpose ?? "",
      version: input.version ?? "",
      status: agentStatusSchema.parse(input.status),
      ownerId: input.ownerId ?? null,
      sourceType: input.sourceType,
      sourceKey: sourceKeyFor(input.sourceId),
      sourceId: input.sourceId ?? null,
      sourceRepo: input.sourceRepo ?? null,
      sourcePath: input.sourcePath ?? null,
      sourceCommit: input.sourceCommit ?? null,
      model: input.model ?? null,
      documentation: input.documentation ?? null,
      installInstructions: input.installInstructions ?? null,
      usageGuidance: input.usageGuidance ?? null,
    },
  });
  return toAgent(row);
}

/**
 * Idempotent discovery upsert keyed on `(slug, sourceKey)`. On a
 * repeat scan the existing row is matched and lightly refreshed (name/source
 * coordinates) without clobbering lifecycle status or curated metadata.
 */
export async function upsertDiscovered(input: AgentCreateInput): Promise<Agent> {
  const sourceKey = sourceKeyFor(input.sourceId);
  const row = await prisma.agent.upsert({
    where: { slug_sourceKey: { slug: input.slug, sourceKey } },
    create: {
      slug: input.slug,
      name: input.name,
      description: input.description ?? "",
      purpose: input.purpose ?? "",
      version: input.version ?? "",
      status: agentStatusSchema.parse(input.status),
      ownerId: input.ownerId ?? null,
      sourceType: input.sourceType,
      sourceKey,
      sourceId: input.sourceId ?? null,
      sourceRepo: input.sourceRepo ?? null,
      sourcePath: input.sourcePath ?? null,
      sourceCommit: input.sourceCommit ?? null,
      model: input.model ?? null,
    },
    update: {
      name: input.name,
      description: input.description ?? "",
      sourceRepo: input.sourceRepo ?? null,
      sourcePath: input.sourcePath ?? null,
      sourceCommit: input.sourceCommit ?? null,
      model: input.model ?? null,
    },
  });
  return toAgent(row);
}

export async function updateStatus(id: string, status: AgentStatus): Promise<Agent> {
  const row = await prisma.agent.update({
    where: { id },
    data: { status: agentStatusSchema.parse(status) },
  });
  return toAgent(row);
}

export async function updateMetadata(id: string, patch: AgentMetadataUpdate): Promise<Agent> {
  const row = await prisma.agent.update({
    where: { id },
    data: {
      name: patch.name,
      description: patch.description,
      purpose: patch.purpose,
      version: patch.version,
      model: patch.model,
      ownerId: patch.ownerId,
      documentation: patch.documentation,
      installInstructions: patch.installInstructions,
      usageGuidance: patch.usageGuidance,
    },
  });
  return toAgent(row);
}
