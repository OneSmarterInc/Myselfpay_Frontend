import { test, expect } from "@playwright/test";

test("clinic automatically requests one OTP and offers a visible timed resend", async ({ page }) => {
  let sends = 0;
  await page.clock.install();
  await page.route("**/api/booking/code", async route => {
    sends++;
    await route.fulfill({ json: { delivery: "sent", resend_after: 60 } });
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/#clinic/MSP-TEST/synthetic-token");
  await expect(page.locator("#clinicCodeStatus")).toContainText("emailed to the center");
  expect(sends).toBe(1);
  const resend = page.locator("#clinicCodeSend");
  await expect(resend).toBeVisible();
  await expect(resend).toBeDisabled();
  await page.clock.fastForward(61000);
  await expect(resend).toHaveText("Resend code");
  await expect(resend).toBeEnabled();
  await resend.click();
  await expect.poll(() => sends).toBe(2);
  await expect(resend).toBeDisabled();
});

test("patient sees no secure chat links before or after approval", async ({ page }) => {
  let status = "requested";
  const chat = "https://securemail.onesmarter.com/recipient/inbox?source=selfpay#thread/synthetic";
  await page.route("**/api/booking/patient", route => route.fulfill({ json: {
    id: "MSP-TEST", first_name: "Test", clinic_name: "Synthetic Clinic",
    location: "Dayton", service: "Consultation", slots: [], status,
    delivery: "sent", secure_chat_url: chat,
  } }));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/#request/MSP-TEST/synthetic-token");
  await expect(page.getByRole("link", { name: "Open secure chat", exact: true })).toHaveCount(0);
  await expect(page.getByText("View your request and exchange messages securely while the clinic reviews it.")).toHaveCount(0);
  status = "scheduled";
  await page.reload();
  await expect(page.getByText("Your request has been approved. Continue your secure conversation with the other participant.")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open secure chat", exact: true })).toHaveCount(0);
});
