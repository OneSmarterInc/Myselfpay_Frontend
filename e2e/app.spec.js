import { test, expect } from "@playwright/test";

test("React account signup, saved search and login use DRF sessions", async ({
  page,
}) => {
  const email = `drf-${Date.now()}@example.com`;
  const password = "Synthetic-only-passphrase!";
  await page.goto("/#signup");
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Synthetic DRF Test");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Find your options" }),
  ).toBeVisible();
  await page.getByLabel("State, city or ZIP").fill("Ohio");
  await page
    .getByRole("button", { name: "Search imaging", exact: true })
    .click();
  await page.getByRole("button", { name: "Save search to history" }).click();
  await page.getByRole("link", { name: "Saved history" }).click();
  await expect(
    page.getByRole("button", { name: "Restore search" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Find your options" }),
  ).toBeVisible();
});
test("guest searches actual backend, compares offers and signs out", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Find imaging near you" }).click();
  await expect(
    page.getByRole("heading", { name: "Find your options" }),
  ).toBeVisible();
  await page.getByLabel("State, city or ZIP").fill("Cincinnati, OH");
  await page.getByLabel("Imaging service", { exact: true }).selectOption("MRI");
  await page.getByLabel("Body part / ordered exam").fill("knee");
  await page
    .getByRole("button", { name: "Search imaging", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "View details" }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Compare", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "Compare options" }).click();
  await expect(
    page.getByRole("heading", { name: "Compare your options" }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: /MRI ·/ })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Know your options/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("public pages remain available without authentication", async ({
  page,
}) => {
  await page.goto("/privacy-terms/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Privacy/,
  );
  await page.goto("/#login");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});
