import { test, expect } from "@playwright/test";
import { completeMobileRegistration } from "./mobile-account.js";

async function register(page) {
  await page.goto("/#signup");
  await page.locator("#accountName").fill("Synthetic Mobile Booker");
  await page.locator("#accountUsername").fill("mobile_" + Date.now());
  await page.locator("#accountPassword").fill("Synthetic-only-passphrase!");
  await page.locator("#accountConfirm").fill("Synthetic-only-passphrase!");
  await expect(page.locator("input[type=email]")).toHaveCount(0);
  await completeMobileRegistration(page);
  await page.locator("#location").fill("Ohio");
  await page.getByRole("button", { name: "Find options", exact: true }).click();
  await page.locator("article.card [data-appointment]").first().click();
}

test("verified mobile accounts go directly to slots, without patient email or OTP at booking", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await register(page);
  await expect(page.locator(".time-choice-panel")).toBeVisible();
  await expect(page.locator("#bookingEmail")).toHaveCount(0);
  await expect(page.locator("#patientCodeSend")).toHaveCount(0);
  await expect(page.locator("#bookingZone")).toHaveCount(0);
  await expect(page.locator(".flow-verified")).toContainText(
    "Verified mobile number:",
  );
  const rows = page.locator(".time-choice-row");
  await expect(rows).toHaveCount(5);
  for (let i = 0; i < 3; i++)
    await rows
      .nth(i)
      .getByRole("button", { name: "Morning", exact: true })
      .click();
  await rows
    .nth(3)
    .getByRole("button", { name: "Morning", exact: true })
    .click();
  await expect(page.locator("#bookingError")).toContainText("up to 3");
  await expect(
    page.locator(".time-choice-row button[aria-pressed=true]"),
  ).toHaveCount(3);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page
        .locator("#modalBody")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
  }
  await page.locator("#bookingConsent").check();
  await page.route("**/api/booking/create", async (route) => {
    const data = route.request().postDataJSON();
    expect(data.email).toBeUndefined();
    expect(data.verification_token).toBeUndefined();
    expect(data.phone).toMatch(/^\+1/);
    await route.fulfill({
      json: {
        id: "MSP-MOBILE-TEST",
        tracking_token: "synthetic-token",
        delivery: "sent",
      },
    });
  });
  await page.route("**/api/booking/patient", (route) =>
    route.fulfill({
      json: {
        id: "MSP-MOBILE-TEST",
        clinic_name: "Synthetic Imaging",
        status: "requested",
        delivery: "sent",
        service: "MRI",
        exam: "",
        contrast: "unknown",
        slots: [],
        timezone: "America/New_York",
      },
    }),
  );
  await page.locator("#bookingSubmit").click();
  await expect(
    page.getByRole("heading", { name: "Request sent", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open secure chat" }),
  ).toHaveCount(0);
});

test("mobile OTP registration has six responsive boxes and requires a successful verification", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/#signup");
  await page.locator("#accountName").fill("OTP Layout");
  await page.locator("#accountUsername").fill("otp_" + Date.now());
  await page.locator("#accountPassword").fill("Synthetic-only-passphrase!");
  await page.locator("#accountConfirm").fill("Synthetic-only-passphrase!");
  await page.locator("#accountPhone").fill("5550123456");
  await page.locator("#accountSubmit").click();
  await expect(page.locator(".otp-input-group input")).toHaveCount(6);
  await page
    .locator(".mobile-account")
    .screenshot({ path: "mobile-registration-360.png" });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page
    .locator(".mobile-account")
    .screenshot({ path: "mobile-registration-1280.png" });
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator("#accountSubmit")).toBeDisabled();
  await page.locator("#registrationOTP").fill("000000");
  await page.locator("#accountSubmit").click();
  await expect(page.getByRole("alert")).toContainText("Incorrect");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
