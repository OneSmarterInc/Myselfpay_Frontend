import { test, expect } from "@playwright/test";

async function stubs(page) {
  await page.route("**/api/me", (route) => route.fulfill({ status: 401, json: { error: "Not signed in" } }));
  await page.route("**/api/center/find", (route) => {
    const query = route.request().postDataJSON().query;
    const matches = /riverside/i.test(query)
      ? [{ id: "with-email", name: "Riverside Imaging", area: "Dayton", states: "OH" }]
      : /hilltop/i.test(query)
        ? [{ id: "no-email", name: "Hilltop Radiology", area: "Akron", states: "OH" }]
        : [];
    return route.fulfill({ json: { matches, more: false } });
  });
  await page.route("**/api/center/listing-code", (route) => {
    const listing = route.request().postDataJSON().listing;
    return route.fulfill({
      json: listing === "no-email"
        ? { no_email: true, support_email: "partners@onesmarter.com" }
        : { verification_id: "v1", expires_in: 600, sent_to: "d***@example.test" },
    });
  });
}

test("a center finds its listing by name and gets the code at the email on file", async ({ page }) => {
  await stubs(page);
  await page.goto("/center-login");
  await page.getByRole("button", { name: "Find your listing" }).click();
  await expect(page.getByRole("heading", { name: "Find your listing" })).toBeVisible();
  await page.locator("#centerFind").fill("riverside");
  await page.getByRole("button", { name: "Find my listing" }).click();
  await expect(page.getByText("Riverside Imaging")).toBeVisible();
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.getByRole("status").filter({ hasText: "d***@example.test" })).toContainText("Riverside Imaging");
  await expect(page.locator("#centerEmail")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Verify and open inbox" })).toBeDisabled();
});

test("a listing with no email on file points to partners@onesmarter.com", async ({ page }) => {
  await stubs(page);
  await page.goto("/center-login?find=1");
  await page.locator("#centerFind").fill("hilltop");
  await page.getByRole("button", { name: "Find my listing" }).click();
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.getByText("We don’t have an email on file for Hilltop Radiology.")).toBeVisible();
  await expect(page.getByRole("link", { name: "partners@onesmarter.com" })).toBeVisible();
});

test("no match says so, and the Center FAQ is on the login page and the header FAQ", async ({ page }) => {
  await stubs(page);
  await page.goto("/center-login?find=1");
  await page.locator("#centerFind").fill("nothing here");
  await page.getByRole("button", { name: "Find my listing" }).click();
  await expect(page.getByText("We found no listing for that search.")).toBeVisible();
  await page.getByRole("button", { name: "Back to email login" }).click();
  await page.getByText("Center FAQ", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "How do requests arrive?" })).toBeVisible();
  await page.locator("#faqLink").click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Center FAQ" })).toBeVisible();
});
