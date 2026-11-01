import { test, expect } from "@playwright/test";

test("National lists directory centers with ten results per page", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find imaging options", exact: true })
    .click();
  await page.locator("#location").fill("National");
  await page.locator("#type").selectOption("quote");
  await page
    .locator("#searchForm")
    .getByRole("button", { name: "Find options", exact: true })
    .click();
  await expect(page.locator("article.card")).toHaveCount(10);
  const first = await page.locator("article.card h3").first().textContent();
  await expect(
    page.getByRole("navigation", { name: "Imaging center results pages" }),
  ).toContainText("Page 1");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("article.card")).toHaveCount(10);
  await expect(page.locator("article.card h3").first()).not.toHaveText(first);
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.locator("article.card h3").first()).toHaveText(first);
  await expect(
    page.locator("article.card").first().locator(".facts .fact"),
  ).toHaveCount(2);
  await page.locator("article.card [data-select]").first().check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Imaging center results pages" }),
  ).toContainText("Page 2");
  await page.locator("article.card [data-select]").first().check();
  await page.locator("#compare").click();
  await expect(page.locator(".comparison-table thead th")).toHaveCount(3);
  await expect(page.locator(".comparison-table")).toContainText("Published price");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.locator("article.card [data-detail]").first().click();
  await expect(page.locator(".detailgrid h1")).toBeVisible();
  await expect(page.locator(".detailgrid")).toContainText("Service details and prices");
  await page.locator("#directory").click();
  await expect(page.locator("#dirRows details.lead")).toHaveCount(10);
  await page.locator("#dirRows summary").first().click();
  await expect(page.locator("#dirRows details[open]")).toContainText("MRI:");
  await expect(page.locator("#dirRows details[open]")).toContainText("CT:");
  await expect(
    page
      .locator("#dirRows details[open]")
      .getByRole("link", { name: "Provider source" }),
  ).toBeVisible();
});

test("state-only search works and optional filters apply independently", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find imaging options", exact: true })
    .click();
  await page.locator("#location").fill("Ohio");
  const search = async () => {
    const response = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/search") &&
        response.request().method() === "POST",
    );
    await page
      .locator("#searchForm")
      .getByRole("button", { name: "Find options", exact: true })
      .click();
    return (await response).json();
  };
  const all = await search();
  expect(all.offers.length + all.nearby_unpriced.length).toBeGreaterThan(0);
  const total =
    all.offers.length +
    all.nearby_unpriced.length +
    all.programs.length +
    all.program_entries.length;
  await expect(
    page.getByRole("heading", {
      name: `${total} matching listing${total === 1 ? "" : "s"}`,
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.locator("#body").getAttribute("required")).toBeNull();
  await page.locator("#mod").selectOption("CT");
  const ct = await search();
  expect(ct.offers.length).toBeGreaterThan(0);
  expect(ct.offers.every((offer) => offer.mod === "CT")).toBe(true);
  await page.locator("#mod").selectOption("");
  await page.locator("#budget").fill("500");
  const budget = await search();
  expect(budget.offers.length).toBeGreaterThan(0);
  expect(
    budget.offers.every(
      (offer) => offer.amount !== null && offer.amount <= 500,
    ),
  ).toBe(true);
  expect(budget.nearby_unpriced).toEqual([]);
});

test("the original homepage branding and journeys are restored", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Find self-pay MRI and CT near you." }),
  ).toBeVisible();
  await expect(page.locator(".brand-logo")).toHaveAttribute("src", "/logo.png");
  await expect(page.locator(".welcome-steps .step-number")).toHaveCount(3);
  await expect(page.locator(".journey-card")).toHaveCount(2);
  await expect(page.locator(".site-footer")).toContainText("Dayton, Ohio");
});

test("original search, comparison and directory work with the DRF backend", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find imaging options", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Find and compare imaging options" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Try sample: knee MRI in Cincinnati" })
    .click();
  await expect(page.locator("[data-detail]").first()).toBeVisible();
  await page.locator("[data-select]").first().check();
  await page
    .getByRole("button", { name: "Compare selected", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Compare selected options" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.locator("#directory").click();
  await expect(
    page.getByRole("heading", { name: /Research directory/ }),
  ).toBeVisible();
  await page.locator("#dirSearch").fill("Ohio");
  await expect(page.locator("#dirCount")).toContainText(/matches|match/);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Find self-pay MRI and CT near you." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("original signup and login forms retain verified DRF sessions", async ({
  page,
}) => {
  const email = `ui-${Date.now()}@example.com`,
    password = "Synthetic-only-passphrase!";
  await page.goto("/#signup");
  await page.locator("#accountName").fill("Synthetic UI Test");
  await page.locator("#accountEmail").fill(email);
  if (await page.locator("#accountZip").count()) await page.locator("#accountZip").fill("45202-1234");
  await page.locator("#accountPassword").fill(password);
  await page.locator("#accountConfirm").fill(password);
  await page.locator("#accountSubmit").click();
  await expect(
    page.getByRole("heading", { name: "Find and compare imaging options" }),
  ).toBeVisible({ timeout: 15000 });
  await page.locator("#profile").click();
  await page.locator("#accountLogin").click();
  await page.locator("#accountEmail").fill(email);
  if (await page.locator("#accountZip").count()) await page.locator("#accountZip").fill("45202-1234");
  await page.locator("#accountPassword").fill(password);
  await page.locator("#accountSubmit").click();
  await expect(
    page.getByRole("heading", { name: "Find and compare imaging options" }),
  ).toBeVisible();
});

test("expired cookies clear signed-in UI and permit sign-out", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find imaging options", exact: true })
    .click();
  await expect(page.locator("#profile")).toHaveText("Sign out");
  await context.clearCookies();
  await page.locator("#profile").click();
  await expect(page.locator("#profile")).toHaveText("Sign in as guest");
  await expect(
    page.getByRole("heading", { name: "Find self-pay MRI and CT near you." }),
  ).toBeVisible();
});

test("original information pages remain public", async ({ page }) => {
  await page.goto("/privacy-terms/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Privacy/,
  );
  await page.goto("/#login");
  await expect(
    page.getByRole("heading", { name: "Log in", exact: true }),
  ).toBeVisible();
});

test("original appointment dialog retains its two-step layout", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find imaging options", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Try sample: knee MRI in Cincinnati" })
    .click();
  await page.locator("[data-detail]").first().click();
  await expect(
    page.locator(".card-actions [data-appointment]").first(),
  ).toHaveCSS("background-color", "rgb(121, 85, 72)");
  await page.locator("[data-appointment]").first().click();
  await expect(
    page.getByRole("heading", {
      name: "Log in to book an appointment",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Log in", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Log in", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await page.locator("[data-appointment]").first().click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.locator("[data-appointment]").first().click();
  await page
    .getByRole("button", { name: "Create account and continue", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Create an account", exact: true }),
  ).toBeVisible();
  await page.locator("#accountName").fill("Synthetic Booker");
  await page.locator("#accountEmail").fill(`booking-${Date.now()}@example.com`);
  await page.locator("#accountPassword").fill("Synthetic-only-passphrase!");
  await page.locator("#accountConfirm").fill("Synthetic-only-passphrase!");
  await page.locator("#accountSubmit").click();
  await expect(
    page.getByRole("heading", { name: "Request a time" }),
  ).toBeVisible();
  await page.locator("#bookingZone").selectOption("America/New_York");
  const date = new Date();
  date.setDate(date.getDate() + 3);
  await page.locator("#bookingDate").fill(date.toISOString().slice(0, 10));
  await page.locator('[data-add-slot="morning"]').click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Confirm your request" }),
  ).toBeVisible();
  await expect(page.locator("#bookingSubmit")).toBeDisabled();
  await page.route("**/api/booking/email-code", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Email delivery is unavailable. Please try again later.",
      }),
    }),
  );
  await page.locator("#bookingEmail").fill("synthetic@example.com");
  await page.locator("#patientCodeSend").click();
  await expect(page.locator("#patientEmailStatus")).toContainText(
    "Email delivery is unavailable",
  );
  await expect(page.locator("#patientEmailStatus")).not.toContainText(
    "Sending",
  );
  await expect(page.locator("#patientCodeSend")).toBeEnabled();
});
