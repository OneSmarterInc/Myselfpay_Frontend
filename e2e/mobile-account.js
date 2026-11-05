import { expect } from "@playwright/test";
const phones = new WeakMap();
export async function completeMobileRegistration(page) {
  const phone = "555" + String(Date.now()).slice(-6) + Math.floor(Math.random() * 10);
  phones.set(page,phone);
  await page.locator("#accountPhone").fill(phone);
  await page.locator("#accountSubmit").click();
  await expect(page.locator("#registrationOTP")).toBeVisible();
  await page.locator("#registrationOTP").fill("123456");
  await page.locator("#accountSubmit").click();
  await expect(page.locator(".mobile-account")).toHaveCount(0);
  return phone;
}
export async function completeMobileLogin(page) {
  await page.locator("#accountPhone").fill(phones.get(page));
  await page.locator("#accountSubmit").click();
  await expect(page.locator("#registrationOTP")).toBeVisible();
  await page.locator("#registrationOTP").fill("123456");
  await page.locator("#accountSubmit").click();
  await expect(page.locator(".mobile-account")).toHaveCount(0);
}
