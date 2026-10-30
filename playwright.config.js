import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL: `http://localhost:${process.env.E2E_PORT || 5173}`,
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    screenshot: "only-on-failure",
  },
  webServer: process.env.E2E_EXTERNAL_SERVER
    ? undefined
    : {
        command: `npm run dev -- --host localhost --port ${process.env.E2E_PORT || 5173} --strictPort`,
        url: `http://localhost:${process.env.E2E_PORT || 5173}`,
        reuseExistingServer: !process.env.CI,
      },
});
