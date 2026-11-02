import { test, expect } from "@playwright/test";

for (const scenario of [
  { name: "US state", latitude: 39.14, longitude: -84.5, location: "Ohio" },
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
    await expect(page.getByRole("button",{name:"Use my location",exact:true})).toHaveCount(0);
    await expect(page.getByText("Signed in: guest / Guest",{exact:true})).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Sign out of guest session"})).toBeVisible();
    await expect(page.getByRole("switch", {name:"Near to me",exact:true})).toHaveCount(0);
    expect(await page.locator("#accountLogin").evaluate(el=>!!(el.compareDocumentPosition(document.querySelector("#profile")) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await page.locator("#location").fill(scenario.location);
    await page.getByRole("button",{name:"Find options",exact:true}).click();
    await expect(page.locator("article.card").first()).toBeVisible();
    const loaded = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/search") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("switch", { name: "Near to me", exact: true })
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
    await expect(page.getByText("Showing centers across", {exact:false})).toHaveCount(0);
    await expect(page.getByRole("combobox", {name:"Sort results"})).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Find and compare imaging options" })).toHaveCount(0);
    const nav = await page.locator("header").boundingBox();
    const firstCard = await page.locator("article.card").first().boundingBox();
    if (page.viewportSize().width > 760) expect(firstCard.y - nav.y - nav.height).toBeLessThan(220);
    const toggle = page.getByRole("switch", { name: /Near to me/ });
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    const info = page.getByRole("button", { name: "About nearest results" });
    await info.hover();
    await expect(page.getByRole("tooltip")).toContainText("Complete details");
    await info.focus();
    await expect(page.getByRole("tooltip")).toBeVisible();
    const miles = await page.locator("article.card").evaluateAll(cards => cards.map(card => {
      const match = card.textContent.match(/about ([\d,]+\.\d) miles away/);
      return match ? Number(match[1].replaceAll(",", "")) : Infinity;
    }));
    expect(miles).toEqual([...miles].sort((a,b)=>a-b));
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(JSON.stringify(requests)).not.toContain(String(scenario.latitude));
    expect(JSON.stringify(requests)).not.toContain(String(scenario.longitude));
    expect(
      await page.evaluate(() => JSON.stringify(localStorage)),
    ).not.toContain(String(scenario.latitude));
  });
}

for (const scenario of [
  { latitude: 19.076, longitude: 72.8777, selected: "Ohio", expected: "OH" },
  { latitude: 39.14, longitude: -84.5, selected: "California", expected: "CA" },
]) {
  test(`explicit ${scenario.selected} selection waits for Find options and stays selected with GPS`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({
      latitude: scenario.latitude,
      longitude: scenario.longitude,
    });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Find imaging options", exact: true })
      .click();
    await expect(page.getByRole("switch", {name:"Near to me",exact:true})).toHaveCount(0);
    await page.locator("#location").fill("National");
    await page.getByRole("button",{name:"Find options",exact:true}).click();
    await expect(page.locator("article.card").first()).toBeVisible();
    await page
      .getByRole("switch", { name: "Near to me", exact: true })
      .click();
    await expect(page.locator("article.card").first()).toBeVisible();
    const oldCards = await page.locator("article.card h3").allTextContents();
    const stateRequests = [];
    page.on("request", (request) => {
      if (
        request.url().endsWith("/api/search") &&
        request.postDataJSON()?.location === scenario.selected
      )
        stateRequests.push(request);
    });
    await page.locator("#locationToggle").click();
    const selected = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/search") &&
        response.request().postDataJSON()?.location === scenario.selected,
    );
    await page
      .locator("#cityChoices")
      .getByRole("button", { name: scenario.selected, exact: true })
      .click();
    await expect(page.locator("#searchNotice")).toContainText("Search changed");
    expect(stateRequests).toHaveLength(0);
    expect(await page.locator("article.card h3").allTextContents()).toEqual(
      oldCards,
    );
    await page
      .getByRole("button", { name: "Find options", exact: true })
      .click();
    const data = await (await selected).json();
    expect(data.resolved_location.state).toBe(scenario.expected);
    await expect(page.locator("#location")).toHaveValue(scenario.selected);
    await expect(page.locator("article.card").first()).toBeVisible();
    await expect(
      page.getByRole("switch", { name: "Near to me", exact: true }),
    ).toBeVisible();
    const gps = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/search") &&
        response.request().postDataJSON()?.location === scenario.selected,
    );
    await page
      .getByRole("switch", { name: "Near to me", exact: true })
      .click();
    expect((await (await gps).json()).resolved_location.state).toBe(
      scenario.expected,
    );
    await expect(page.getByText("Showing centers across", {exact:false})).toHaveCount(0);
    await page
      .getByRole("button", { name: "Find options", exact: true })
      .click();
    await expect(page.locator("#location")).toHaveValue(scenario.selected);
  });
}
