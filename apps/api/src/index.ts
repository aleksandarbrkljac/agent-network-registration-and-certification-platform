/**
 * @agent-network/api — tRPC API + service layer and discovery.
 *
 * Public surface for the shared api-client (M5) and the deployment seams:
 *   - `appRouter` / `AppRouter` : the merged tRPC router + its type.
 *   - `createContext` / `Context` : request-context factory + type.
 *   - `createCallerFactory` : server-side calling (caller tests, dashboards).
 */

export { appRouter, type AppRouter } from "./routers/index.js";
export { createContext, type Context, type CreateContextOptions } from "./context.js";
export { createCallerFactory } from "./trpc.js";
