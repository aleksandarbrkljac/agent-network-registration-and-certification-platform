/**
 * Centralized API URL (build-frontend-backends §Phase 3 "Centralizes API URL
 * configuration"). Reads `VITE_API_URL` when present (Vite inlines `import.meta.env`
 * at build time) and falls back to the local dev server origin.
 *
 * The verified-live dev API runs at http://localhost:3001 with permissive CORS
 * for the Vite origin, so the default works out of the box.
 */

interface ViteEnv {
  readonly VITE_API_URL?: string;
}

/**
 * Reads `import.meta.env.VITE_API_URL` without assuming a Vite bundler context,
 * so the package also imports cleanly under Node (tests, SSR) where `import.meta`
 * has no `env`. Falls back to the local dev origin.
 */
function resolveApiUrl(): string {
  const env = (import.meta as ImportMeta & { env?: ViteEnv }).env;
  return env?.VITE_API_URL ?? "http://localhost:3001";
}

export const API_URL: string = resolveApiUrl();
