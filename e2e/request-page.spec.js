import { test, expect } from "@playwright/test";

const request = {
  id: "REQ-123", status: "requested", delivery: "sent", clinic_name: "Synthetic Imaging", clinic_phone: "(555) 555-0100",
  location: "1 Main St, Dayton, OH 45402", service: "MRI", exam: "knee", contrast: "without", slots: [], timezone: "America/New_York",
  price_text: "$400", created: 1795196040, tracking_token: "tok", contact_phone: "(555) 555-0111",
};

async function open(page, value) {
  let current = value;
  await page.route("**/api/booking/patient", (route) => route.fulfill({ json: current }));
  await page.route("**/api/booking/cancel", (route) => {
    current = { ...current, status: "cancelled", closed_reason: "patient_cancelled" };
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/#request/REQ-123/tok");
}

test("request page names the facility, marks the step and cancels with a confirm", async ({ page }) => {
  await open(page, request);
  await expect(page.locator(".flow-facility-line")).toHaveText("Synthetic Imaging · MRI knee without contrast · (555) 555-0100");
  await expect(page.locator(".flow-progress li[aria-current=step]")).toContainText("Facility calls you");
  await expect(page.getByRole("link", { name: "← Back to results" })).toHaveCount(1);
  await page.getByRole("button", { name: "Cancel request" }).click();
  await expect(page.getByText("Cancel your request with Synthetic Imaging? They will be told.")).toBeVisible();
  await page.getByRole("button", { name: "Yes, cancel" }).click();
  await expect(page.getByRole("heading", { name: "Request closed" })).toBeVisible();
});

test("confirmed request shows the time, directions, call and calendar", async ({ page }) => {
  await open(page, { ...request, status: "scheduled", approved_slot: { date: "2026-12-02", time: "09:30", timezone: "America/New_York" } });
  await expect(page.getByRole("heading", { name: "Time confirmed" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Directions" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call (555) 555-0100" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add to calendar" })).toHaveAttribute("download", "myselfpay-REQ-123.ics");
  await expect(page.getByRole("button", { name: "Cancel this appointment" })).toBeVisible();
});

test("Back to results returns to the same results and scroll position", async ({ page }) => {
  await page.route("**/api/booking/patient", (route) => route.fulfill({ json: request }));
  await page.goto("/");
  await page.getByRole("button", { name: "Find imaging options", exact: true }).click();
  await page.getByRole("button", { name: "Try sample: knee MRI in Cincinnati" }).click();
  await expect(page.locator("[data-detail]").first()).toBeVisible();
  const first = await page.locator("article.card h3").first().textContent();
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(200);
  const before = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => { location.hash = "request/REQ-123/tok"; });
  await expect(page.locator(".flow-back-top")).toBeVisible();
  await page.locator(".flow-back-top").click();
  await expect(page.locator("article.card h3").first()).toHaveText(first);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before - 40);
});
