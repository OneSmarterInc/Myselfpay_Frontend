import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("original homepage geometry and screenshots match at desktop and mobile widths", async ({
  page,
  context,
}) => {
  const records = [];
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator("#profile")).toBeEnabled();
    await expect(page.locator("#publicCoverage")).toContainText("74");
    await page.evaluate(() => document.fonts.ready);
    const actual = await page
      .locator(
        "header,.welcome-intro,.welcome-steps,.welcome-paths,.site-footer",
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          class: node.className,
          rect: JSON.stringify(node.getBoundingClientRect()),
          font: getComputedStyle(node).fontFamily,
        })),
      );
    const actualPixels = await page.screenshot({
      path: `../react-home-${viewport.width}.png`,
      fullPage: true,
    });
    await page.goto("/__ui-reference.html");
    await page.evaluate(() => document.fonts.ready);
    const original = await page
      .locator(
        "header,.welcome-intro,.welcome-steps,.welcome-paths,.site-footer",
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          class: node.className,
          rect: JSON.stringify(node.getBoundingClientRect()),
          font: getComputedStyle(node).fontFamily,
        })),
      );
    const originalPixels = await page.screenshot({
      path: `../original-home-${viewport.width}.png`,
      fullPage: true,
    });
    expect(actualPixels.equals(originalPixels)).toBe(true);
    expect(actual).toEqual(original);
    records.push({ viewport, matched: true });
  }
  await writeFile("../ui-geometry.json", JSON.stringify(records, null, 2));
});

test("original search layout matches the React search on desktop and mobile", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page
      .getByRole("button", { name: "Find imaging options", exact: true })
      .click();
    await expect(page.locator("#catalogStatus")).toContainText(
      "Directory loaded:",
    );
    await page.evaluate(() => document.fonts.ready);
    const selectors = "header,h1,.tabs,.grid,.grid aside.panel,.site-footer";
    const actual = await page
      .locator(selectors)
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          class: node.className,
          rect: JSON.stringify(node.getBoundingClientRect()),
        })),
      );
    const actualPixels = await page.screenshot({
      path: `../react-search-${viewport.width}.png`,
      fullPage: true,
    });
    await page.goto("/__ui-reference-search.html");
    await expect(page.locator("#searchForm")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const original = await page
      .locator(selectors)
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          class: node.className,
          rect: JSON.stringify(node.getBoundingClientRect()),
        })),
      );
    const originalPixels = await page.screenshot({
      path: `../original-search-${viewport.width}.png`,
      fullPage: true,
    });
    expect(actualPixels.equals(originalPixels)).toBe(true);
    expect(actual).toEqual(original);
  }
});
