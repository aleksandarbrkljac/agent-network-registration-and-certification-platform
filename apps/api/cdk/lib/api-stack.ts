/**
 * PRODUCTION SEAM — documented CDK stub.
 *
 * This skeleton shows the on-path AWS shape for the tRPC backend: the `handler.ts`
 * Lambda behind an API Gateway HTTP API with a per-environment custom domain
 * base-path mapping, following `build-frontend-backends/rules/cdk-api-infrastructure`
 * and `apply-engineering-guidelines` (region us-east-2, Powertools, cost tags).
 *
 * It is NOT compiled by `tsc -p tsconfig.json` (which only includes `src/**`) and
 * NOT deployed in the demo. It depends on `aws-cdk-lib` + `constructs`, which the
 * demo does not install. To activate the deploy seam later: `pnpm add -D aws-cdk-lib
 * constructs aws-cdk`, then `cdk deploy` with `cdk/tsconfig.json`. Kept as a stub so
 * the gap reads as DEFERRED, not done.
 *
 * @example Sketch of the intended stack (commented to keep the demo install lean):
 *
 * import { Stack, type StackProps, Duration, Tags } from "aws-cdk-lib";
 * import { Runtime } from "aws-cdk-lib/aws-lambda";
 * import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
 * import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
 * import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
 * import type { Construct } from "constructs";
 *
 * export interface ApiStackProps extends StackProps {
 *   stage: "dev" | "prod";
 *   databaseUrl: string; // DynamoDB swap target (not SQLite in prod).
 * }
 *
 * export class ApiStack extends Stack {
 *   constructor(scope: Construct, id: string, props: ApiStackProps) {
 *     super(scope, id, props);
 *     const fn = new NodejsFunction(this, "TrpcHandler", {
 *       entry: "src/handler.ts",
 *       handler: "handler",
 *       runtime: Runtime.NODEJS_20_X,
 *       timeout: Duration.seconds(15),
 *       memorySize: 512,
 *       environment: {
 *         DATABASE_URL: props.databaseUrl,
 *         POWERTOOLS_SERVICE_NAME: "agent-network-api",
 *       },
 *       tracing: Tracing.ACTIVE, // X-Ray Tracer attaches at deploy time.
 *     });
 *     const api = new HttpApi(this, "HttpApi", {
 *       defaultIntegration: new HttpLambdaIntegration("TrpcIntegration", fn),
 *       corsPreflight: { allowOrigins: [props.stage === "prod" ? "https://app.example.com" : "*"] },
 *     });
 *     Tags.of(this).add("cost-center", "agent-network");
 *     // Custom domain + base-path mapping per environment would attach here.
 *   }
 * }
 */

export const CDK_STACK_STUB = true as const;
