import { test, expect } from "@playwright/test";
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
