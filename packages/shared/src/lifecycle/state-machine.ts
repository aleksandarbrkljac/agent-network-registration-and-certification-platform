import type { AgentStatus } from "../domain/status.js";

/**
 * Pure, stateless lifecycle state machine. It owns the allowed
 * status transitions and the marketplace-publish invariant. It performs no I/O
 * and holds no state — callers pass the current status in and act on the result.
 */

/** Entry status for agents discovered by scanning a source. */
export const DISCOVERY_ENTRY_STATUS = "DISCOVERED" as const satisfies AgentStatus;

/** Entry status for agents registered manually. */
export const MANUAL_ENTRY_STATUS = "REGISTERED" as const satisfies AgentStatus;

/**
 * Allowed forward transitions, keyed by the originating status. SUSPENDED is
 * reachable from ANY status, so it is added to every entry below rather than
 * repeated by hand. Leaving SUSPENDED is handled separately by `reinstate`,
 * because the target depends on runtime history the machine does not store.
 */
const BASE_TRANSITIONS: Record<AgentStatus, readonly AgentStatus[]> = {
  DISCOVERED: ["REGISTERED"],
  REGISTERED: ["IN_REVIEW"],
  IN_REVIEW: ["CERTIFIED", "CHANGES_REQUESTED", "REJECTED"],
  CHANGES_REQUESTED: ["IN_REVIEW"],
  CERTIFIED: ["DEPRECATED"],
  REJECTED: [],
  DEPRECATED: [],
  SUSPENDED: [],
};

/**
 * Statuses that an agent cannot meaningfully be suspended from / reinstated to,
 * because they are themselves terminal-or-suspended. Any other status may be
 * suspended and later reinstated back to it.
 */
const NON_SUSPENDABLE: ReadonlySet<AgentStatus> = new Set<AgentStatus>(["SUSPENDED"]);

/** Error thrown when an illegal lifecycle transition is requested. */
export class IllegalTransitionError extends Error {
  readonly from: AgentStatus;
  readonly to: AgentStatus;

  constructor(from: AgentStatus, to: AgentStatus) {
    super(`Illegal agent lifecycle transition: ${from} → ${to}`);
    this.name = "IllegalTransitionError";
    this.from = from;
    this.to = to;
  }
}

/** Returns true when `from → to` is an allowed lifecycle transition. */
export function canTransition(from: AgentStatus, to: AgentStatus): boolean {
  // Any non-suspended status may move to SUSPENDED.
  if (to === "SUSPENDED") {
    return from !== "SUSPENDED";
  }
  return BASE_TRANSITIONS[from].includes(to);
}

/** Asserts that `from → to` is allowed, throwing `IllegalTransitionError` otherwise. */
export function assertTransition(from: AgentStatus, to: AgentStatus): void {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to);
  }
}

/**
 * Returns true when an agent in `previousStatus` may be suspended. Every status
 * except SUSPENDED itself qualifies.
 */
export function canSuspend(previousStatus: AgentStatus): boolean {
  return !NON_SUSPENDABLE.has(previousStatus);
}

/**
 * Reinstates a suspended agent back to the status it held before suspension.
 *
 * The machine is stateless, so the caller supplies the prior (non-suspended)
 * status it persisted at suspension time. Returns the status to restore.
 */
export function reinstate(previousStatus: AgentStatus): AgentStatus {
  if (previousStatus === "SUSPENDED") {
    throw new IllegalTransitionError("SUSPENDED", "SUSPENDED");
  }
  return previousStatus;
}

/**
 * Marketplace publish invariant: ONLY certified agents may be listed
 * (README: "Prevent non-certified agents from being listed in the marketplace").
 * The predicate lives here; the service layer enforces it.
 */
export function canPublishToMarketplace(status: AgentStatus): boolean {
  return status === "CERTIFIED";
}
