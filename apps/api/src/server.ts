import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFile, statSync } from "node:fs";
import path from "node:path";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { createContext } from "./context.js";
import { appRouter } from "./routers/index.js";

/**
 * Single-process server. Serves the tRPC API under `/trpc` and — when a built
 * SPA is present at `STATIC_DIR` — the SPA itself, both on one `PORT`. This is
 * what the Render single web service runs (the image bakes `VITE_API_URL=/trpc`
 * so the SPA calls the API same-origin).
 *
 * The two-port local workflow (`docker compose up`, `pnpm dev`) keeps working:
 * the SPA is served by Vite on :5173 and batches against this API on :3001 under
 * `/trpc`, hence the permissive CORS kept on the tRPC path. Under `pnpm dev` the
 * `apps/web/dist` build does not exist, so static serving is simply skipped.
 *
 * Routing:
 *   - `GET /healthz`     -> 200 {"ok":true} immediately (Render health check).
 *   - `/trpc*`           -> strip the `/trpc` prefix, delegate to the tRPC handler.
 *   - everything else    -> static file from STATIC_DIR, with SPA (index.html)
 *                           fallback for extension-less paths.
 */

const PORT = Number(process.env.PORT ?? 3001);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";

/** Where the built SPA lives. Overridable so Render/Docker can point elsewhere. */
const STATIC_DIR = process.env.STATIC_DIR ?? path.join(process.cwd(), "apps/web/dist");
const STATIC_ROOT = path.resolve(STATIC_DIR);
/** Pure-API dev (`pnpm dev`) has no build — skip static serving instead of crashing. */
const STATIC_ENABLED = existsSync(STATIC_ROOT);

/** tRPC handler (no `middleware` option here — CORS is applied by the outer server). */
const trpcHandler = createHTTPHandler({
  router: appRouter,
  createContext: () => createContext(),
});

/** Minimal content-type map for the assets the Vite build emits. */
const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

function applyCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", WEB_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

function notFound(res: ServerResponse): void {
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not Found");
}

function sendFile(filePath: string, res: ServerResponse): void {
  readFile(filePath, (err, data) => {
    if (err) {
      notFound(res);
      return;
    }
    const type = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(data);
  });
}

/** Serve a static asset, falling back to index.html for client-side routes. */
function serveStatic(pathname: string, res: ServerResponse): void {
  if (!STATIC_ENABLED) {
    notFound(res);
    return;
  }

  const rel = pathname.replace(/^\/+/, "");
  const resolved = path.resolve(STATIC_ROOT, rel);

  // Path-traversal guard: never serve outside the static root.
  if (resolved !== STATIC_ROOT && !resolved.startsWith(STATIC_ROOT + path.sep)) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  if (existsSync(resolved) && statSync(resolved).isFile()) {
    sendFile(resolved, res);
    return;
  }

  // SPA fallback: an extension-less route that doesn't resolve to a file gets the
  // app shell so client-side routing can take over. Missing assets stay 404.
  if (path.extname(pathname) === "") {
    sendFile(path.join(STATIC_ROOT, "index.html"), res);
    return;
  }

  notFound(res);
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const rawUrl = req.url ?? "/";
  const pathname = decodeURIComponent(rawUrl.split("?")[0] ?? "/");

  // Health check — no DB work, answer immediately.
  if (pathname === "/healthz") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // tRPC lives under /trpc in every mode. Strip the prefix and delegate.
  if (pathname === "/trpc" || pathname.startsWith("/trpc/")) {
    applyCors(res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const stripped = rawUrl.slice("/trpc".length);
    req.url = stripped.startsWith("/") ? stripped : `/${stripped}`;
    trpcHandler(req, res);
    return;
  }

  serveStatic(pathname, res);
});

server.listen(PORT, () => {
  const staticNote = STATIC_ENABLED ? `, SPA from ${STATIC_ROOT}` : " (no SPA build — API only)";
  console.log(
    `agent-network api listening on http://0.0.0.0:${PORT} — tRPC at /trpc, CORS: ${WEB_ORIGIN}${staticNote}`,
  );
});
