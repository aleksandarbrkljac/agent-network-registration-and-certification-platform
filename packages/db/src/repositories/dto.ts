import type {
  AgentStatus,
  AgentCapabilityInput,
  AgentDependencyInput,
  AgentIoInput,
  AgentRunInput,
  CertificationReviewInput,
  SourceInput,
} from "@agent-network/shared";

/**
 * Small repository-local DTOs. These describe the *inputs* the API
 * service layer (M3+) hands to the repositories. They reference shared domain
 * types only — never Prisma types — so the persistence layer stays swappable.
 */

/** Filter for `agents.list`. All fields optional; omitted fields are not constrained. */
export interface AgentListFilter {
  status?: AgentStatus;
  sourceId?: string;
  /** Case-insensitive substring match against capability names. */
  capability?: string;
}

/**
 * Create payload for an agent. `sourceId` is the upstream source for discovered
 * agents, or omitted for manually-registered agents (the repository maps the
 * absence to the `"manual"` sourceKey sentinel — see schema.prisma).
 */
export interface AgentCreateInput {
  slug: string;
  name: string;
  description?: string;
  purpose?: string;
  version?: string;
  status: AgentStatus;
  ownerId?: string;
  sourceType: "github" | "manual";
  sourceId?: string;
  sourceRepo?: string;
  sourcePath?: string;
  sourceCommit?: string;
  model?: string;
  documentation?: string;
  installInstructions?: string;
  usageGuidance?: string;
}

/** Partial metadata update for an agent (everything optional). */
export interface AgentMetadataUpdate {
  name?: string;
  description?: string;
  purpose?: string;
  version?: string;
  model?: string;
  ownerId?: string;
  documentation?: string;
  installInstructions?: string;
  usageGuidance?: string;
}

/** Child rows are created without an `id` (the DB assigns one) — drop `agentId` too. */
export type CapabilityDraft = Omit<AgentCapabilityInput, "agentId">;
export type DependencyDraft = Omit<AgentDependencyInput, "agentId">;
export type IoDraft = Omit<AgentIoInput, "agentId">;

export type ReviewDraft = CertificationReviewInput;
export type RunDraft = AgentRunInput;
export type SourceDraft = SourceInput;

/** Aggregated run metrics for an agent. */
export interface RunMetrics {
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  cancelled: number;
  /** Mean duration over runs that recorded a `durationMs`; null when none did. */
  avgDurationMs: number | null;
}
