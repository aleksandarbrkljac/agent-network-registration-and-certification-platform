import { initTRPC, TRPCError } from "@trpc/server";
import { IllegalTransitionError } from "@agent-network/shared";
import type { Context } from "./context.js";

/**
 * tRPC initialisation. One `initTRPC` instance, parameterised by the
 * request `Context` (logger + repositories + faux current user). Domain errors
 * are mapped to tRPC error codes here so routers and services can throw plain
 * domain errors and stay HTTP-agnostic.
 */

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    // Surface illegal lifecycle transitions as a clean 4xx rather than a 500 —
    // they are caller errors (e.g. publishing a non-certified agent), not bugs.
    if (error.cause instanceof IllegalTransitionError) {
      return {
        ...shape,
        data: {
          ...shape.data,
          code: "PRECONDITION_FAILED",
          transition: { from: error.cause.from, to: error.cause.to },
        },
      };
    }
    return shape;
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

/**
 * Logging middleware: records the procedure path, type, duration, and outcome on
 * the request-scoped Powertools Logger. This is the real `@aws-lambda-powertools/logger`
 * — it runs fine outside Lambda, so the observability seam is real.
 *
 * NOTE: an X-Ray Tracer segment and an EMF Metrics flush would attach here
 * (one span per procedure, one `procedure.duration` metric). Both are deferred to
 * the AWS deployment pass and intentionally not wired in the local demo.
 */
const loggingMiddleware = t.middleware(async ({ ctx, path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;
  ctx.logger.info("trpc.procedure", {
    path,
    type,
    durationMs,
    ok: result.ok,
  });
  return result;
});

/** Base procedure: every procedure inherits the logging middleware. */
export const publicProcedure = t.procedure.use(loggingMiddleware);

/**
 * Maps a thrown domain error to a tRPC error. Services throw domain errors
 * (`IllegalTransitionError`, plain `Error` for not-found / invariant failures);
 * routers call this so the HTTP boundary stays in one place.
 */
export function toTRPCError(error: unknown): TRPCError {
  if (error instanceof TRPCError) {
    return error;
  }
  if (error instanceof IllegalTransitionError) {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: error.message,
      cause: error,
    });
  }
  if (error instanceof Error) {
    return new TRPCError({ code: "BAD_REQUEST", message: error.message, cause: error });
  }
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unknown error" });
}
