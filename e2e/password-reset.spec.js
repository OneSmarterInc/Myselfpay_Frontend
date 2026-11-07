import { test, expect } from "@playwright/test";
import { completeMobileRegistration } from "./mobile-account.js";
for (const width of [360, 1280]) {
  test(`mobile-only signup and OTP login at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:850});
    await page.goto("/#signup");
    await page.locator("#accountName").fill("Jamie");
    await expect(page.locator("#accountUsername,#accountPassword,#accountConfirm,#accountZip")).toHaveCount(0);
    const phone=await completeMobileRegistration(page);
    const first=await (await page.request.get("/api/me")).json();
    await page.locator("#profile").click();
    await expect(page.locator("#accountLogin")).toBeVisible();
    await page.goto("/#login");
    await expect(page.getByRole("link",{name:"Forgot password?"})).toHaveCount(0);
    await expect(page.locator("#accountName,#accountUsername,#accountPassword")).toHaveCount(0);
    await page.locator("#accountPhone").fill(phone);
    await page.locator("#accountSubmit").click();
    await expect(page.locator(".otp-input-group input")).toHaveCount(6);
    await page.locator("#registrationOTP").fill("000000");
    await page.locator("#accountSubmit").click();
    await expect(page.getByRole("alert")).toContainText("Incorrect");
    await page.locator("#registrationOTP").fill("123456");
    await page.locator("#accountSubmit").click();
    await expect(page.locator(".mobile-account")).toHaveCount(0);
    const logged=await (await page.request.get("/api/me")).json();
    expect(logged.member.id).toBe(first.member.id);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
}
