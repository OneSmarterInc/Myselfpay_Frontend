import { test, expect } from "@playwright/test";
import { completeMobileRegistration } from "./mobile-account.js";

test("forgot password verifies mobile OTP, changes password and revokes the old login", async ({page}) => {
  const username = 'recover_'+Date.now();
  const oldPassword = 'Synthetic-old-password!';
  const newPassword = 'Synthetic-new-password!';
  await page.goto('/#signup');
  await page.locator('#accountName').fill('Synthetic Recovery User');
  await page.locator('#accountUsername').fill(username);
  await page.locator('#accountPassword').fill(oldPassword);
  await page.locator('#accountConfirm').fill(oldPassword);
  const issued = page.waitForRequest(r=>r.url().endsWith('/api/registration/mobile/code'));
  await completeMobileRegistration(page);
  const phone=(await issued).postDataJSON().phone;
  await expect(page.getByRole('link',{name:'Dashboard',exact:true})).toBeVisible();
  await page.locator('#profile').click();
  await page.locator('#accountLogin').click();
  await page.getByRole('link',{name:'Forgot password?',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Reset your password',exact:true})).toBeVisible();
  await page.locator('#resetUsername').fill(username);
  await page.locator('#resetPhone').fill(phone);
  await page.locator('#resetSubmit').click();
  await expect(page.locator('.otp-input-group input')).toHaveCount(6);
  await page.locator('#resetOTP').fill('000000');
  await page.locator('#resetSubmit').click();
  await expect(page.getByRole('alert')).toContainText('Incorrect');
  await page.locator('#resetOTP').fill('123456');
  await page.locator('#resetSubmit').click();
  await expect(page.locator('#resetPassword')).toBeVisible();
  for(const width of [360,1280]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('.mobile-account').screenshot({path:`password-reset-${width}.png`});
  }
  await page.locator('#resetPassword').fill(newPassword);
  await page.locator('#resetConfirm').fill(newPassword);
  await page.locator('#resetSubmit').click();
  await expect(page.getByRole('heading',{name:'Password reset',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Back to login',exact:true}).click();
  await page.locator('#accountUsername').fill(username);
  await page.locator('#accountPassword').fill(oldPassword);
  await page.locator('#accountSubmit').click();
  await expect(page.getByRole('alert')).toContainText('incorrect');
  await page.locator('#accountPassword').fill(newPassword);
  await page.locator('#accountSubmit').click();
  await expect(page.getByRole('link',{name:'Dashboard',exact:true})).toBeVisible();
});
