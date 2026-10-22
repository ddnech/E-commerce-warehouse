import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// In dev, Vite forwards /api and /uploads to the Express server,
// so the browser only ever talks to one address (no CORS setup needed).
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, "..", ""), ...loadEnv(mode, ".", "") };
  const apiTarget = env.VITE_API_PROXY || `http://localhost:${env.API_PORT || 8200}`;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: Number(env.CLIENT_DEV_PORT || 5175),
      proxy: {
        "/api": apiTarget,
        "/uploads": apiTarget,
      },
    },
  };
});
