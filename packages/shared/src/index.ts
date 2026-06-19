/**
 * @agent-network/shared — domain core.
 *
 * Public API: lifecycle statuses, Zod schemas + inferred types for every domain
 * entity, the pure lifecycle state machine, and the deterministic agent-manifest
 * parser.
 */

export * from "./domain/status.js";
export * from "./domain/schemas.js";
export * from "./lifecycle/state-machine.js";
export * from "./manifest/parse-agent-manifest.js";
