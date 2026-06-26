# Agent Network Registration & Certification Platform

## Context

The soofi.xyz Agent Network is intended to become the central registry for all agents developed, discovered, or deployed across the ecosystem. Agents currently exist across GitHub repositories, team projects, internal solutions, and future agent marketplaces, making it difficult to understand what agents exist, who owns them, what they do, whether they are certified, and how they can be reused.

A standardized registration and certification process is needed to create a single source of truth for agent discovery, governance, evaluation, and reuse. The platform will serve as the system of record for all agents within the network and provide a foundation for future orchestration, marketplace, MCP, and agent-to-agent collaboration initiatives.

## Description

Create an Agent Network platform that enables discovery, registration, certification, publication, and reuse of agents across the soofi.xyz ecosystem. The platform should provide a centralized registry for agents discovered from GitHub repositories and other approved sources, while allowing operators, reviewers, and developers to manage the full agent lifecycle from discovery through certification and marketplace publication.

## Acceptance Criteria
- Establish the Agent Network Registry as the system of record for all network agents.
- Support discovery of agents from configured GitHub repositories and approved source locations.
- Allow agents discovered in repositories to be promoted into registered network agents.
- Maintain a catalog of all discovered, registered, certified, rejected, deprecated, and suspended agents.
- Capture agent ownership, version, purpose, capabilities, dependencies, inputs, outputs, and documentation.
- Support registration of agents that are not discovered through automated GitHub scanning.
- Support certification and review workflows for registered agents.
- Maintain certification history, reviewer decisions, and evaluation outcomes.
- Support agent lifecycle statuses including Discovered, Registered, In Review, Changes Requested, Certified, Rejected, Deprecated, and Suspended.
- Publish certified agents to an Agent Marketplace.
- Prevent non-certified agents from being listed in the marketplace.
- Provide agent profile pages that describe what the agent does, how it works, and how it can be reused.
- Track agent usage, run history, and network participation metrics.
- Provide visibility into agent dependencies, connected tools, data sources, and agent-to-agent interactions.
- Enable developers to discover and reuse certified agents while building new solutions.
- Provide installation, usage, and integration guidance for certified agents.
- Surface network-level metrics, certification statistics, and adoption trends through dashboards.
- Preserve compatibility with future MCP, orchestration, marketplace, and agent governance initiatives.

## Demo Acceptance Criteria
- Demonstrate discovery of agents from a GitHub repository.
- Demonstrate promotion of a discovered agent into the Agent Network Registry.
- Demonstrate registration and completion of agent metadata.
- Demonstrate declaration of agent capabilities and dependencies.
- Demonstrate certification review and approval workflow.
- Demonstrate publication of a certified agent to the marketplace.
- Demonstrate exploration of certified agent details, installation instructions, and usage guidance.
- Demonstrate developer workflows for discovering and reusing certified agents.
- Demonstrate dashboard visibility into agent inventory, certification status, and network activity.
- Demonstrate tracking of agent runs and network usage metrics.

## Reference
[Soofi XYZ Team Kit](https://github.com/soofi-xyz/soofi-xyz-team-kit)

---

## Implementation (this repo)

A local-runnable, golden-path-shaped implementation lives in this repository.

```bash
pnpm install
pnpm setup     # prisma db push + seed
pnpm dev       # web on http://localhost:5173, API on http://localhost:3001
```

### Working runtime — one command (Docker)

No toolchain needed beyond Docker. From this directory:

```bash
docker compose up --build
```

Then open **http://localhost:5173**. The image builds the whole monorepo, seeds a
fresh SQLite DB (8 agents — one in every lifecycle status), serves the tRPC API on
`:3001` and the SPA on `:5173`. Stop with `Ctrl-C` (or `docker compose down`); the
demo data is re-seeded on each start, so the runtime is always in the clean demo state.

> The AWS golden path (`apps/api/handler.ts` Lambda adapter, `apps/api/cdk/`,
> `apps/web/amplify.yml`) is real and synthesizable —
> `pnpm --filter @agent-network/api build && pnpm --filter @agent-network/api cdk:synth`
> emits the dev/prod CloudFormation. The SQLite → DynamoDB swap (isolated in `packages/db`)
> is the one remaining production step. This Docker image stays the runnable demo runtime.

Stack: Turborepo + pnpm monorepo · `packages/shared` (Zod schemas, lifecycle state machine,
manifest parser) · `packages/db` (Prisma + SQLite) · `apps/api` (tRPC + service layer + discovery,
with Lambda/CDK prod seams) · `apps/web` (Vite + React + Tailwind). All services are TypeScript;
the marketplace publish gate and lifecycle transitions are enforced in the service layer and
unit-tested.
