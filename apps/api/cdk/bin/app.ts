/**
 * CDK app entry — instantiates the dev and prod API stacks.
 *
 * Synth/deploy:
 *   pnpm --filter @agent-network/api build      # produces dist/ (the Lambda asset)
 *   pnpm --filter @agent-network/api cdk:synth  # cdk synth --app "tsx cdk/bin/app.ts"
 *   DATABASE_URL=... cdk deploy AgentNetworkApi-dev --app "tsx cdk/bin/app.ts"
 */
import { App } from "aws-cdk-lib";
import { ApiStack } from "../lib/api-stack.js";

const app = new App();
const env = { region: process.env.CDK_REGION ?? "us-east-2" }; // golden-path primary region.
const databaseUrl = process.env.DATABASE_URL ?? "";

new ApiStack(app, "AgentNetworkApi-dev", { env, stage: "dev", databaseUrl });
new ApiStack(app, "AgentNetworkApi-prod", { env, stage: "prod", databaseUrl });

app.synth();
