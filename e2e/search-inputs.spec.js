import { test, expect } from "@playwright/test";

test("body is informational, miles are statewide and budget is optional with at most six digits", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find imaging options", exact: true })
    .click();
  await page.locator("#location").fill("Cincinnati, OH");
  const search = async () => {
    const pending = page.waitForResponse((response) =>
      response.url().endsWith("/api/search"),
    );
    await page
      .locator("#searchForm")
      .getByRole("button", { name: "Find options", exact: true })
      .click();
    const response = await pending;
    expect(response.status()).toBe(200);
    return response.json();
  };
  const ids = (data) =>
    [
      ...data.offers.map((offer) => offer.id),
      ...data.programs.map((offer) => offer.id),
      ...data.nearby_unpriced.map((entry) => entry.booking_id),
      ...data.program_entries.map((entry) => entry.booking_id),
    ].sort();
  await page.locator("#radius").selectOption("25");
  const first = await search();
  expect(ids(first).length).toBeGreaterThan(0);
  await page.locator("#body").fill("arbitrary notes, not a known body part");
  for (const radius of ["100", "250"]) {
    await page.locator("#radius").selectOption(radius);
    const result = await search();
    expect(ids(result)).toEqual(ids(first));
    expect(result.search.body).toBe("arbitrary notes, not a known body part");
  }
  await expect(page.locator("#budget")).not.toHaveAttribute("required");
  await page.locator("#budget").pressSequentially("1234567");
  await expect(page.locator("#budget")).toHaveValue("123456");
  await page.locator("#budget").fill("");
  await page.locator("#budget").pressSequentially("a");
  await expect(page.locator("#budget")).toHaveValue("");
  const noBudget = await search();
  expect(noBudget.search.budget).toBe(0);
  expect(ids(noBudget)).toEqual(ids(first));
});
