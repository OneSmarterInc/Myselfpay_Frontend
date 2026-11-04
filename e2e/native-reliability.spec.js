import { test, expect } from "@playwright/test";
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36 MySelfPayAndroid/1.0.10",
});
test("app information pages retain navigation, readable layout and no footer", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const [label, heading, route] of [
    ["About", "About MySelfPay", "about"],
    ["Terms & Privacy", "Terms & Privacy", "privacy-terms"],
    ["For imaging centers", "For imaging centers", "for-imaging-centers"],
    ["Contact", "Contact MySelfPay", "contact"],
  ]) {
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "App navigation" })
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp("#" + route + "$"));
    await expect(page.locator(".site-footer")).toBeHidden();
    for (const width of [320, 390, 800]) {
      await page.setViewportSize({ width, height: 844 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: `../tmp/apk110-${route}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Imaging options. Clearer prices." }),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("circular loading appears for pending data and clears on success and failure", async ({
  page,
}) => {
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  await page.route("**/api/directory-summary", async (r) => {
    await gate;
    await r.fulfill({ json: { listing_count: 0, state_count: 0 } });
  });
  await page.goto("/");
  await expect(page.locator(".native-loading")).toBeVisible();
  await page.screenshot({ path: "../tmp/apk110-data-loading.png" });
  release();
  await expect(page.locator(".native-loading")).toHaveCount(0);
  await page.route("**/about/", (r) =>
    r.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page.getByRole("link", { name: "About", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
  await expect(page.locator(".native-loading")).toHaveCount(0);
  await page.unroute("**/about/");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "About MySelfPay", exact: true }),
  ).toBeVisible();
});
