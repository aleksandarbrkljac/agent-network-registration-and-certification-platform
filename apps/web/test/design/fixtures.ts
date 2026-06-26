/**
 * Deterministic tRPC fixtures for the mocked design specs.
 *
 * Every shape here mirrors the real router output verified in
 * `apps/api/src/routers/*` and `apps/api/src/services/*`:
 *   - `agents.list`            -> Agent[]
 *   - `agents.getDetail`       -> { agent, capabilities, dependencies, io }
 *   - `dashboard.statusCounts` -> Record<AgentStatus, number>
 *   - `dashboard.certificationStats`
 *   - `dashboard.adoptionTrend`-> { date, runs }[]
 *   - `dashboard.activityFeed` -> { kind, agentSlug, summary, at }[]
 *   - `runs.metrics`           -> RunMetrics
 *   - `runs.listByAgent`       -> AgentRun[]
 *   - `marketplace.listPublished` / `getListing` -> MarketplaceListing(s)
 *   - `certification.listReviews` -> CertificationReview[]
 *
 * The standalone dev API has NO superjson transformer (verified in
 * `apps/api/src/server.ts` + `packages/api-client/src/client.ts`), so `Date`
 * fields cross the wire as ISO strings. The fixtures therefore use ISO strings
 * for every date field, exactly as the browser would receive them.
 */

type AgentStatus =
  | "DISCOVERED"
  | "REGISTERED"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "CERTIFIED"
  | "REJECTED"
  | "DEPRECATED"
  | "SUSPENDED";

interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string;
  purpose: string;
  version: string;
  status: AgentStatus;
  sourceType: "github" | "manual";
  sourceRepo?: string;
  model?: string;
  documentation?: string;
  installInstructions?: string;
  usageGuidance?: string;
}

/** One agent per lifecycle status, mirroring the seed coverage. */
export const AGENTS: Agent[] = [
  {
    id: "agent-oracle",
    slug: "oracle",
    name: "Oracle",
    description: "Public-data ingestion agent for county property and business datasets.",
    purpose: "Discover, validate, and refresh public datasets into the query DB.",
    version: "1.0.0",
    status: "DISCOVERED",
    sourceType: "github",
    sourceRepo: "soofi-xyz/soofi-xyz-team-kit",
    model: "gpt-5.5-high",
  },
  {
    id: "agent-castform",
    slug: "castform",
    name: "Castform",
    description: "Adds Google Tag Manager to any frontend and discovers CTA tracking events.",
    purpose: "Wire GTM snippets into a frontend without hand-rolling GA4.",
    version: "0.4.2",
    status: "REGISTERED",
    sourceType: "manual",
    model: "claude-opus-4",
  },
  {
    id: "agent-sylveon",
    slug: "sylveon",
    name: "Sylveon",
    description: "Figma-to-code specialist that preserves business logic and locks breakpoints.",
    purpose: "Translate Figma designs into existing frontend code.",
    version: "2.1.0",
    status: "IN_REVIEW",
    sourceType: "github",
    sourceRepo: "soofi-xyz/soofi-xyz-team-kit",
  },
  {
    id: "agent-audino",
    slug: "audino",
    name: "Audino",
    description: "Frontend bug-fix specialist for triaging and fixing UI regressions.",
    purpose: "Confirm design mismatches and strengthen tests against regressions.",
    version: "1.3.0",
    status: "CHANGES_REQUESTED",
    sourceType: "github",
    sourceRepo: "soofi-xyz/soofi-xyz-team-kit",
  },
  {
    id: "agent-metagross",
    slug: "metagross",
    name: "Metagross",
    description: "Fullstack monorepo architect for Turborepo, Amplify, tRPC, Lambda, and CDK.",
    purpose: "Design and scaffold Turborepo-based frontend-backend systems.",
    version: "3.0.0",
    status: "CERTIFIED",
    sourceType: "github",
    sourceRepo: "soofi-xyz/soofi-xyz-team-kit",
    model: "claude-opus-4",
    documentation: "https://example.com/docs/metagross",
    installInstructions: "pnpm add @agent-network/metagross",
    usageGuidance: "Point it at a monorepo and describe the new app to scaffold.",
  },
  {
    id: "agent-arceus",
    slug: "arceus",
    name: "Arceus",
    description: "Master router that recommends the right combination of agents and skills.",
    purpose: "Route tasks to the correct specialists.",
    version: "1.0.0",
    status: "REJECTED",
    sourceType: "github",
    sourceRepo: "soofi-xyz/soofi-xyz-team-kit",
  },
  {
    id: "agent-regigigas",
    slug: "regigigas",
    name: "Regigigas",
    description: "SaaS marketplace architect for multi-tenant CloudFormation product bundles.",
    purpose: "Build a multi-tenant SaaS distribution platform on AWS.",
    version: "2.5.0",
    status: "DEPRECATED",
    sourceType: "github",
    sourceRepo: "soofi-xyz/soofi-xyz-team-kit",
    model: "claude-opus-4",
    documentation: "https://example.com/docs/regigigas",
    installInstructions: "pnpm add @agent-network/regigigas",
    usageGuidance: "Use the centralized marketplace account to govern tenant accounts.",
  },
  {
    id: "agent-pelipper",
    slug: "pelipper",
    name: "Pelipper",
    description: "Dataset export agent that turns approved requests into company-scoped extracts.",
    purpose: "Produce company-scoped debt data extracts from approved requests.",
    version: "1.1.0",
    status: "SUSPENDED",
    sourceType: "manual",
  },
];

/** `dashboard.statusCounts` — one agent per status, every bucket seeded. */
export const STATUS_COUNTS: Record<AgentStatus, number> = {
  DISCOVERED: 1,
  REGISTERED: 1,
  IN_REVIEW: 1,
  CHANGES_REQUESTED: 1,
  CERTIFIED: 1,
  REJECTED: 1,
  DEPRECATED: 1,
  SUSPENDED: 1,
};

/** `dashboard.certificationStats` — derived the same way the service does. */
export const CERTIFICATION_STATS = {
  certified: 2, // CERTIFIED (1) + DEPRECATED (1)
  inReview: 1,
  changesRequested: 1,
  rejected: 1,
  certificationRate: 2 / 3, // certified / (certified + rejected)
};

/** `dashboard.adoptionTrend` — enough points for the sparkline to draw a line. */
export const ADOPTION_TREND = [
  { date: "2026-01-01", runs: 2 },
  { date: "2026-01-02", runs: 5 },
  { date: "2026-01-03", runs: 3 },
  { date: "2026-01-04", runs: 8 },
  { date: "2026-01-05", runs: 6 },
  { date: "2026-01-06", runs: 11 },
  { date: "2026-01-07", runs: 9 },
];

/** `dashboard.activityFeed` — newest first, mix of runs and reviews. */
export const ACTIVITY_FEED = [
  {
    kind: "review" as const,
    agentSlug: "metagross",
    summary: "Metagross review: approved",
    at: "2026-01-07T12:30:00.000Z",
  },
  {
    kind: "run" as const,
    agentSlug: "metagross",
    summary: "Metagross run succeeded",
    at: "2026-01-07T09:15:00.000Z",
  },
  {
    kind: "run" as const,
    agentSlug: "sylveon",
    summary: "Sylveon run failed",
    at: "2026-01-06T18:05:00.000Z",
  },
  {
    kind: "review" as const,
    agentSlug: "audino",
    summary: "Audino review: changes_requested",
    at: "2026-01-06T11:45:00.000Z",
  },
  {
    kind: "run" as const,
    agentSlug: "regigigas",
    summary: "Regigigas run succeeded",
    at: "2026-01-05T16:20:00.000Z",
  },
];

interface RunMetrics {
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  cancelled: number;
  avgDurationMs: number | null;
}

/** `runs.metrics` fleet aggregate (no slug). */
export const FLEET_METRICS: RunMetrics = {
  total: 44,
  succeeded: 37,
  failed: 5,
  running: 1,
  cancelled: 1,
  avgDurationMs: 2840,
};

/** `runs.metrics` for a single agent (slug provided). */
export const AGENT_METRICS: RunMetrics = {
  total: 12,
  succeeded: 10,
  failed: 1,
  running: 1,
  cancelled: 0,
  avgDurationMs: 3120,
};

/** `runs.listByAgent` — a few rows so the run-history table renders. */
export const AGENT_RUNS = [
  {
    id: "run-1",
    status: "succeeded",
    startedAt: "2026-01-07T09:15:00.000Z",
    durationMs: 2410,
    caller: "demo-simulator",
  },
  {
    id: "run-2",
    status: "succeeded",
    startedAt: "2026-01-06T14:02:00.000Z",
    durationMs: 3380,
    caller: "demo-simulator",
  },
  {
    id: "run-3",
    status: "failed",
    startedAt: "2026-01-05T20:48:00.000Z",
    durationMs: 1990,
    caller: "ci-bot",
  },
  {
    id: "run-4",
    status: "running",
    startedAt: "2026-01-07T10:01:00.000Z",
    durationMs: null,
    caller: null,
  },
];

/** `certification.listReviews` — review timeline rows. */
export const AGENT_REVIEWS = [
  {
    id: "review-1",
    decision: "approved",
    notes: "Meets the certification bar; docs and IO contract are complete.",
    createdAt: "2026-01-07T12:30:00.000Z",
    evaluationOutcome: "pass",
  },
  {
    id: "review-2",
    decision: "changes_requested",
    notes: "Add usage guidance and a second integration test before certifying.",
    createdAt: "2026-01-04T08:10:00.000Z",
    evaluationOutcome: "needs-work",
  },
];

/** Detail child rows for the agent under profile test (`metagross`). */
const METAGROSS_CAPABILITIES = [
  {
    id: "cap-1",
    agentId: "agent-metagross",
    name: "monorepo-scaffolding",
    description: "Generate Turborepo apps and shared packages with wired tooling.",
  },
  {
    id: "cap-2",
    agentId: "agent-metagross",
    name: "trpc-api-design",
    description: "Design tRPC routers and end-to-end typed clients.",
  },
  {
    id: "cap-3",
    agentId: "agent-metagross",
    name: "cdk-infrastructure",
    description: "Author CDK stacks for Lambda + API Gateway deployments.",
  },
];

const METAGROSS_DEPENDENCIES = [
  { id: "dep-1", agentId: "agent-metagross", kind: "package", name: "turbo", ref: "turbo" },
  { id: "dep-2", agentId: "agent-metagross", kind: "tool", name: "AWS CDK", ref: "aws-cdk" },
  // agent-to-agent dependency — renders as a link in the dependency graph.
  { id: "dep-3", agentId: "agent-metagross", kind: "agent", name: "Castform", ref: "castform" },
];

const METAGROSS_IO = [
  {
    id: "io-1",
    agentId: "agent-metagross",
    direction: "input",
    name: "appSpec",
    type: "object",
    description: "Description of the app to scaffold.",
  },
  {
    id: "io-2",
    agentId: "agent-metagross",
    direction: "input",
    name: "monorepoPath",
    type: "string",
    description: "Target monorepo root.",
  },
  {
    id: "io-3",
    agentId: "agent-metagross",
    direction: "output",
    name: "scaffold",
    type: "files",
    description: "Generated files and wiring.",
  },
];

const agentBySlug = new Map(AGENTS.map((a) => [a.slug, a]));

/** `agents.getDetail` for any slug; falls back to a generic detail. */
export function agentDetail(slug: string) {
  const agent = agentBySlug.get(slug) ?? agentBySlug.get("metagross");
  if (slug === "metagross") {
    return {
      agent,
      capabilities: METAGROSS_CAPABILITIES,
      dependencies: METAGROSS_DEPENDENCIES,
      io: METAGROSS_IO,
    };
  }
  return { agent, capabilities: [], dependencies: [], io: [] };
}

/** Two CERTIFIED-style listings so the marketplace rail fills both columns. */
function listingFor(slug: string) {
  return {
    agent: agentBySlug.get(slug),
    capabilities:
      slug === "metagross"
        ? METAGROSS_CAPABILITIES
        : [
            {
              id: "cap-r1",
              agentId: "agent-regigigas",
              name: "marketplace-registry",
              description: "Register, release, and roll back product bundles.",
            },
            {
              id: "cap-r2",
              agentId: "agent-regigigas",
              name: "tenant-provisioning",
              description: "Provision per-customer tenant accounts.",
            },
          ],
    dependencies: slug === "metagross" ? METAGROSS_DEPENDENCIES : [],
    io: slug === "metagross" ? METAGROSS_IO : [],
  };
}

export const MARKETPLACE_LISTINGS = [listingFor("metagross"), listingFor("regigigas")];

export function marketplaceListing(slug: string) {
  return MARKETPLACE_LISTINGS.find((l) => l.agent?.slug === slug) ?? listingFor("metagross");
}
