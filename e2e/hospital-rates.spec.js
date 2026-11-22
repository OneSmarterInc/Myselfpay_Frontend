import { test, expect } from "@playwright/test";

const priced = {
  name: "Synthetic Rates Center",
  booking_id: "rates-fixture",
  area: "Ohio",
  states: "OH",
  entity: "Center",
  checked: "2026-10-01",
  source: "https://example.com",
  mri: "$450 per noncontrast scan/body region",
  ct: "Not offered",
  other: "",
};

const hospital = (n, name, miles, cash, gross, lo, hi) => ({
  cms_number: "36000" + n, hospital_name: name, city: "Dayton", zip: "45409", distance_miles: miles,
  cash_price: cash, gross_charge: gross, negotiated_low: lo, negotiated_high: hi, payer_count: 5,
  reading_included: "Unknown", shared_list_id: null, source_url: null,
});

const rates = {
  zip: "45459", cpt: "70551", exam: "MRI brain without contrast", radius_miles: 25, hospital_count: 3, system_count: 3,
  ranges: { cash: { low: 1033, high: 2525, hospitals: 3 }, gross: { low: 1732, high: 3109, hospitals: 3 }, insurer: { low: 234, high: 819, hospitals: 3 } },
  checked_on: "2026-11", reading_note: "Hospital figures may not include the radiologist's reading.",
  hospitals: [
    hospital(1, "Synthetic Hospital One", 2.6, 1033, 2583, 235, 810),
    hospital(2, "Synthetic Hospital Two", 5.3, 2220, 2220, 237, 708),
    hospital(3, "Synthetic Hospital Three", 8.6, 2525, 2525, null, null),
  ],
};

async function openDetails(page, rateStub) {
  await page.route("**/api/hospital-rates**", rateStub);
  await page.route("**/api/search", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({ response, json: { ...data, offers: [], programs: [], program_entries: [], nearby_unpriced: [priced] } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Find imaging options", exact: true }).click();
  await page.locator("#location").fill("45459");
  await page.locator("#searchForm").getByRole("button", { name: "Find options", exact: true }).click();
  const card = page.locator("article.card").filter({ has: page.getByRole("heading", { name: priced.name, exact: true }) });
  await card.locator("[data-detail]").click();
}

test("facility details show what nearby hospitals publish, with ranges and a table", async ({ page }) => {
  await openDetails(page, (route) => route.fulfill({ json: rates }));
  const panel = page.locator(".hr-panel");
  await expect(panel.getByRole("heading", { name: "Hospitals near you publish" })).toBeVisible();
  await expect(panel).toContainText("$1,033 to $2,525");
  await expect(panel).toContainText("$234 to $819");
  await expect(panel).toContainText("3 hospitals");
  await expect(panel).toContainText("This facility $450");
  await expect(panel.locator(".hr-marker")).toHaveCount(3);
  await expect(panel).toContainText("Hospital figures may not include the radiologist's reading.");
  await expect(panel.getByRole("row")).toHaveCount(4);
  await expect(panel).toContainText("Not posted");
  await panel.screenshot({ path: "../hospital-rates-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  const wide = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 5).map((el) => el.tagName + "." + el.className));
  expect(wide).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await panel.screenshot({ path: "../hospital-rates-mobile.png" });
});

test("the panel stays out of the way when hospital rates are not available", async ({ page }) => {
  await openDetails(page, (route) => route.fulfill({ status: 500, json: { error: "unavailable" } }));
  await expect(page.locator(".facility-reference-hero")).toBeVisible();
  await expect(page.locator(".hr-panel")).toHaveCount(0);
});
