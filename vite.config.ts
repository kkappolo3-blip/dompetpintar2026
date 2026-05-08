import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Configure for Vercel Node.js deployment
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    // Optimize for Vercel Node.js environment
    ssr: {
      external: ["@cloudflare/wrangler"]
    }
  }
});
