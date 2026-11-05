import { expect } from "@playwright/test";
export async function completeMobileRegistration(page) {
  await page
    .locator("#accountPhone")
    .fill(
      "555" + String(Date.now()).slice(-6) + Math.floor(Math.random() * 10),
    );
  await page.locator("#accountSubmit").click();
  await expect(page.locator("#registrationOTP")).toBeVisible();
  await page.locator("#registrationOTP").fill("123456");
  await page.locator("#accountSubmit").click();
  await expect(
    page.getByRole("status").filter({ hasText: "Mobile number verified" }),
  ).toBeVisible();
  await page.locator("#accountSubmit").click();
}
