/**
 * @agent-network/db — Prisma + SQLite persistence, isolated in this package.
 *
 * Public surface: the singleton client (for transaction orchestration / lifecycle
 * shutdown) and the repository API. Prisma's generated model types are NOT
 * re-exported here; consumers only ever see `@agent-network/shared` domain types.
 */

export { prisma } from "./client.js";
export * as repositories from "./repositories/index.js";
export type {
  AgentListFilter,
  AgentCreateInput,
  AgentMetadataUpdate,
  CapabilityDraft,
  DependencyDraft,
  IoDraft,
  ReviewDraft,
  RunDraft,
  SourceDraft,
  RunMetrics,
} from "./repositories/dto.js";
