import { test, expect } from "@playwright/test";

test("current-location search loads the whole selected state and recalculates overseas miles locally", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 39.140183, longitude: -84.505829 });
  const requests = [],
    apiRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/"))
      apiRequests.push(request.url() + (request.postData() || ""));
    if (request.url().endsWith("/api/search"))
      requests.push(request.postDataJSON());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find imaging options", exact: true })
    .click();
  await page.locator("#location").fill("Ohio");
  await page.getByRole("button",{name:"Find options",exact:true}).click();
  await expect(page.locator("article.card").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Ask MySelfPay", exact: true })
    .click();
  const loaded = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/search") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("switch", { name: "Near to me", exact: true })
    .click();
  const data = await (await loaded).json();
  expect(data.resolved_location.state).toBe("OH");
  await expect(
    page.getByText("Showing centers across OH.", { exact: false }),
  ).not.toBeVisible();
  await expect(page.locator("article.card").first()).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[0]).toMatchObject({
    location: "Ohio",
    scope: "state",
    mod: "",
    budget: 0,
    type: "all",
  });
  expect(apiRequests.some((url) => /\/api\/catalog$/.test(url))).toBe(false);
  expect(apiRequests.some((url) => url.includes("/spatial-bundle/"))).toBe(
    false,
  );
  await page.locator("#body").fill("reference only");
  await page.getByRole("button", { name: "Find options", exact: true }).click();
  expect(requests).toHaveLength(2);
  await page.bringToFront();
  const resume = page.getByRole("switch", {
    name: "Near to me",
    exact: true,
  });
  if ((await resume.getAttribute("aria-checked")) !== "true") await resume.click();
  await context.setGeolocation({ latitude: 19.076, longitude: 72.8777 });
  await expect
    .poll(
      async () => {
        const text = await page
          .locator("article.card")
          .first()
          .locator(".small")
          .filter({ hasText: /miles away/ })
          .first()
          .textContent();
        return Number(
          text.match(/about ([\d,.]+) miles/)?.[1].replaceAll(",", ""),
        );
      },
      { timeout: 15000 },
    )
    .toBeGreaterThan(7000);
  expect(requests).toHaveLength(2);
  expect(JSON.stringify(apiRequests)).not.toMatch(
    /19\.076|72\.8777|39\.140183/,
  );
  const next = page.getByRole("button", { name: "Next", exact: true });
  if (await next.isVisible()) {
    await next.click();
    await expect(
      page.getByRole("navigation", { name: "Imaging center results pages" }),
    ).toContainText("Page 2");
    await context.setGeolocation({ latitude: 19.077, longitude: 72.878 });
    await expect(
      page.getByRole("navigation", { name: "Imaging center results pages" }),
    ).toContainText("Page 2");
  }
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "19.076",
  );
  await page.getByRole("switch", { name: "Near to me", exact:true }).click();
  await expect(
    page.getByRole("switch", { name: "Near to me", exact: true }),
  ).toBeVisible();
});

test("five-digit ZIP registration persists and automatically searches after login", async ({
  page,
}) => {
  const email = `zip-ui-${Date.now()}@example.com`,
    password = "Synthetic-only-passphrase!";
  await page.goto("/#signup");
  await page.locator("#accountName").fill("Synthetic ZIP User");
  await page.locator("#accountEmail").fill(email);
  await page.locator("#accountZip").fill("4520");
  expect(
    await page
      .locator("#accountZip")
      .evaluate((input) => input.checkValidity()),
  ).toBe(false);
  await page.locator("#accountZip").fill("45202");
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
  expect((await profile.json()).member.zip_code).toBe("45202");
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
  await page.locator("#location").fill("Ohio");
  await page.getByRole("button",{name:"Find options",exact:true}).click();
  await expect(page.locator("article.card").first()).toBeVisible();
  await page
    .getByRole("switch", { name: "Near to me", exact: true })
    .click();
  await expect(
    page.getByText("Location permission was denied.", { exact: false }),
  ).toBeVisible();
  await page.locator("#location").fill("Ohio");
  await page.getByRole("button",{name:"Find options",exact:true}).click();
  await expect(page.locator("article.card").first()).toBeVisible();
  await page.getByRole("button", { name: "Find options", exact: true }).click();
  await expect(page.locator("article.card").first()).toBeVisible();
  await expect(
    page.getByText("Location permission was denied.", { exact: false }),
  ).not.toBeVisible();
});
