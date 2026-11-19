import { test, expect } from "@playwright/test";

const member = { id: "m1", name: "", phone: "+16145550123", tenant: "selfpay", booking_eligible: true };
const item = (over = {}) => ({
  id: "MSP-SYNTHETIC",
  tracking_token: "synthetic-only-token",
  clinic_name: "Synthetic Imaging Center",
  clinic_phone: "",
  location: "Dayton",
  status: "requested",
  price_text: "$400",
  service: "MRI",
  exam: "Knee",
  created: 1793700000,
  slots: [{ date: "2026-12-10", period: "morning" }],
  timezone: "America/New_York",
  ...over,
});

async function signedIn(page, requests) {
  await page.route("**/api/catalog*", (r) => r.fulfill({ json: { entries: [], offers: [], locations: [] } }));
  await page.route("**/api/guest-usage", (r) => r.fulfill({ json: {} }));
  await page.route(/\/api\/me$/, (r) => r.fulfill({ json: { member, csrf: "c" } }));
  await page.route("**/api/dashboard?*", (r) =>
    r.fulfill({ json: { profile: { name: "", phone: member.phone, zip_code: "", created: 1793700000 }, stats: {}, total: requests().length, page: 1, pages: 1, requests: requests() } }),
  );
}

test("a patient cancels an open request and sees it closed", async ({ page }) => {
  let cancelled = null;
  await signedIn(page, () => [cancelled ? item({ status: "cancelled", closed_reason: "patient_cancelled" }) : item()]);
  await page.route("**/api/booking/cancel", (r) => {
    cancelled = r.request().postDataJSON();
    return r.fulfill({ json: { id: "MSP-SYNTHETIC", status: "cancelled", closed_reason: "patient_cancelled" } });
  });
  await page.goto("/#dashboard");
  await page.getByRole("button", { name: "Cancel request", exact: true }).click();
  await page.getByRole("button", { name: "Yes, cancel request" }).click();
  await expect(page.locator(".request-status")).toContainText("You cancelled this request");
  expect(cancelled).toEqual({ id: "MSP-SYNTHETIC" });
  await expect(page.getByRole("button", { name: "Cancel request", exact: true })).toHaveCount(0);
});

test("closed requests show why and offer no Cancel button", async ({ page }) => {
  await signedIn(page, () => [item({ status: "unable", closed_reason: "no_openings" })]);
  await page.goto("/#dashboard");
  await expect(page.locator(".request-status")).toContainText("no openings");
  await expect(page.getByRole("button", { name: "Cancel request", exact: true })).toHaveCount(0);
});

test("Forget me texts a code, then deletes the account and signs out", async ({ page }) => {
  const calls = [];
  await signedIn(page, () => []);
  await page.route("**/api/account/forget", (r) => {
    const body = r.request().postDataJSON();
    calls.push(body);
    return r.fulfill({ json: body.code ? { deleted: true } : { verification_id: "v1", expires_in: 600 } });
  });
  await page.goto("/#dashboard");
  await page.getByRole("button", { name: "My profile", exact: true }).click();
  await page.getByRole("button", { name: "Forget me", exact: true }).click();
  await page.getByRole("button", { name: "Text me a code" }).click();
  await page.getByLabel("6-digit code we texted you").fill("123456");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByText("Your account and requests are deleted.")).toBeVisible();
  expect(calls).toEqual([{}, { verification_id: "v1", code: "123456" }]);
});
