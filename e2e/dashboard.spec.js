import { test, expect } from "@playwright/test";
test("signed-in dashboard shows profile, request status and request links", async ({
  page,
}) => {
  await page.goto("/#signup");
  await expect(page.locator("#profile")).toBeEnabled();
  const email = `dashboard-${Date.now()}@example.com`;
  await page.locator("#accountName").fill("Dashboard Test User");
  await page.locator("#accountEmail").fill(email);
  await page.locator("#accountPassword").fill("Synthetic-only-passphrase!");
  await page.locator("#accountConfirm").fill("Synthetic-only-passphrase!");
  await page.locator("#accountSubmit").click();
  expect(
    await page
      .getByRole("link", { name: "Dashboard", exact: true })
      .evaluate((el) => el.nextElementSibling?.id),
  ).toBe("profile");
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My requests", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No requests yet" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "My profile", exact: true }).click();
  await expect(page.locator(".dashboard-profile")).toContainText(email);
  await page.route("**/api/dashboard?*", (r) =>
    r.fulfill({
      json: {
        profile: {
          name: "Dashboard Test User",
          email,
          phone: "",
          zip_code: "",
          created: 1793700000,
        },
        verified_email: email,
        stats: { requested: 1, scheduled: 1 },
        total: 2,
        page: 1,
        pages: 1,
        requests: [
          {
            id: "MSP-SYNTHETIC",
            tracking_token: "synthetic-only-token",
            clinic_name: "Synthetic Imaging Center",
            location: "Dayton",
            status: "requested",
            price_text: "Confirm price",
            service: "MRI",
            exam: "Knee",
            created: 1793700000,
            slots: [{ date: "2026-11-10", period: "morning" }],
          },
        ],
      },
    }),
  );
  await page.getByRole("button", { name: "Requests", exact: true }).click();
  await page
    .getByRole("group", { name: "Request status" })
    .getByRole("button", { name: "Open requests", exact: true })
    .click();
  await expect(
    page
      .getByRole("group", { name: "Request status" })
      .getByRole("button", { name: "Open requests", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("navigation", { name: "Dashboard sections" })
      .getByRole("button", { name: "Requests", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page
      .getByRole("navigation", { name: "Dashboard sections" })
      .getByRole("button", { name: "Approved requests", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Awaiting center confirmation", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open request", exact: true }),
  ).toHaveAttribute("href", "#request/MSP-SYNTHETIC/synthetic-only-token");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".request-slot-chip")).toHaveCount(1);
  await page.locator(".dashboard-request-details summary").click();
  await expect(page.locator(".dashboard-request-details dl")).toBeVisible();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width > 700) {
      await expect
        .poll(() =>
          page.evaluate(() =>
            Math.abs(
              document
                .querySelector(".dashboard-sidebar")
                .getBoundingClientRect().bottom - innerHeight,
            ),
          ),
        )
        .toBeLessThan(2);
      const geometry = await page.evaluate(() => {
        const side = document
          .querySelector(".dashboard-sidebar")
          .getBoundingClientRect();
        const head = document.querySelector("header").getBoundingClientRect();
        return {
          left: side.left,
          top: side.top,
          bottom: side.bottom,
          headerBottom: head.bottom,
          height: innerHeight,
        };
      });
      expect(geometry.left).toBe(0);
      expect(Math.abs(geometry.top - geometry.headerBottom)).toBeLessThan(2);
      expect(Math.abs(geometry.bottom - geometry.height)).toBeLessThan(2);
    }
    await page.screenshot({ path: `../tmp/dashboard-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".user-dashboard")
    .screenshot({ path: "../tmp/user-dashboard-mobile.png" });
  await page.getByRole("button", { name: "My profile", exact: true }).click();
  await expect(page.locator(".dashboard-profile")).toContainText(
    "Verified booking email",
  );
});
