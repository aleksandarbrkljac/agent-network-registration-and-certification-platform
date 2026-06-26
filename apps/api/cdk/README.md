# `apps/api/cdk` — production deploy seam

API Gateway HTTP API → Lambda (`src/handler.ts`) for the tRPC backend, per
`build-frontend-backends/rules/cdk-api-infrastructure` and `apply-engineering-guidelines`
(primary region `us-east-2`, Powertools env, X-Ray active tracing, 90-day logs, cost tags).

- `bin/app.ts` — CDK app entry (dev + prod stacks).
- `lib/api-stack.ts` — `ApiStack`: ARM64 Node 20 Lambda + HTTP API + integration/route/stage,
  IAM role, log group. The Lambda code is the compiled `dist/` output, shipped via
  `Code.fromAsset`, so `cdk synth` needs neither esbuild nor Docker.
- `tsconfig.json` — typechecks `cdk/**` (the app `tsconfig.json` still compiles only `src/**`).

`aws-cdk-lib` + `constructs` + `aws-cdk` are dev dependencies of `@agent-network/api`.

## Synth / deploy

```bash
pnpm --filter @agent-network/api build       # produces dist/ (the Lambda asset)
pnpm --filter @agent-network/api cdk:typecheck
pnpm --filter @agent-network/api cdk:synth   # -> apps/api/cdk.out

# Deploy a stack (needs AWS credentials):
cd apps/api
DATABASE_URL="<prod datastore url>" pnpm exec cdk deploy AgentNetworkApi-dev --app "tsx cdk/bin/app.ts"
```

The demo runtime still runs the tRPC router on a local Node HTTP server (`src/server.ts`)
and Docker; this stack is the AWS path, not a demo dependency.

## Still deferred

Production swaps SQLite → DynamoDB inside `packages/db` (isolated there); `databaseUrl`
is injected per environment but the DynamoDB table + repository implementation are a
separate change. X-Ray Tracer is enabled at the infra level (`Tracing.ACTIVE`); EMF
Metrics and Lexicon / Main Dashboard metric registration are not yet wired in the handler.
