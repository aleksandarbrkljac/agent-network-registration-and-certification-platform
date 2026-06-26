/**
 * PRODUCTION SEAM — API Gateway HTTP API → Lambda (`src/handler.ts`).
 *
 * Follows `build-frontend-backends/rules/cdk-api-infrastructure` and
 * `apply-engineering-guidelines`: primary region us-east-2, Powertools env,
 * X-Ray active tracing, 90-day logs, cost tags.
 *
 * The Lambda code is the compiled `dist/` output (`pnpm --filter @agent-network/api build`
 * must run first), shipped via `Code.fromAsset` so `cdk synth` needs neither esbuild
 * nor Docker. Production swaps SQLite → DynamoDB inside `packages/db` (isolated there);
 * `databaseUrl` is injected per environment.
 */
import { Stack, type StackProps, Duration, Tags, RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import { Function as LambdaFunction, Runtime, Code, Tracing, Architecture } from "aws-cdk-lib/aws-lambda";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { HttpApi, CorsHttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import type { Construct } from "constructs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
/** Compiled handler bundle: apps/api/dist (sibling of cdk/). */
const distPath = join(here, "..", "..", "dist");

export interface ApiStackProps extends StackProps {
  stage: "dev" | "prod";
  /** Connection string for the production datastore (DynamoDB target, not SQLite). */
  databaseUrl: string;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    const { stage, databaseUrl } = props;

    const logGroup = new LogGroup(this, "TrpcHandlerLogs", {
      retention: RetentionDays.THREE_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const handler = new LambdaFunction(this, "TrpcHandler", {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: "handler.handler",
      code: Code.fromAsset(distPath),
      memorySize: 512,
      timeout: Duration.seconds(15),
      tracing: Tracing.ACTIVE,
      logGroup,
      environment: {
        DATABASE_URL: databaseUrl,
        POWERTOOLS_SERVICE_NAME: "agent-network-api",
        POWERTOOLS_LOG_LEVEL: stage === "prod" ? "INFO" : "DEBUG",
        NODE_OPTIONS: "--enable-source-maps",
      },
    });

    const httpApi = new HttpApi(this, "HttpApi", {
      apiName: `agent-network-api-${stage}`,
      defaultIntegration: new HttpLambdaIntegration("TrpcIntegration", handler),
      corsPreflight: {
        allowOrigins: [stage === "prod" ? "https://app.example.com" : "*"],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.OPTIONS],
        allowHeaders: ["content-type", "authorization"],
      },
    });

    Tags.of(this).add("project_name", "agent-network");
    Tags.of(this).add("cost-center", "agent-network");
    Tags.of(this).add("stage", stage);

    new CfnOutput(this, "ApiUrl", { value: httpApi.apiEndpoint });
  }
}
