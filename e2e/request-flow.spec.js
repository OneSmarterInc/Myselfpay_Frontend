import { test, expect } from "@playwright/test";

test("a returning member who taps Create account is logged in with a code", async ({
  page,
}) => {
  const intents = [];
  await page.route("**/api/auth/mobile/code", async (route) => {
    const body = route.request().postDataJSON();
    intents.push(body.intent);
    if (body.intent === "register") {
      return route.fulfill({
        status: 409,
        json: {
          error: "This mobile number is already registered. Please log in.",
        },
      });
    }
    return route.fulfill({
      json: { challenge: "c1", verification_id: "v1", phone: "+16145550123" },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Find imaging options", exact: true }).click();
  await page.locator("#location").fill("Ohio");
  await page.getByRole("button", { name: "Find options", exact: true }).click();
  await page.locator("article.card [data-appointment]").first().click();
  await page.getByRole("button", { name: "Continue with my phone", exact: true }).click();
  await page.locator("#accountName").fill("Synthetic Patient");
  await page.locator("#accountPhone").fill("6145550123");
  await page.locator("#accountSubmit").click();
  await expect(page.locator(".mobile-account")).toContainText("already has an account");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator("#accountSubmit")).toHaveText(/Verify and (log in|request a time)/);
  expect(intents).toEqual(["register", "login"]);
});

test("the request carries the exam of the listing that was picked", async ({
  page,
}) => {
  let verified = false;
  let payload = null;
  await page.route("**/api/auth/mobile/code", (route) =>
    route.fulfill({
      json: { challenge: "c1", verification_id: "v1", phone: "+16145550123" },
    }),
  );
  await page.route("**/api/auth/mobile/verify", (route) => {
    verified = true;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route(/\/api\/me$/, (route) =>
    verified
      ? route.fulfill({
          json: {
            member: {
              id: "m1",
              name: "Sam",
              phone: "+16145550123",
              tenant: "selfpay",
              booking_eligible: true,
            },
          },
        })
      : route.continue(),
  );
  await page.route("**/api/booking/options", (route) =>
    route.fulfill({
      json: {
        phone: "+16145550123",
        timezone: "America/New_York",
        price_text: "$400.00 fixed",
        delivery: "ok",
        notification_target: "center",
        today: { "America/New_York": "2026-11-23" },
      },
    }),
  );
  await page.route("**/api/booking/create", (route) => {
    payload = route.request().postDataJSON();
    return route.fulfill({ status: 400, json: { error: "stub" } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Find imaging options", exact: true }).click();
  await page.locator("#location").fill("Ohio");
  await page.getByRole("button", { name: "Find options", exact: true }).click();
  await page.locator("article.card [data-appointment]").first().click();
  await page.getByRole("button", { name: "Continue with my phone", exact: true }).click();
  await page.locator("#accountName").fill("Sam");
  await page.locator("#accountPhone").fill("6145550123");
  await page.locator("#accountSubmit").click();
  await page.locator("#registrationOTP").fill("123456");
  await page.locator("#accountSubmit").click();
  await page.getByRole("button", { name: "Afternoon" }).first().click();
  await page.locator("#bookingConsent").check();
  await page.locator("#bookingSubmit").click();
  await expect.poll(() => payload?.service).toMatch(/^(MRI|CT)$/);
});
