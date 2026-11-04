import { test, expect } from "@playwright/test";
test("center login, support message, email OTP and scoped request approval", async ({
  page,
}) => {
  const item = {
    id: "MSP-SYNTHETIC",
    clinic_name: "Synthetic Center",
    status: "requested",
    price_text: "Confirm price",
    slots: [{ date: "2026-12-10", period: "morning" }],
    timezone: "America/New_York",
  };
  let verified = false,
    approved = false;
  await page.route("**/api/center/code", (r) =>
    r.request().postDataJSON().email === "missing@example.test"
      ? r.fulfill({
          status: 404,
          json: {
            error:
              "Your email is not listed in our center directory. Please contact support.",
          },
        })
      : r.fulfill({ json: { verification_id: "synthetic-challenge" } }),
  );
  await page.route("**/api/center/verify", (r) => {
    expect(r.request().postDataJSON().code).toBe("123456");
    verified = true;
    return r.fulfill({ json: { verified: true } });
  });
  await page.route("**/api/center/dashboard", (r) =>
    r.fulfill({
      status: verified ? 200 : 401,
      json: verified
        ? {
            email: "center@example.test",
            center_csrf: "synthetic-csrf",
            centers: [
              {
                id: "center",
                name: "Synthetic Center",
                area: "Dayton",
                email: "center@example.test",
              },
            ],
            requests: [
              { ...item, status: approved ? "scheduled" : "requested" },
            ],
          }
        : { error: "Log in again." },
    }),
  );
  await page.route("**/api/center/request", (r) => {
    expect(r.request().headers()["x-center-csrf"]).toBe("synthetic-csrf");
    if (r.request().postDataJSON().status) approved = true;
    return r.fulfill({
      json: {
        ...item,
        status: approved ? "scheduled" : "requested",
        ...(approved
          ? { contact_hidden: true }
          : {
              first_name: "Synthetic",
              patient_email: "patient@example.test",
              phone: "+16145550142",
            }),
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Center login", exact: true }).click();
  await page
    .getByLabel("Center email", { exact: true })
    .fill("missing@example.test");
  await page.getByRole("button", { name: "Send email code" }).click();
  await expect(page.getByRole("alert")).toContainText("contact support");
  await page
    .getByLabel("Center email", { exact: true })
    .fill("center@example.test");
  await page.getByRole("button", { name: "Send email code" }).click();
  await page.locator("#centerOTP").fill("123456");
  await page.getByRole("button", { name: "Verify and open dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Center dashboard" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: "../tmp/center-portal-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open request", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "patient@example.test" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Approve request", exact: true })
    .click();
  await expect(
    page.getByText("Request closed. Patient contact details are hidden."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "patient@example.test" }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "../tmp/center-portal-desktop.png",
    fullPage: true,
  });
});
