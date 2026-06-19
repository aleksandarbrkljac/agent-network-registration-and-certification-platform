/**
 * Repository API for `packages/db`.
 *
 * The API service layer (M3+) imports these namespaces and calls typed functions
 * that take and return `@agent-network/shared` domain types. Prisma never crosses
 * this boundary, so a later DynamoDB swap reimplements these modules and nothing
 * else.
 */

export * as agents from "./agents.js";
export * as capabilities from "./capabilities.js";
export * as dependencies from "./dependencies.js";
export * as io from "./io.js";
export * as certification from "./certification.js";
export * as runs from "./runs.js";
export * as sources from "./sources.js";
export * as discoveryRuns from "./discovery-runs.js";
export * as users from "./users.js";

export * from "./dto.js";
