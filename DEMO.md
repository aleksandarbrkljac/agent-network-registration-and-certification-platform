📹 **Recorded demo:** embedded in the [pull request description](https://github.com/prismteam-ai/agent-network-registration-and-certification-platform/pull/1) —
a single agent driven through the **entire lifecycle** end to end: GitHub discovery → promote →
register → declare capabilities / dependencies / IO → complete metadata → certification review &
approval → publish to the marketplace → explore install & reuse → simulate runs → dashboard.
On-screen captions map each scene to its demo acceptance criterion (#1–#10).

🚀 **Working runtime (one command):** `docker compose up --build`, then open
**http://localhost:5173** — builds the monorepo, seeds a fresh demo DB, and serves the SPA + tRPC
API together. See [README → Working runtime](./README.md#working-runtime--one-command-docker).

## Summary

Implements the **Agent Network Registration & Certification Platform** — a local-runnable,
golden-path-shaped system of record for the agent lifecycle: **discovery → registration →
certification → marketplace publication**, plus run/usage tracking and dashboards.

All 17 README acceptance criteria and all 10 demo acceptance criteria are covered. The
load-bearing invariant — **only CERTIFIED agents can be listed in the marketplace** — is
enforced in the service layer via a pure lifecycle state machine and is unit-tested.

## Stack

Turborepo + pnpm monorepo, all-TypeScript:

- `packages/shared` — Zod domain schemas, pure lifecycle state machine, deterministic
  (no-LLM) agent-manifest parser
- `packages/db` — Prisma + SQLite repository layer (isolated for a later DynamoDB swap)
- `apps/api` — tRPC routers + service layer + source discovery (offline local driver +
  optional GitHub driver), with Lambda/CDK production seams
- `apps/web` — Vite + React + Tailwind SPA

## Run locally (3 commands)

```bash
pnpm install
pnpm setup     # prisma db push + seed (creates packages/db/prisma/dev.db)
pnpm dev       # web → http://localhost:5173, API → http://localhost:3001
```

Open **http://localhost:5173**. Reset to the clean demo state anytime with `pnpm db:reset`.

### What's seeded

3 users (operator / reviewer / developer), one team-kit **Source**
(`soofi-xyz/soofi-xyz-team-kit`, `agents/`), and **8 agents — one in every lifecycle status**
so every screen has data on first load. Capabilities / dependencies / IO are produced by the
real manifest parser over a bundled snapshot of the actual team-kit `agents/*.md`.

| Agent       | Status                                                            |
| ----------- | ----------------------------------------------------------------- |
| `oracle`    | DISCOVERED                                                        |
| `castform`  | REGISTERED                                                        |
| `sylveon`   | IN_REVIEW                                                         |
| `audino`    | CHANGES_REQUESTED                                                 |
| `metagross` | CERTIFIED (published-eligible, has install/usage docs + a review) |
| `arceus`    | REJECTED                                                          |
| `regigigas` | DEPRECATED                                                        |
| `pelipper`  | SUSPENDED                                                         |

## Demo walkthrough — all 10 demo acceptance criteria

1. **Discover from a GitHub repo** — **Sources** (`/sources`) → **Scan now** on the team-kit
   source. The DiscoveryRun shows discovered / created / updated counts; re-scanning is
   idempotent (created drops to 0). New agents land as DISCOVERED.
2. **Promote discovered → registry** — **Catalog** (`/catalog`), filter **DISCOVERED**,
   **Promote** (e.g. `oracle`) → REGISTERED.
3. **Register + complete metadata** — **Register Agent** (`/register`) submits a manual agent
   (enters at REGISTERED); open its profile and use the **metadata editor** for
   purpose / version / documentation / install / usage.
4. **Declare capabilities & dependencies** — on any **Profile** (`/agents/:slug`), use the
   **Capabilities**, **Dependencies**, and **IO** editors. Dependencies of kind `agent` model
   agent-to-agent links.
5. **Certification review & approval** — on a REGISTERED agent **Submit for review**, then
   **Review Queue** (`/review`) → **Approve** / **Request changes** / **Reject**. Decisions and
   notes are recorded as certification history.
6. **Publish certified → marketplace** — on a **CERTIFIED** agent (e.g. `metagross`),
   **Publish to marketplace**. Publishing a non-certified agent is rejected server-side
   (HTTP 400) and the UI shows the reason — only CERTIFIED agents can ever be published.
7. **Explore details, install, usage** — **Marketplace** (`/marketplace`) → open a listing for
   install instructions and usage guidance.
8. **Developer discover & reuse** — in the Marketplace, **search** for a certified agent and use
   **Copy install / Reuse**.
9. **Dashboard inventory / certification / activity** — the **Dashboard** (`/`) shows
   status-count cards, certification stats, an adoption trend, and an activity feed.
10. **Track runs & usage metrics** — on a **Profile**, click **Simulate run** a few times; run
    history and metrics update on the profile and feed the dashboard's adoption trend.

## Architecture

```
apps/
  web/   Vite + React + React Router + Tailwind, tRPC react-query client  (:5173)
  api/   tRPC routers + service layer + discovery; standalone dev server  (:3001)
         + handler.ts (aws-lambda adapter) and cdk/ as documented prod seams
packages/
  shared/      Zod schemas, lifecycle state machine, manifest parser  (pure, no I/O)
  db/          Prisma + SQLite, repository API (Prisma isolated here for a DynamoDB swap)
  api-client/  AppRouter type + tRPC client/hooks factory
  tsconfig/    shared TS configs
```

Lifecycle transitions and the marketplace publish gate are enforced in the API **service layer**
via the pure state machine in `packages/shared` (`assertTransition`, `canPublishToMarketplace`).

## Tests & checks

```bash
pnpm build       # turbo build across all packages (incl. vite build)
pnpm typecheck   # tsc across the workspace
pnpm lint        # eslint
pnpm test        # vitest — shared 55 · db 4 · api 20 · web 4 (83 passing)
```

CI (`.github/workflows/ci.yml`) runs install → lint → typecheck → test → format:check on push/PR.

## Production seam (intentionally deferred for the demo)

The AWS golden path is _shaped but not run_ locally: `apps/api/handler.ts` is a real aws-lambda
adapter export, `apps/api/cdk/` is a documented CDK skeleton, `apps/web/amplify.yml` is the
Amplify build spec, and persistence is isolated in `packages/db` for a later DynamoDB swap.
X-Ray tracing, EMF metrics, and metric registration ship with the AWS deployment. Auth is a faux
demo principal (no real RBAC). These are the only intentional demo-only deviations.
