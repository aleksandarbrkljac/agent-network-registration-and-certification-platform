# `apps/api/cdk` — production deploy seam (documented stub)

This directory is an **intentional, documented stub**. The demo runs
the tRPC router on a local Node HTTP server (`src/server.ts`); it does **not** deploy
to AWS. These files exist so the on-path deployment shape is explicit and a later
production pass is an isolated change, not a rewrite.

- `bin/app.ts` — CDK app entry (instantiates the dev/prod stacks).
- `lib/api-stack.ts` — API Gateway HTTP API → Lambda (`src/handler.ts`) skeleton,
  per `build-frontend-backends/rules/cdk-api-infrastructure` and
  `apply-engineering-guidelines` (region `us-east-2`, Powertools, cost tags).

Both files are **not compiled** by `tsc -p tsconfig.json` (which only includes
`src/**`) and depend on `aws-cdk-lib` + `constructs`, which the demo does not install.

## Activating the seam (later)

```bash
pnpm --filter @agent-network/api add -D aws-cdk-lib constructs aws-cdk
# swap SQLite → DynamoDB in packages/db (isolated in that package), then:
cdk deploy --app "tsx cdk/bin/app.ts"
```

Deferred alongside this: X-Ray Tracer, EMF Metrics, and Lexicon / Main
Dashboard metric registration.
