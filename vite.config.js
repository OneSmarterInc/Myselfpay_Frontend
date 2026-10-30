import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  test: { include: ['tests/**/*.test.js'] },
  plugins: [
    react(),
    {
      name: "selfpay-information-pages",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (
            /^\/(about|contact|privacy-terms|for-imaging-centers)\/?$/.test(
              request.url,
            )
          ) {
            request.url = request.url.replace(/\/$/, "") + "/index.html";
          }
          next();
        });
      },
    },
  ],
  server: {
    proxy: { "/api": process.env.DEV_API_TARGET || "http://127.0.0.1:8000" },
  },
});
