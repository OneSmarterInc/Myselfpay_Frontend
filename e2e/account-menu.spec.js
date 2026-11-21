import { test, expect } from "@playwright/test";
import { chooseFromAccountMenu } from "./account-menu.js";

const member = { id: "synthetic-1", tenant: "member", name: "Vera Test", phone: "+15555550142", booking_eligible: true };

async function signedIn(page) {
  let out = false;
  await page.route("**/api/me", (route) =>
    route.fulfill(out ? { status: 401, json: { error: "Not signed in" } } : { json: { member, csrf: "test-csrf" } }),
  );
  await page.route("**/api/logout", (route) => {
    out = true;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/guest-usage", (route) => route.fulfill({ json: { usage: {} } }));
  await page.route("**/api/catalog**", (route) =>
    route.fulfill({ json: { version: "test", entry_count: 0, offer_count: 0, entries: [], offers: [], locations: [], metadata_only: true } }),
  );
  await page.route("**/api/dashboard**", (route) =>
    route.fulfill({ json: { requests: [], total: 0, pages: 1, profile: { name: member.name, phone: member.phone } } }),
  );
}

test("members get one account menu with My requests, Profile and Sign out", async ({ page }) => {
  await signedIn(page);
  await page.goto("/");
  const button = page.locator("#accountMenuButton");
  await expect(button).toContainText("V · 0142");
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toHaveCount(0);
  await button.click();
  await expect(page.getByRole("menuitem")).toHaveText(["My requests", "Profile", "Sign out"]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await chooseFromAccountMenu(page, "Profile");
  await expect(page.getByRole("heading", { name: "My profile", exact: true }).first()).toBeVisible();
  await chooseFromAccountMenu(page, "My requests");
  await expect(page.getByRole("heading", { name: "My requests", exact: true })).toBeVisible();
  await chooseFromAccountMenu(page, "Sign out");
  await expect(page.locator("#accountMenuButton")).toHaveCount(0);
});

test("a signed-in center sees its name in the menu on the home page", async ({ page }) => {
  await page.route("**/api/me", (route) => route.fulfill({ status: 401, json: { error: "Not signed in" } }));
  await page.route("**/api/center/dashboard", (route) =>
    route.fulfill({ json: { email: "desk@example.com", centers: [{ id: "c1", name: "Synthetic Imaging" }], requests: [], center_csrf: "t" } }),
  );
  await page.route("**/api/center/logout", (route) => route.fulfill({ json: { ok: true } }));
  await page.addInitScript(() => localStorage.setItem("msp-center-session", JSON.stringify({ name: "Synthetic Imaging" })));
  await page.goto("/");
  await expect(page.locator("#accountMenuButton")).toContainText("Synthetic Imaging");
  await chooseFromAccountMenu(page, "Center dashboard");
  await expect(page).toHaveURL(/#center/);
  await chooseFromAccountMenu(page, "Sign out");
  await expect(page.locator("#accountMenuButton")).toHaveCount(0);
});

test("a center sign-in ends the member session on that device", async ({ page }) => {
  await signedIn(page);
  let memberLogouts = 0;
  await page.route("**/api/logout", (route) => {
    memberLogouts += 1;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/center/dashboard", (route) =>
    route.fulfill({ json: { email: "desk@example.com", centers: [{ id: "c1", name: "Synthetic Imaging" }], requests: [], center_csrf: "t" } }),
  );
  await page.addInitScript(() => localStorage.setItem("msp-center-session", JSON.stringify({ name: "Synthetic Imaging" })));
  await page.goto("/#center");
  await expect(page.locator("#accountMenuButton")).toContainText("Synthetic Imaging");
  await expect.poll(() => memberLogouts).toBeGreaterThan(0);
  await expect(page.getByRole("navigation", { name: "Center dashboard sections" }).getByRole("button", { name: "Inbox" })).toBeVisible();
});
