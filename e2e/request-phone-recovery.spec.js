import { test, expect } from "@playwright/test";
import { completeMobileRegistration } from "./mobile-account.js";

test("booking phone errors recover into OTP and the dashboard identifies the user by phone", async ({
  page,
}) => {
  await page.goto("/#signup");
  await page.locator("#accountName").fill("Synthetic Patient");
  const phone = await completeMobileRegistration(page);
  await page.locator("#location").fill("Ohio");
  await page.getByRole("button", { name: "Find options", exact: true }).click();
  let requiresVerification = true;
  await page.route("**/api/booking/options", (route) => {
    if (requiresVerification) {
      return route.fulfill({
        status: 400,
        json: {
          error: "A valid US phone number is required to request a time.",
        },
      });
    }
    return route.continue();
  });
  await page.locator("article.card [data-appointment]").first().click();
  await expect(
    page.getByRole("heading", {
      name: "Verify your phone to request a time",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator("input[type=email],input[type=password],#accountName"),
  ).toHaveCount(0);
  await page.locator("#accountPhone").fill(phone);
  await page.locator("#accountSubmit").click();
  await page.locator("#registrationOTP").fill("123456");
  requiresVerification = false;
  await page.locator("#accountSubmit").click();
  await expect(page.locator(".time-choice-panel")).toBeVisible();
  await page.locator("#bookingName").clear();
  await page
    .locator(".time-choice-row button:enabled")
    .filter({ hasText: /^Morning$/ })
    .first()
    .click();
  await page.locator("#bookingConsent").check();
  await page.locator("#bookingSubmit").click();
  await expect(page.locator(".flow-reference-id")).toBeVisible();
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page.locator(".dashboard-account-mini strong")).toHaveText(
    "+1" + phone,
  );
  await expect(page.locator(".dashboard-request")).toHaveCount(1);
  await page.getByRole("button", { name: "My profile", exact: true }).click();
  await expect(page.locator(".dashboard-profile")).toContainText("Username");
  await expect(page.locator(".dashboard-profile")).toContainText("+1" + phone);
});
