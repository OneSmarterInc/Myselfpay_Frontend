import { test, expect } from "@playwright/test";

test("directory opens as an accordion and sample and National reset restrictive filters", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find imaging options", exact: true })
    .click();
  await page.locator("#browseDirectory").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#dirRows details.lead")).toHaveCount(10);
  await page.locator("#dirRows summary").first().click();
  const expanded = page.locator("#dirRows details[open]");
  await expect(expanded).toContainText("Other imaging:");
  await expect(expanded).toContainText("Location / coverage:");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.locator("#budget").fill("1");
  await page.locator("#type").selectOption("fixed");
  const pendingSample = page.waitForResponse((response) =>
    response.url().endsWith("/api/search"),
  );
  await page.locator("#sampleSearch").click();
  const sample = await (await pendingSample).json();
  expect(sample.search.scope).toBe("city");
  expect(sample.search.location).toBe("Cincinnati, OH");
  expect(sample.search.mod).toBe("");
  expect(sample.search.body).toBe("");
  expect(sample.search.budget).toBe(0);
  expect(sample.nearby_unpriced.length + sample.offers.length).toBeGreaterThan(
    0,
  );
  for (const entry of [
    ...sample.offers.map((offer) => offer.entry),
    ...sample.nearby_unpriced,
  ]) {
    expect(JSON.stringify([entry.area, entry.locations])).toMatch(
      /Cincinnati/i,
    );
  }
  await expect(page.locator("#searchNotice")).toBeEmpty();
  await expect(page.locator("article.card").first()).toBeVisible();
  const pendingNational = page.waitForResponse((response) =>
    response.url().endsWith("/api/search"),
  );
  await page.locator("#location").fill("National");
  await page.getByRole("button", { name: "Find options", exact: true }).click();
  const national = await (await pendingNational).json();
  expect(national.search.location).toBe("National");
  expect(national.search.mod).toBe("");
  expect(national.search.body).toBe("");
  expect(national.search.budget).toBe(0);
  expect(national.search.type).toBe("all");
  const represented = new Set(
    [...national.offers, ...national.programs].map(
      (offer) => offer.entry.booking_id,
    ),
  );
  for (const entry of [
    ...national.nearby_unpriced,
    ...national.program_entries,
  ])
    represented.add(entry.booking_id);
  const catalog = await (await page.request.get("/api/catalog")).json();
  expect(represented.size).toBe(catalog.entries.length);
  await expect(page.locator("article.card")).toHaveCount(10);
  await expect(page.locator("#searchNotice")).toBeEmpty();
});
