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
  },
});
