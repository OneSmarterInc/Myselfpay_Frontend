import { test, expect } from "@playwright/test";

test("a center sends itself a test, enters the code and sees the new inbox", async ({
  page,
}) => {
  let inbox = "";
  const sent = [];
  await page.route("**/api/center/dashboard", (r) =>
    r.fulfill({
      json: {
        email: "center@example.test",
        request_inbox: inbox,
        center_csrf: "c",
        centers: [
          {
            id: "x",
            name: "Synthetic Imaging",
            area: "Dayton",
            email: "center@example.test",
          },
        ],
        requests: [],
        price_submissions: [],
        live_prices: [],
        contact_history: [],
        profile_edits: [],
        activity: [],
      },
    }),
  );
  await page.route("**/api/center/inbox", (r) => {
    sent.push(r.request().postDataJSON());
    return r.fulfill({
      json: {
        verification_id: "v1",
        expires_in: 600,
        sent_to: "desk@example.test",
      },
    });
  });
  await page.route("**/api/center/inbox-verify", (r) => {
    inbox = "desk@example.test";
    return r.fulfill({ json: { request_inbox: inbox } });
  });
  await page.goto("/#center");
  await page
    .getByRole("button", { name: "Center profiles", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Where should patient requests go?" }),
  ).toBeVisible();
  await expect(page.getByText("center@example.test").first()).toBeVisible();
  await page.getByRole("button", { name: "Choose an inbox" }).click();
  await page.getByLabel("Request inbox email").fill("desk@example.test");
  await page.getByRole("button", { name: "Send a test" }).click();
  await expect(
    page.getByText("Open the test message and enter the 6-digit code."),
  ).toBeVisible();
  expect(sent[0]).toEqual({ address: "desk@example.test" });
  await page.getByLabel(/Code from the test message/).fill("123456");
  await page.getByRole("button", { name: "Confirm inbox" }).click();
  await expect(
    page.getByText("Requests now arrive at desk@example.test."),
  ).toBeVisible();
  await expect(
    page.locator("strong", { hasText: "desk@example.test" }),
  ).toBeVisible();
});
