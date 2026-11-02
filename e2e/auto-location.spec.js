import { test, expect } from "@playwright/test";

for (const scenario of [
  { name: "US state", latitude: 39.14, longitude: -84.5, location: "OH" },
  {
    name: "overseas national fallback",
    latitude: 19.076,
    longitude: 72.8777,
    location: "National",
  },
]) {
  test(`location button works from a blank state field: ${scenario.name}`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({
      latitude: scenario.latitude,
      longitude: scenario.longitude,
    });
    const requests = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/"))
        requests.push(request.url() + (request.postData() || ""));
    });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Find imaging options", exact: true })
      .click();
    await expect(page.locator("#location")).toHaveValue("");
    const loaded = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/search") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Use my location", exact: true })
      .click();
    const response = await loaded;
    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON().location).toBe(scenario.location);
    await expect(page.locator("#location")).toHaveValue(scenario.location);
    await expect(page.locator("article.card").first()).toBeVisible();
    await expect(page.locator("article.card").first()).toContainText(
      /about [\d,]+\.\d miles away/,
    );
    await expect(
      page.getByText(
        "Select a US state, city or ZIP before using your location.",
        { exact: false },
      ),
    ).not.toBeVisible();
    if (scenario.location === "National")
      await expect(
        page.getByText("Showing centers across the US directory.", {
          exact: false,
        }),
      ).toBeVisible();
    expect(JSON.stringify(requests)).not.toContain(String(scenario.latitude));
    expect(JSON.stringify(requests)).not.toContain(String(scenario.longitude));
    expect(
      await page.evaluate(() => JSON.stringify(localStorage)),
    ).not.toContain(String(scenario.latitude));
  });
}
