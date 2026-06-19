import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda";
import type { APIGatewayProxyEventV2, Context as LambdaContext } from "aws-lambda";
import { createContext } from "./context.js";
import { appRouter } from "./routers/index.js";

/**
 * PRODUCTION SEAM — documented stub.
 *
 * This is the real `@trpc/server` AWS Lambda adapter export. It is NOT deployed in
 * the local demo (the demo runs `server.ts` on a standalone Node HTTP server), but
 * it MUST typecheck so the deploy seam is real rather than faked. The CDK stack in
 * `cdk/` wires this handler behind an API Gateway HTTP API.
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
