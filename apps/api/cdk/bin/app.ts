/**
 * PRODUCTION SEAM — documented CDK app entry stub.
 *
 * Intended shape (not compiled/deployed in the demo; depends on `aws-cdk-lib`):
 *
 * import { App } from "aws-cdk-lib";
 * import { ApiStack } from "../lib/api-stack.js";
 *
 * const app = new App();
 * const env = { region: "us-east-2" }; // golden-path primary region.
 * new ApiStack(app, "AgentNetworkApi-dev", {
 *   env,
 *   stage: "dev",
 *   databaseUrl: process.env.DATABASE_URL ?? "",
 * });
 * new ApiStack(app, "AgentNetworkApi-prod", {
 *   env,
 *   stage: "prod",
 *   databaseUrl: process.env.DATABASE_URL ?? "",
 * });
 * app.synth();
 *
 * Activate with: `pnpm add -D aws-cdk-lib constructs aws-cdk` then `cdk deploy`.
 */

export const CDK_APP_STUB = true as const;
