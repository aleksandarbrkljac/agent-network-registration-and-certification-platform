import { PrismaClient } from "@prisma/client";

/**
 * Singleton `PrismaClient` for `packages/db`.
 *
 * Isolation rule: this is the ONLY module allowed to hold a live Prisma instance.
 * Repositories import it and map rows to `@agent-network/shared` domain types at
 * the boundary, so the generated client never leaks past this package.
 *
 * The instance is cached on `globalThis` to survive hot-reload / repeated module
 * evaluation (tsx watch, Vitest workers), which otherwise spawns a new connection
 * pool on every reload and exhausts SQLite file handles.
 */

const DEFAULT_DATABASE_URL = "file:./prisma/dev.db";

declare global {
  var __agentNetworkPrisma__: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  // Default DATABASE_URL inside the package so `prisma`/seed/tests work without
  // an explicit env, while still honouring an override (e.g. a per-test file).
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
  }
  return new PrismaClient();
}

export const prisma: PrismaClient = globalThis.__agentNetworkPrisma__ ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__agentNetworkPrisma__ = prisma;
}
