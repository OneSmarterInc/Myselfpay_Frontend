import { test, expect } from "@playwright/test";

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`homepage layout and journeys remain responsive at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator("#publicCoverage")).toContainText("74");
    await expect(page.getByRole("heading", { name: "Find self-pay MRI and CT near you." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Find imaging options", exact: true })).toBeVisible();
    await expect(page.locator(".welcome-intro").getByRole("button", { name: "Center login", exact: true })).toBeVisible();
    await expect(page.locator("header").getByRole("button", { name: "Center login", exact: true })).toHaveCount(0);
    await expect(page.locator(".welcome-steps")).toBeVisible();
    await expect(page.locator(".site-footer")).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("button", { name: "Find imaging options", exact: true })).toHaveCSS("background-color", "rgb(30, 34, 38)");
  });
  test(`search filters remain usable and responsive at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Find imaging options", exact: true }).click();
    await expect(page.locator("#catalogStatus")).toContainText("Directory loaded:");
    await expect(page.locator("#searchForm")).toBeVisible();
    await expect(page.locator("#location")).toBeEditable();
    await expect(page.locator("#mod")).toBeEnabled();
    await expect(page.getByRole("button", { name: "Find options", exact: true })).toBeVisible();
    await expect(page.getByRole("switch", { name: "Near to me", exact: true })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `../tmp/search-layout-${viewport.width}.png`, fullPage: true });
  });
}
