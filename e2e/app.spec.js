import { completeMobileRegistration, completeMobileLogin } from "./mobile-account.js";
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
  await expect(page.locator(".facility-reference h1")).toBeVisible();
  await expect(page.locator(".facility-reference")).toContainText("Service details and prices");
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
  await page.locator("#profile").click();
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
  if (await page.locator("#accountZip").count()) await page.locator("#accountZip").fill("45202");
  await completeMobileRegistration(page);
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible({ timeout: 15000 });
  await page.locator("#profile").click();
  await page.locator("#accountLogin").click();
  if (await page.locator("#accountZip").count()) await page.locator("#accountZip").fill("45202");
  await completeMobileLogin(page);
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
  const session = await page.request.get("/api/me");
  expect(session.ok()).toBe(true);
  expect((await session.json()).member.mobile_verified).toBe(true);
});

test("expired cookies clear signed-in UI and permit sign-out", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find imaging options", exact: true })
    .click();
  await expect(page.locator("#profile")).toHaveAttribute("aria-label", "Sign out of guest session");
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
    page.getByRole("heading", { name: "Welcome back", exact: true }),
  ).toBeVisible();
});

test("request a time offers account choices and preserves the center", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Find imaging options", exact: true }).click();
  await page.getByRole("button", { name: "Try sample: knee MRI in Cincinnati" }).click();
  await page.locator("[data-detail]").first().click();
  await page.setViewportSize({width:390,height:844});
  await page.locator("[data-appointment]").first().click();
  await expect(page.getByRole("heading", {name:"Log in to request a time",exact:true})).toBeVisible();
  await expect(page.locator("#accountPhone")).toHaveCount(0);
  await expect(page.locator("#modalBody")).toContainText("We only require a valid US-based phone number which can receive an OTP to create a request.");
  await page.getByRole("button",{name:"Create account and continue",exact:true}).click();
  await page.locator("#accountName").fill("Synthetic Patient");
  await expect(page.locator("#accountName")).toHaveValue("Synthetic Patient");
  await expect(page.getByRole("combobox",{name:"Country code"})).toHaveCount(1);
  const requestPhone="614555" + String(Date.now()).slice(-4);
  await page.locator("#accountPhone").fill(requestPhone);
  await page.locator("#accountSubmit").click();
  await expect(page.locator(".otp-input-group input")).toHaveCount(6);
  await page.locator("#registrationOTP").fill("000000");
  await page.locator("#accountSubmit").click();
  await expect(page.getByRole("alert")).toContainText("Incorrect");
  await page.locator("#registrationOTP").fill("123456");
  for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:900});
    expect(await page.locator("body").evaluate(el=>el.scrollWidth<=window.innerWidth+1)).toBe(true);
  }
  await page.locator("#accountSubmit").click();
  await expect(page.getByRole("heading",{name:"Request a Time",exact:true})).toBeVisible();
  await expect(page.locator(".time-choice-panel")).toBeVisible();
  await expect(page.locator("#bookingName")).not.toHaveAttribute("required", "");
  await expect(page.locator("#bookingEmail")).toHaveCount(0);
  await expect(page.locator(".flow-verified")).toContainText("+1"+requestPhone);
});
