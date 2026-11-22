import { test, expect } from "@playwright/test";

const base = {
  clinic_name: "Synthetic Imaging",
  service: "MRI",
  exam: "Knee",
  contrast: "without",
  price_text: "$400",
  timezone: "America/New_York",
  slots: [
    { date: "2026-12-10", period: "morning" },
    { date: "2026-12-11", period: "afternoon" },
  ],
  created: Math.floor(Date.now() / 1000) - 2 * 86400,
};
const requests = [
  { ...base, id: "MSP-NEW", status: "requested", first_name: "Sam", phone: "+18177146241" },
  { ...base, id: "MSP-DONE", status: "scheduled", approved_slot: { date: "2026-12-10", period: "morning", timezone: "America/New_York", source: "preferred" } },
  { ...base, id: "MSP-ELSE", status: "cancelled", closed_reason: "scheduled_elsewhere" },
  { ...base, id: "MSP-GONE", status: "cancelled", closed_reason: "patient_cancelled" },
];

async function mock(page) {
  let posted = null;
  let saved = null;
  await page.route("**/api/center/dashboard", (r) =>
    r.fulfill({
      json: {
        email: "center@example.test",
        center_csrf: "c",
        centers: [{ id: "x", name: "Synthetic Imaging", area: "Dayton", email: "center@example.test" }],
        requests,
        median_response_seconds: 7200,
        price_submissions: [],
        live_prices: [],
        contact_history: [],
        profile_edits: [],
        activity: [],
      },
    }),
  );
  await page.route("**/api/center/request", (r) => {
    const body = r.request().postDataJSON();
    if (body.status) posted = body;
    else if (body.note !== undefined) saved = body;
    return r.fulfill({ json: { ...requests[0], first_name: "Sam", phone: "+18177146241", ...(body.status ? { status: "unable" } : {}), ...(saved || {}) } });
  });
  return Object.assign(() => posted, { saved: () => saved });
}

test("the inbox opens on New with plain counts and status words", async ({ page }) => {
  await mock(page);
  await page.goto("/#center");
  const counts = page.getByRole("group", { name: "Request status" });
  await expect(counts.getByRole("button", { name: /^New/ })).toHaveAttribute("aria-pressed", "true");
  await expect(counts.getByRole("button", { name: "New 1" })).toBeVisible();
  await expect(counts.getByRole("button", { name: "Time confirmed 1" })).toBeVisible();
  await expect(counts.getByRole("button", { name: "Closed 2" })).toBeVisible();
  await expect(counts.getByRole("button", { name: "Total 4" })).toBeVisible();
  await expect(page.getByText("Received 2 days ago")).toBeVisible();
  await expect(page.getByText("Thu Dec 10 morning")).toBeVisible();
  await expect(page.getByText("Fri Dec 11 afternoon")).toBeVisible();
  await expect(page.getByText(/^Showing /)).toHaveCount(0);
  await counts.getByRole("button", { name: /^Closed/ }).click();
  await expect(page.getByText("Closed: patient scheduled elsewhere")).toBeVisible();
  await expect(page.getByText("Cancelled by patient")).toBeVisible();
});

test("a request shows Call, the exam and a preview, and Can't schedule sends a reason", async ({ page }) => {
  const posted = await mock(page);
  await page.goto("/#center");
  await page.getByRole("button", { name: "View and respond" }).click();
  await expect(page.getByRole("link", { name: "Call (817) 714-6241" })).toBeVisible();
  await expect(page.getByText(/MRI Knee without contrast · Listed price \$400/)).toBeVisible();
  await expect(page.getByText("Pick a time above to confirm.")).toBeVisible();
  await page.getByRole("button", { name: "Can’t schedule", exact: true }).click();
  await page.getByLabel("Reason").selectOption("not_offered");
  await page.getByRole("button", { name: "Send: can’t schedule" }).click();
  await expect.poll(() => posted()?.reason).toBe("not_offered");
});

test("center login explains the code without revealing which emails are listed", async ({ page }) => {
  await page.route("**/api/center/code", (r) => r.fulfill({ json: { verification_id: "v", expires_in: 600 } }));
  await page.goto("/center-login");
  await expect(page.getByText("Enter the email we have on file for your center. We send it a 6-digit code.")).toBeVisible();
  await page.getByLabel("Center email", { exact: true }).fill("anyone@example.test");
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText(/If anyone@example.test matches a listing, we sent a 6-digit code/)).toBeVisible();
  await expect(page.getByText(/The code works for 10 minutes/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Send a new code/ })).toBeDisabled();
  await page.getByRole("button", { name: "Use a different email" }).click();
  await expect(page.getByRole("button", { name: "Email me a code" })).toBeVisible();
});

test("staff keep a note, mark the order received and see the median response time", async ({ page }) => {
  const posted = await mock(page);
  await page.goto("/#center");
  await expect(page.getByText("Your median response time:")).toContainText("2 hours");
  await expect(page.getByText("Sam", { exact: true })).toBeVisible();
  await expect(page.getByText("(817) 714-6241").first()).toBeVisible();
  await page.getByRole("button", { name: "View and respond" }).click();
  await page.getByLabel(/Order received/).check();
  await page.getByLabel("Note").fill("Left a message at 2 pm");
  await page.getByRole("button", { name: "Save records" }).click();
  await expect.poll(() => posted.saved()).toEqual({ id: "MSP-NEW", note: "Left a message at 2 pm", order_received: true });
  await expect(page.getByText("Saved.")).toBeVisible();
});
