import { test, expect } from "@playwright/test";

test("metadata starts before a slow summary and duplicate startup reads coalesce", async ({ page }) => {
  let releaseSummary, summaries = 0, metadata = 0;
  const gate = new Promise(resolve => { releaseSummary = resolve; });
  await page.route("**/api/directory-summary", async route => {
    summaries++;
    await gate;
    await route.fulfill({ json: { listing_count: 1, state_count: 1, spatial_api_version: 1, spatial_ready: true } });
  });
  await page.route("**/api/me", route => route.fulfill({ json: { member: { id: "synthetic", tenant: "guest", name: "Guest" }, csrf: "test-csrf" } }));
  await page.route("**/api/guest-usage", route => route.fulfill({ json: { usage: {} } }));
  await page.route("**/api/catalog?metadata=1", route => {
    metadata++;
    return route.fulfill({ json: { version: "test", entry_count: 1, offer_count: 0, entries: [], offers: [], locations: ["Ohio"], metadata_only: true } });
  });
  await page.goto("/#search", { waitUntil: "domcontentloaded" });
  await expect.poll(() => metadata).toBe(1);
  expect(summaries).toBe(1);
  releaseSummary();
  await expect(page.locator("#catalogStatus")).toContainText("Directory loaded:");
  expect(metadata).toBe(1);
});
