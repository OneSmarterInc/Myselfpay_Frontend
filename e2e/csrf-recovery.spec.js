import { test, expect } from "@playwright/test";

test("signup recovers cookie-bound CSRF automatically before sending an OTP", async ({ page }) => {
  await page.goto("/#signup");
  await page.locator("#accountName").fill("Synthetic CSRF Test");
  await page.locator("#accountUsername").fill("csrf_" + Date.now());
  await page.locator("#accountPassword").fill("Synthetic-only-passphrase!");
  await page.locator("#accountConfirm").fill("Synthetic-only-passphrase!");
  await page.locator("#accountPhone").fill("5550123987");
  const guest = await page.request.post("/api/guest", {
    data: {}, headers: { Origin: new URL(page.url()).origin },
  });
  expect(guest.ok()).toBe(true);
  let attempts = 0;
  let recoveredHeader = false;
  await page.route("**/api/registration/mobile/code", async route => {
    attempts++;
    const headers = { ...route.request().headers() };
    if (attempts === 1) delete headers["x-csrf-token"];
    else recoveredHeader = !!headers["x-csrf-token"];
    await route.continue({ headers });
  });
  await page.locator("#accountSubmit").click();
  await expect(page.locator("#registrationOTP")).toBeVisible();
  expect(attempts).toBe(2);
  expect(recoveredHeader).toBe(true);
  await expect(page.locator(".mobile-account .flow-error")).toBeEmpty();
});

