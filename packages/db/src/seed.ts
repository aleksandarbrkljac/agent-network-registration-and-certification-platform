import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseAgentManifest,
  type AgentStatus,
  type ParsedAgentManifest,
} from "@agent-network/shared";
import { prisma } from "./client.js";

/**
 * Deterministic, idempotent seed.
 *
 * Strategy: clear every table, then insert with fixed IDs and fixed timestamps so
 * reruns converge to byte-identical rows (no `cuid()`, no `Date.now()`). All agent
 * shape data is derived offline by running the real domain `parseAgentManifest`
 * over a bundled snapshot of team-kit manifests in `src/fixtures/agents/*.md`, so
 * the seed needs no network and stays reproducible.
 *
 * Coverage: users across all three roles, the team-kit GitHub source, and one
 * agent per lifecycle status so every one of the 8 statuses is represented.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "fixtures", "agents");

// Fixed clock for determinism. Distinct timestamps keep `orderBy` stable.
const T0 = new Date("2026-01-01T00:00:00.000Z");
function at(daysOffset: number): Date {
  return new Date(T0.getTime() + daysOffset * 24 * 60 * 60 * 1000);
}

// --- Seed data definitions --------------------------------------------------

interface SeedUser {
  id: string;
  name: string;
  email: string;
  role: "operator" | "reviewer" | "developer";
}

const USERS: SeedUser[] = [
  {
    id: "user-operator",
    name: "Olivia Operator",
    email: "operator@agent.network",
    role: "operator",
  },
  { id: "user-reviewer", name: "Rhea Reviewer", email: "reviewer@agent.network", role: "reviewer" },
  {
    id: "user-developer",
    name: "Devon Developer",
    email: "developer@agent.network",
    role: "developer",
  },
];

const TEAM_KIT_SOURCE = {
  id: "source-team-kit",
  type: "github" as const,
  repoUrl: "https://github.com/soofi-xyz/soofi-xyz-team-kit",
  branch: "main",
  agentsPath: "agents/",
  enabled: true,
};

/**
 * One fixture per lifecycle status (8 fixtures, 8 statuses). `manual` agents
 * carry no sourceId (sourceKey sentinel); the rest belong to the team-kit source.
 */
interface SeedAgentSpec {
  fixture: string;
  status: AgentStatus;
  sourceType: "github" | "manual";
  certified?: boolean;
}

const AGENT_SPECS: SeedAgentSpec[] = [
  { fixture: "oracle", status: "DISCOVERED", sourceType: "github" },
  { fixture: "castform", status: "REGISTERED", sourceType: "manual" },
  { fixture: "sylveon", status: "IN_REVIEW", sourceType: "github" },
  { fixture: "audino", status: "CHANGES_REQUESTED", sourceType: "github" },
  { fixture: "metagross", status: "CERTIFIED", sourceType: "github", certified: true },
  { fixture: "arceus", status: "REJECTED", sourceType: "github" },
  { fixture: "regigigas", status: "DEPRECATED", sourceType: "github", certified: true },
  { fixture: "pelipper", status: "SUSPENDED", sourceType: "manual" },
];

function loadManifest(fixture: string): ParsedAgentManifest {
  const md = readFileSync(join(FIXTURES_DIR, `${fixture}.md`), "utf8");
  return parseAgentManifest(md);
}

// --- Seed routine -----------------------------------------------------------

async function clearAll(): Promise<void> {
  // Order respects FK constraints (children before parents). Cascades cover most
  // of this, but explicit deletes keep the clear deterministic and obvious.
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

interface SeedCounts {
  users: number;
  sources: number;
  agents: number;
  capabilities: number;
  dependencies: number;
  io: number;
  reviews: number;
  runs: number;
  discoveryRuns: number;
}

async function seed(): Promise<SeedCounts> {
  await clearAll();

  const counts: SeedCounts = {
    users: 0,
    sources: 0,
    agents: 0,
    capabilities: 0,
    dependencies: 0,
    io: 0,
    reviews: 0,
    runs: 0,
    discoveryRuns: 0,
  };

  // Users
  for (const u of USERS) {
    await prisma.user.create({
      data: { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: T0, updatedAt: T0 },
    });
    counts.users += 1;
  }

  // Source (team-kit)
  await prisma.source.create({
    data: {
      id: TEAM_KIT_SOURCE.id,
      type: TEAM_KIT_SOURCE.type,
      repoUrl: TEAM_KIT_SOURCE.repoUrl,
      branch: TEAM_KIT_SOURCE.branch,
      agentsPath: TEAM_KIT_SOURCE.agentsPath,
      enabled: TEAM_KIT_SOURCE.enabled,
      createdAt: T0,
      updatedAt: T0,
    },
  });
  counts.sources += 1;

  // A discovery run so scan history isn't empty on the dashboard.
  await prisma.discoveryRun.create({
    data: {
      id: "discovery-run-seed",
      sourceId: TEAM_KIT_SOURCE.id,
      discoveredCount: AGENT_SPECS.filter((s) => s.sourceType === "github").length,
      createdCount: AGENT_SPECS.filter((s) => s.sourceType === "github").length,
      updatedCount: 0,
      startedAt: at(1),
      finishedAt: at(1),
      durationMs: 1200,
    },
  });
  counts.discoveryRuns += 1;

  // Agents (one per status) + their child rows.
  let dayCursor = 2;
  for (const spec of AGENT_SPECS) {
    const manifest = loadManifest(spec.fixture);
    const isGithub = spec.sourceType === "github";
    const agentId = `agent-${manifest.slug}`;
    const createdAt = at(dayCursor);
    dayCursor += 1;

    await prisma.agent.create({
      data: {
        id: agentId,
        slug: manifest.slug,
        name: manifest.name,
        description: manifest.description,
        purpose: manifest.description.slice(0, 280),
        version: "1.0.0",
        status: spec.status,
        ownerId: "user-developer",
        sourceType: spec.sourceType,
        sourceKey: isGithub ? TEAM_KIT_SOURCE.id : "manual",
        sourceId: isGithub ? TEAM_KIT_SOURCE.id : null,
        sourceRepo: isGithub ? TEAM_KIT_SOURCE.repoUrl : null,
        sourcePath: isGithub ? `agents/${spec.fixture}.md` : null,
        sourceCommit: isGithub ? "seedcommit0000000000000000000000000000000" : null,
        model: manifest.model ?? null,
        // CERTIFIED agents carry the marketplace-facing metadata.
        documentation: spec.certified ? `# ${manifest.name}\n\n${manifest.description}` : null,
        installInstructions: spec.certified
          ? `Add \`${manifest.slug}\` to your agent kit and run \`validate-plugin.sh\`.`
          : null,
        usageGuidance: spec.certified
          ? `Invoke ${manifest.name} when: ${manifest.capabilities[0]?.description ?? manifest.description}`
          : null,
        createdAt,
        updatedAt: createdAt,
      },
    });
    counts.agents += 1;

    // Capabilities (parser output — every manifest yields ≥1).
    for (const cap of manifest.capabilities) {
      await prisma.agentCapability.create({
        data: { agentId, name: cap.name, description: cap.description },
      });
      counts.capabilities += 1;
    }

    // Dependencies (parser output).
    for (const dep of manifest.dependencies) {
      await prisma.agentDependency.create({
        data: { agentId, kind: dep.kind, name: dep.name, ref: dep.ref ?? null },
      });
      counts.dependencies += 1;
    }

    // IO: parser-derived outputs, plus a generic input so the contract has both
    // directions for the profile graph.
    await prisma.agentIO.create({
      data: {
        agentId,
        direction: "input",
        name: "request",
        type: "text",
        description: "Natural-language task or invocation for the agent.",
      },
    });
    counts.io += 1;
    for (const out of manifest.outputs) {
      await prisma.agentIO.create({
        data: {
          agentId,
          direction: "output",
          name: out.name,
          type: "text",
          description: out.description,
        },
      });
      counts.io += 1;
    }
  }

  // Certification reviews for the agents that reached/left CERTIFIED.
  const certifiedAgents = AGENT_SPECS.filter((s) => s.certified);
  let reviewDay = 20;
  for (const spec of certifiedAgents) {
    const manifest = loadManifest(spec.fixture);
    const agentId = `agent-${manifest.slug}`;
    await prisma.certificationReview.create({
      data: {
        id: `review-${manifest.slug}`,
        agentId,
        reviewerId: "user-reviewer",
        decision: "approved",
        notes: `${manifest.name} meets the certification bar: clear capabilities, declared IO, and no blocking risks.`,
        evaluationOutcome: "pass",
        createdAt: at(reviewDay),
      },
    });
    counts.reviews += 1;
    reviewDay += 1;
  }

  // A changes-requested review for the CHANGES_REQUESTED agent so the review
  // queue has history across decisions.
  await prisma.certificationReview.create({
    data: {
      id: "review-audino-changes",
      agentId: "agent-audino",
      reviewerId: "user-reviewer",
      decision: "changes_requested",
      notes:
        "Needs clearer install instructions and at least one declared output before re-review.",
      evaluationOutcome: "needs_work",
      createdAt: at(18),
    },
  });
  counts.reviews += 1;

  // A rejected review for the REJECTED agent.
  await prisma.certificationReview.create({
    data: {
      id: "review-arceus-rejected",
      agentId: "agent-arceus",
      reviewerId: "user-reviewer",
      decision: "rejected",
      notes: "Router scope overlaps an existing certified agent; rejected as a duplicate.",
      evaluationOutcome: "fail",
      createdAt: at(17),
    },
  });
  counts.reviews += 1;

  // Runs for the CERTIFIED agent so dashboards/metrics have data.
  const runAgentId = "agent-metagross";
  const runSpecs: Array<{
    status: "succeeded" | "failed" | "running";
    durationMs: number | null;
    day: number;
  }> = [
    { status: "succeeded", durationMs: 4200, day: 30 },
    { status: "succeeded", durationMs: 3800, day: 31 },
    { status: "failed", durationMs: 1500, day: 32 },
    { status: "succeeded", durationMs: 5100, day: 33 },
    { status: "running", durationMs: null, day: 34 },
  ];
  for (const [i, r] of runSpecs.entries()) {
    const startedAt = at(r.day);
    await prisma.agentRun.create({
      data: {
        id: `run-metagross-${i}`,
        agentId: runAgentId,
        status: r.status,
        startedAt,
        finishedAt: r.durationMs === null ? null : new Date(startedAt.getTime() + r.durationMs),
        durationMs: r.durationMs,
        caller: "seed-simulator",
      },
    });
    counts.runs += 1;
  }

  return counts;
}

async function main(): Promise<void> {
  const counts = await seed();
  console.log("Seed complete. Inserted:", JSON.stringify(counts, null, 2));

  const byStatus = await prisma.agent.groupBy({ by: ["status"], _count: { _all: true } });
  const statusReport = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));
  console.log("Agents per status:", JSON.stringify(statusReport, null, 2));
}

main()
  .catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
