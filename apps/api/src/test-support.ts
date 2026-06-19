import { Logger } from "@aws-lambda-powertools/logger";
import { prisma, repositories } from "@agent-network/db";
import type { AgentStatus, UserRole } from "@agent-network/shared";
import type { Context } from "./context.js";

/**
 * Test-only helpers. NOT part of the public API surface —
 * imported by `*.test.ts` only. Builds a Context wired to the throwaway SQLite DB
 * (provisioned by test/global-setup.ts) and provides minimal fixture builders so
 * tests don't depend on the full dev seed.
 *
 * `@agent-network/db` keeps its Prisma singleton on `globalThis`, so importing
 * `prisma`/`repositories` here uses the very same DATABASE_URL-resolved test.db.
 */

const silentLogger = new Logger({ serviceName: "agent-network-api-test", logLevel: "SILENT" });

export function makeTestContext(overrides: Partial<Context> = {}): Context {
  return {
    logger: silentLogger,
    repositories,
    currentUser: { id: "user-reviewer", role: "reviewer" as UserRole },
    ...overrides,
  };
}

/** Wipes every table so each test starts from a known-empty DB. */
export async function clearDb(): Promise<void> {
  await prisma.agentRun.deleteMany();
  await prisma.certificationReview.deleteMany();
  await prisma.agentIO.deleteMany();
  await prisma.agentDependency.deleteMany();
  await prisma.agentCapability.deleteMany();
  await prisma.discoveryRun.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.source.deleteMany();
  await prisma.user.deleteMany();
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}

/** Inserts the seeded reviewer so certification reviews satisfy the reviewer FK. */
export async function seedReviewer(): Promise<void> {
  await prisma.user.upsert({
    where: { id: "user-reviewer" },
    create: { id: "user-reviewer", name: "Rhea Reviewer", email: "r@x.dev", role: "reviewer" },
    update: {},
  });
}

/** Creates the team-kit github source the discovery + agent fixtures reference. */
export async function seedTeamKitSource(id = "source-team-kit"): Promise<string> {
  await prisma.source.upsert({
    where: { id },
    create: {
      id,
      type: "github",
      repoUrl: "https://github.com/soofi-xyz/soofi-xyz-team-kit",
      branch: "main",
      agentsPath: "agents/",
      enabled: true,
    },
    update: {},
  });
  return id;
}

/** Inserts an agent at a chosen status directly (bypassing the lifecycle) for setup. */
export async function makeAgent(
  slug: string,
  status: AgentStatus,
  sourceType: "github" | "manual" = "manual",
): Promise<string> {
  const created = await repositories.agents.create({
    slug,
    name: slug,
    description: `${slug} agent`,
    status,
    sourceType,
    sourceId: sourceType === "github" ? "source-team-kit" : undefined,
  });
  return created.id;
}
