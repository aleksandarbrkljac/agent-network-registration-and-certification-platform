import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { agentSchema } from "@agent-network/shared";
import { prisma } from "../client.js";
import * as agents from "./agents.js";
import * as capabilities from "./capabilities.js";

/**
 * Covers the two things M2 must guarantee: (1) the Prisma-row → shared-domain-type
 * mapping at the repository boundary produces values that satisfy the shared Zod
 * schema, and (2) discovery upsert is idempotent on `(slug, sourceKey)`.
 */

async function clear(): Promise<void> {
  await prisma.agentCapability.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.source.deleteMany();
}

// Sourced agents carry a FK to Source; provision the sources the tests reference.
async function seedSources(): Promise<void> {
  for (const id of ["source-x", "source-y"]) {
    await prisma.source.create({
      data: { id, type: "github", repoUrl: `https://example.com/${id}`, agentsPath: `${id}/` },
    });
  }
}

beforeEach(async () => {
  await clear();
  await seedSources();
});
afterAll(async () => {
  await clear();
  await prisma.$disconnect();
});

describe("agents repository — row→domain mapping", () => {
  it("returns a value that satisfies the shared agentSchema", async () => {
    const created = await agents.create({
      slug: "mapper-check",
      name: "Mapper Check",
      status: "REGISTERED",
      sourceType: "manual",
      description: "an agent",
      model: "gpt-5.5-high",
    });

    // The repository must hand back a domain Agent, never a raw Prisma row:
    // no `sourceKey`/`updatedAt` leakage, optional nulls collapsed to undefined.
    expect(() => agentSchema.parse(created)).not.toThrow();
    expect(created).not.toHaveProperty("sourceKey");
    expect(created.ownerId).toBeUndefined();
    expect(created.model).toBe("gpt-5.5-high");
    expect(created.status).toBe("REGISTERED");
  });
});

describe("agents repository — discovery idempotency", () => {
  it("upserts the same (slug, sourceKey) to a single row across reruns", async () => {
    const input = {
      slug: "idem-agent",
      name: "Idem Agent",
      status: "DISCOVERED" as const,
      sourceType: "github" as const,
      sourceId: "source-x",
      sourceCommit: "commit-1",
    };

    const first = await agents.upsertDiscovered(input);
    const second = await agents.upsertDiscovered({ ...input, sourceCommit: "commit-2" });

    expect(second.id).toBe(first.id);

    const all = await agents.list({ sourceId: "source-x" });
    expect(all).toHaveLength(1);
    expect(all[0]?.sourceCommit).toBe("commit-2");
  });

  it("treats a manual agent and a sourced agent with the same slug as distinct origins", async () => {
    await agents.upsertDiscovered({
      slug: "dual",
      name: "Dual (sourced)",
      status: "DISCOVERED",
      sourceType: "github",
      sourceId: "source-y",
    });
    await agents.create({
      slug: "dual",
      name: "Dual (manual)",
      status: "REGISTERED",
      sourceType: "manual",
    });

    const all = await agents.list();
    expect(all.filter((a) => a.slug === "dual")).toHaveLength(2);
  });
});

describe("capabilities repository — declarative replace is idempotent", () => {
  it("converges to the same rows when replayed", async () => {
    const agent = await agents.create({
      slug: "cap-agent",
      name: "Cap Agent",
      status: "REGISTERED",
      sourceType: "manual",
    });

    const drafts = [
      { name: "summarize", description: "summarize input" },
      { name: "classify", description: "classify input" },
    ];

    const once = await capabilities.replaceForAgent(agent.id, drafts);
    const twice = await capabilities.replaceForAgent(agent.id, drafts);

    expect(once).toHaveLength(2);
    expect(twice).toHaveLength(2);
    expect(twice.map((c) => c.name).sort()).toEqual(["classify", "summarize"]);
  });
});
