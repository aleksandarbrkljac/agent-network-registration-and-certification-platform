import type {
  Agent as PrismaAgent,
  AgentCapability as PrismaAgentCapability,
  AgentDependency as PrismaAgentDependency,
  AgentIO as PrismaAgentIO,
  AgentRun as PrismaAgentRun,
  CertificationReview as PrismaCertificationReview,
  DiscoveryRun as PrismaDiscoveryRun,
  Source as PrismaSource,
  User as PrismaUser,
} from "@prisma/client";
import {
  agentSchema,
  agentCapabilitySchema,
  agentDependencySchema,
  agentIoSchema,
  agentRunSchema,
  certificationReviewSchema,
  discoveryRunSchema,
  sourceSchema,
  userSchema,
  type Agent,
  type AgentCapability,
  type AgentDependency,
  type AgentIo,
  type AgentRun,
  type CertificationReview,
  type DiscoveryRun,
  type Source,
  type User,
} from "@agent-network/shared";

/**
 * Row ↔ domain mapping boundary.
 *
 * Every Prisma row leaves this package as a `@agent-network/shared` domain type.
 * The enum-ish columns (status, kind, direction, decision, role, source type,
 * run status) are persisted as plain `String` because SQLite has no enums, so we
 * re-validate each row through the shared Zod schema here — never trusting raw DB
 * text. A `.parse()` failure means the database drifted from the domain contract,
 * which we surface loudly rather than letting an invalid value flow upward.
 *
 * Prisma's generated types are imported `type`-only and used solely as the input
 * shape of these functions; they are never re-exported, so they cannot leak.
 */

/** Drops `undefined`-valued keys so Prisma-nullable columns satisfy optional Zod fields. */
function defined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

export function toAgent(row: PrismaAgent): Agent {
  return agentSchema.parse(
    defined({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      purpose: row.purpose,
      version: row.version,
      status: row.status,
      ownerId: row.ownerId ?? undefined,
      sourceType: row.sourceType,
      sourceRepo: row.sourceRepo ?? undefined,
      sourcePath: row.sourcePath ?? undefined,
      sourceCommit: row.sourceCommit ?? undefined,
      model: row.model ?? undefined,
      documentation: row.documentation ?? undefined,
      installInstructions: row.installInstructions ?? undefined,
      usageGuidance: row.usageGuidance ?? undefined,
    }),
  );
}

export function toCapability(row: PrismaAgentCapability): AgentCapability {
  return agentCapabilitySchema.parse({
    id: row.id,
    agentId: row.agentId,
    name: row.name,
    description: row.description,
  });
}

export function toDependency(row: PrismaAgentDependency): AgentDependency {
  return agentDependencySchema.parse(
    defined({
      id: row.id,
      agentId: row.agentId,
      kind: row.kind,
      name: row.name,
      ref: row.ref ?? undefined,
    }),
  );
}

export function toIo(row: PrismaAgentIO): AgentIo {
  return agentIoSchema.parse(
    defined({
      id: row.id,
      agentId: row.agentId,
      direction: row.direction,
      name: row.name,
      type: row.type,
      description: row.description ?? undefined,
    }),
  );
}

export function toCertificationReview(row: PrismaCertificationReview): CertificationReview {
  return certificationReviewSchema.parse(
    defined({
      id: row.id,
      agentId: row.agentId,
      reviewerId: row.reviewerId,
      decision: row.decision,
      notes: row.notes,
      evaluationOutcome: row.evaluationOutcome ?? undefined,
      createdAt: row.createdAt,
    }),
  );
}

export function toRun(row: PrismaAgentRun): AgentRun {
  return agentRunSchema.parse(
    defined({
      id: row.id,
      agentId: row.agentId,
      status: row.status,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt ?? undefined,
      durationMs: row.durationMs ?? undefined,
      caller: row.caller ?? undefined,
    }),
  );
}

export function toSource(row: PrismaSource): Source {
  return sourceSchema.parse({
    id: row.id,
    type: row.type,
    repoUrl: row.repoUrl,
    branch: row.branch,
    agentsPath: row.agentsPath,
    enabled: row.enabled,
  });
}

export function toDiscoveryRun(row: PrismaDiscoveryRun): DiscoveryRun {
  return discoveryRunSchema.parse(
    defined({
      id: row.id,
      sourceId: row.sourceId,
      discoveredCount: row.discoveredCount,
      createdCount: row.createdCount,
      updatedCount: row.updatedCount,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt ?? undefined,
      durationMs: row.durationMs ?? undefined,
    }),
  );
}

export function toUser(row: PrismaUser): User {
  return userSchema.parse({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  });
}
