import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda";
import type { APIGatewayProxyEventV2, Context as LambdaContext } from "aws-lambda";
import { createContext } from "./context.js";
import { appRouter } from "./routers/index.js";

/**
 * PRODUCTION SEAM — Lambda entry point.
 *
 * This is the real `@trpc/server` AWS Lambda adapter export. It is NOT used by the
 * local demo (the demo runs `server.ts` on a standalone Node HTTP server), but the
 * CDK stack in `cdk/` ships this compiled handler (`dist/handler.handler`) behind an
 * API Gateway HTTP API — `cdk:synth` emits the full template.
 *
 * On AWS, `createContext` would additionally:
 *   - attach the Powertools Logger to the Lambda context (cold-start keys, requestId),
 *   - (deferred) open an X-Ray Tracer segment and flush EMF Metrics,
 *   - resolve `currentUser` from the API Gateway authorizer claims instead of the
 *     demo principal.
 */
export const handler = awsLambdaRequestHandler({
  router: appRouter,
  createContext: ({ event, context }: { event: APIGatewayProxyEventV2; context: LambdaContext }) =>
    createContext({ requestId: context.awsRequestId ?? event.requestContext.requestId }),
});
