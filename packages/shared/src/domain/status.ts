import { z } from "zod";

/**
 * The eight lifecycle statuses an agent moves through, from discovery to
 * certification and beyond. See the lifecycle state machine for the allowed transitions.
 */
export const agentStatusSchema = z.enum([
  "DISCOVERED",
  "REGISTERED",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "CERTIFIED",
  "REJECTED",
  "DEPRECATED",
  "SUSPENDED",
]);

export type AgentStatus = z.infer<typeof agentStatusSchema>;

export const AGENT_STATUSES = agentStatusSchema.options;
