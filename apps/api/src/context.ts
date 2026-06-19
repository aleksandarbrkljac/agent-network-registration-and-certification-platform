import { Logger } from "@aws-lambda-powertools/logger";
import { repositories } from "@agent-network/db";
import type { UserRole } from "@agent-network/shared";

/**
 * tRPC request context. Each request gets:
 *   - `logger`  : the real Powertools Logger (structured JSON; runs outside Lambda).
 *   - `repositories` : the @agent-network/db repository namespaces (the only data access).
 *   - `currentUser`  : a faux current user/role for the demo (light role gating, no real auth).
 *
 * `repositories` is injected (rather than imported directly in services) so tests
 * can construct a context and services stay dependency-injected and unit-testable.
 */

export type Repositories = typeof repositories;

/** Faux authenticated principal for the demo — no real auth. */
export interface CurrentUser {
  id: string;
  role: UserRole;
}

export interface Context {
  logger: Logger;
  repositories: Repositories;
  currentUser: CurrentUser;
}

/** Shared logger instance — service name surfaces in every structured log line. */
const baseLogger = new Logger({ serviceName: "agent-network-api" });

/**
 * Demo principal: the seeded reviewer, so certification actions attribute to a
 * real seeded user id. A production build would resolve this from an auth token.
 */
const DEMO_CURRENT_USER: CurrentUser = {
  id: "user-reviewer",
  role: "reviewer",
};

export interface CreateContextOptions {
  /** Override the injected repositories (tests pass a throwaway-DB-backed set). */
  repositories?: Repositories;
  /** Override the faux principal (tests exercise different roles). */
  currentUser?: CurrentUser;
  /** Correlation id for request-scoped logging (e.g. an API Gateway request id). */
  requestId?: string;
}

/**
 * Builds a request context. The standalone server and the Lambda handler both
 * call this; tests call it directly with overrides.
 */
export function createContext(options: CreateContextOptions = {}): Context {
  const logger = baseLogger.createChild();
  if (options.requestId) {
    logger.appendKeys({ requestId: options.requestId });
  }
  return {
    logger,
    repositories: options.repositories ?? repositories,
    currentUser: options.currentUser ?? DEMO_CURRENT_USER,
  };
}
