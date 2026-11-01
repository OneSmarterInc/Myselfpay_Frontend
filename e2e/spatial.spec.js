import { test, expect } from "@playwright/test";
import { latLngToCell, cellToLatLng, gridDisk } from "h3-js";

test("browser GPS reaches authenticated indexed data using only H3 7 and reuses same-cell bundles", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 39.140183, longitude: -84.505829 });
  const requests = [];
  const apiRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/"))
      apiRequests.push(request.url() + (request.postData() || ""));
    if (request.url().includes("/api/v1/spatial-bundle/"))
      requests.push({ url: request.url(), body: request.postData() });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find imaging options", exact: true })
    .click();
  await page.getByRole("button", { name: "Ask MySelfPay", exact: true }).click();
  await page
    .getByRole("button", { name: "Use my location", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Stop location updates" }),
  ).toBeVisible();
  await expect(
    page.getByText("Nearby results updated.", { exact: false }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.locator("article.card").first()).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].url).toMatch(/\/api\/v1\/spatial-bundle\/[0-9a-f]{15}\/$/);
  expect(requests[0].body).toBeNull();
  expect(apiRequests.some((url) => /\/api\/catalog$/.test(url))).toBe(false);
  expect(JSON.stringify(apiRequests)).not.toContain("39.140183");
  expect(JSON.stringify(apiRequests)).not.toContain(
    latLngToCell(39.140183, -84.505829, 11),
  );
  await context.setGeolocation({ latitude: 39.140184, longitude: -84.505829 });
  await page.locator("#body").fill("reference only");
  await page.getByRole("button", { name: "Find options", exact: true }).click();
  expect(requests).toHaveLength(1);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "39.140",
  );
  await page.bringToFront();
  const resume = page.getByRole("button", {
    name: "Use my location",
    exact: true,
  });
  if (await resume.isVisible()) await resume.click();
  const next = gridDisk(latLngToCell(39.140183, -84.505829, 7), 1).find(
    (cell) => cell !== latLngToCell(39.140183, -84.505829, 7),
  );
  const [latitude, longitude] = cellToLatLng(next);
  await context.setGeolocation({ latitude, longitude });
  await expect.poll(() => requests.length, { timeout: 15000 }).toBe(2);
  await page.getByRole("button", { name: "Stop location updates" }).click();
  await expect(
    page.getByRole("button", { name: "Use my location", exact: true }),
  ).toBeVisible();
});

test("ZIP+4 registration persists and automatically searches its base ZIP after login", async ({
  page,
}) => {
  const email = `zip-ui-${Date.now()}@example.com`,
    password = "Synthetic-only-passphrase!";
  await page.goto("/#signup");
  await page.locator("#accountName").fill("Synthetic ZIP User");
  await page.locator("#accountEmail").fill(email);
  await page.locator("#accountZip").fill("45202");
  expect(
    await page
      .locator("#accountZip")
      .evaluate((input) => input.checkValidity()),
  ).toBe(false);
  await page.locator("#accountZip").fill("45202-1234");
  await page.locator("#accountPassword").fill(password);
  await page.locator("#accountConfirm").fill(password);
  const search = () =>
    page.waitForRequest(
      (request) =>
        request.url().endsWith("/api/search") &&
        request.postDataJSON()?.location === "45202",
    );
  const registered = search();
  await page.locator("#accountSubmit").click();
  expect((await registered).postDataJSON().sort).toBe("distance");
  await expect(page.locator("article.card").first()).toBeVisible();
  const profile = await page.request.get("/api/me");
  expect((await profile.json()).member.zip_code).toBe("45202-1234");
  await page.locator("#profile").click();
  await page.locator("#accountLogin").click();
  await page.locator("#accountEmail").fill(email);
  await page.locator("#accountPassword").fill(password);
  const loggedIn = search();
  await page.locator("#accountSubmit").click();
  expect((await loggedIn).postDataJSON().location).toBe("45202");
  await expect(page.locator("article.card").first()).toBeVisible();
});

test("denied location permission provides a usable manual-search fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        watchPosition: (_ok, fail) => {
          setTimeout(() => fail({ code: 1 }), 0);
          return 1;
        },
        clearWatch: () => {},
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find imaging options", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use my location", exact: true })
    .click();
  await expect(
    page.getByText("Location permission was denied.", { exact: false }),
  ).toBeVisible();
  await page.locator("#location").fill("Ohio");
  await page.getByRole("button", { name: "Find options", exact: true }).click();
  await expect(page.locator("article.card").first()).toBeVisible();
});
