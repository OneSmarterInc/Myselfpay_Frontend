import { test, expect } from "@playwright/test";

test("directory cards display stored prices and keep quote-only centers distinct", async ({
  page,
}) => {
  const priced = {
    name: "Synthetic Stored Price Center",
    booking_id: "stored-price-fixture",
    area: "Ohio",
    states: "OH",
    entity: "Center",
    checked: "2026-10-01",
    source: "https://example.com",
    mri: "$399 per noncontrast scan/body region",
    ct: "RESTRICTED: coronary calcium-scoring screening CT $79",
  };
  const quote = {
    ...priced,
    name: "Synthetic Quote Only",
    booking_id: "quote-fixture",
    mri: "Available; quote required",
    ct: "Not offered",
  };
  await page.route("**/api/search", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({
      response,
      json: {
        ...data,
        offers: [],
        programs: [],
        program_entries: [],
        nearby_unpriced: [priced, quote],
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find imaging options", exact: true })
    .click();
  await page.locator("#location").fill("National");
  await page
    .locator("#searchForm")
    .getByRole("button", { name: "Find options", exact: true })
    .click();
  const card = page
    .locator("article.card")
    .filter({
      has: page.getByRole("heading", { name: priced.name, exact: true }),
    });
  await expect(card.locator(".price")).toContainText(
    "MRI: $399 per noncontrast scan/body region",
  );
  await expect(card.locator(".price")).toContainText(
    "CT: RESTRICTED: coronary calcium-scoring screening CT $79",
  );
  await expect(card).not.toContainText("Ask for a price");
  await expect(
    page
      .locator("article.card")
      .filter({
        has: page.getByRole("heading", { name: quote.name, exact: true }),
      })
      .locator(".price"),
  ).toHaveText("Ask for a price");
  await card.screenshot({ path: "../price-card-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await card.screenshot({ path: "../price-card-mobile.png" });
  await page.locator("#mod").selectOption("MRI");
  await page
    .locator("#searchForm")
    .getByRole("button", { name: "Find options", exact: true })
    .click();
  await expect(card.locator(".price")).not.toContainText("$79");
  await card.locator("[data-detail]").click();
  await expect(page.locator(".detailgrid .price")).toContainText("MRI: $399");
});
