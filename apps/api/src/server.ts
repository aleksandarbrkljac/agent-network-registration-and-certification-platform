import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { createContext } from "./context.js";
import { appRouter } from "./routers/index.js";

/**
 * DEV server. Runs the merged tRPC router on the standalone
 * Node HTTP adapter — no Lambda, no API Gateway. The production seam lives in
 * `handler.ts` (aws-lambda adapter) + `cdk/` and is intentionally not run here.
 *
 * CORS is permissive for the Vite dev origin (http://localhost:5173) so the M5
 * SPA can call this directly in development.
 */

const PORT = Number(process.env.PORT ?? 3001);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";

const server = createHTTPServer({
  router: appRouter,
  createContext: () => createContext(),
  // Permissive dev CORS for the Vite SPA. A production deployment sets the
  // allowed origin on API Gateway instead.
  middleware: (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", WEB_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    next();
  },
});

server.listen(PORT);
console.log(`agent-network api (tRPC) listening on http://localhost:${PORT} — CORS: ${WEB_ORIGIN}`);
