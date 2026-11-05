import { test, expect } from "@playwright/test";
const centers = [
  {
    id: "north",
    name: "Synthetic North Imaging",
    email: "center@example.test",
    area: "Dayton, OH",
    phone: "+16145550142",
    source: "https://example.test",
    mri: "MRI appointments and published prices available on request.",
  },
  {
    id: "south",
    name: "Synthetic South Imaging",
    email: "center@example.test",
    area: "Cincinnati, OH",
    ct: "CT imaging services.",
  },
];
const requests = Array.from({ length: 14 }, (_, i) => ({
  id: `MSP-TEST-${String(i).padStart(2, "0")}`,
  clinic_name: centers[i % 2].name,
  status: ["requested", "scheduled", "voicemail", "unable", "expired"][i % 5],
  created: 1793700000 - i * 3600,
  slots: [{ date: "2026-12-10", period: i % 2 ? "afternoon" : "morning" }],
  price_text: "Clinic will confirm the total.",
  timezone: "America/New_York",
  secure_chat_status: "ready",
  secure_chat_url: "https://mail.example.test/recipient/inbox#thread/synthetic",
}));
async function mock(page, items = requests) {
  await page.route("**/api/center/dashboard", (r) =>
    r.fulfill({
      json: {
        email: "center@example.test",
        center_csrf: "synthetic-csrf",
        centers,
        requests: items,
      },
    }),
  );
  await page.route("**/api/center/request", (r) =>
    r.fulfill({
      json: {
        ...requests.find((x) => x.id === r.request().postDataJSON().id),
        first_name: "Synthetic Jamie",
        patient_email: "patient@example.test",
        phone: "+16145550142",
      },
    }),
  );
}
test("center workspace navigation, filters, pagination and responsive request detail", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/#center");
  await expect(
    page.getByRole("heading", { name: "Center dashboard", exact: true }),
  ).toBeVisible();
  const table = page.getByRole("table", { name: "Appointment requests" });
  await expect(table.getByRole("row")).toHaveCount(11);
  await expect(
    page.getByText("Showing 1–10 of 14", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "../tmp/center-workspace-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(
    page.getByText("Showing 11–14 of 14", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search requests" })
    .fill("MSP-TEST-00");
  await expect(table.getByRole("row")).toHaveCount(2);
  await page
    .getByRole("searchbox", { name: "Search requests" })
    .fill("absent-reference");
  await expect(
    page.getByRole("heading", { name: "No matching requests" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page
    .getByLabel("Filter by center", { exact: true })
    .selectOption(centers[1].name);
  await expect(
    page.getByText("Showing 1–7 of 7", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Filter by center", { exact: true })
    .selectOption("all");
  await page
    .getByRole("button", { name: "Approved requests", exact: true })
    .click();
  await expect(
    page
      .getByRole("group", { name: "Request status" })
      .getByRole("button", { name: "Approved requests", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("navigation", { name: "Center dashboard sections" })
      .getByRole("button", { name: "Requests", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page
      .getByRole("navigation", { name: "Center dashboard sections" })
      .getByRole("button", { name: "Open requests", exact: true }),
  ).toHaveCount(0);
  await expect(table.getByRole("row")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Center profiles", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your directory profiles" }),
  ).toBeVisible();
  await expect(
    page.getByText("https://example.test", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../tmp/center-workspace-profile-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../tmp/center-workspace-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Open request", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Preferred appointment times" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Open secure chat", exact: true }))
    .toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "patient@example.test" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "../tmp/center-workspace-detail-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Back to requests", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Center dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Sign out of center", exact: true })
      .first(),
  ).toBeVisible();
});
test("empty workspace and expired center sessions are actionable", async ({
  page,
}) => {
  await mock(page, []);
  await page.goto("/#center");
  await expect(
    page.getByRole("heading", { name: "No requests yet" }),
  ).toBeVisible();
  await page.route("**/api/center/dashboard", (r) =>
    r.fulfill({
      status: 401,
      json: { error: "Your center session has expired. Log in again." },
    }),
  );
  await page
    .getByRole("button", { name: "Refresh requests", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Center login", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Center dashboard sections" }),
  ).toHaveCount(0);
});
test.describe("Android center workspace", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36 MySelfPayAndroid/1.0.9",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  test("center profile, request navigation and footer-free app", async ({
    page,
  }) => {
    await mock(page);
    await page.goto("/#center");
    await expect(
      page.getByRole("heading", { name: "Center dashboard", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".site-footer")).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page
      .getByRole("button", { name: "Open requests", exact: true })
      .click();
    await expect(
      page
        .getByRole("group", { name: "Request status" })
        .getByRole("button", { name: "Open requests", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
