import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vitest config for component/render tests: jsdom
// environment + Testing Library, with the React plugin so JSX compiles.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // Vitest owns the component/render tests under `src/**` only. The Playwright
    // responsive design specs live in `test/design/**` and are run by
    // `pnpm test:design`, so they are excluded here to keep the two runners apart.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "test/design/**"],
  },
});
