import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Vite config for the Agent Network web SPA. Dev server on 5173 to
// match the API's CORS allow-list (http://localhost:5173, verified live).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
