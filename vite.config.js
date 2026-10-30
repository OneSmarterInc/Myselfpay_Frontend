import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
export default defineConfig({
  test: { include: ["tests/**/*.test.js"] },
  plugins: [
    react(),
    {
      name: "selfpay-information-pages",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const fixture = {
            "/__ui-reference.html": "original-home.html",
            "/__ui-reference-search.html": "original-search.html",
          }[request.url];
          if (fixture) {
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            response.end(
              readFileSync(
                new URL("./tests/fixtures/" + fixture, import.meta.url),
              ),
            );
            return;
          }
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
