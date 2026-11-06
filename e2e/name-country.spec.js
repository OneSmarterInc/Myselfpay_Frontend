import { test, expect } from "@playwright/test";
test("guest signup has a clean name placeholder and supports another calling code", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find imaging options", exact: true })
    .click();
  await expect(page.locator('#location')).toBeVisible();
  await page.goto('/#signup');
  const name = page.locator("#accountName");
  await expect(name).toHaveValue("");
  await expect(name).toHaveAttribute("placeholder", "Enter your name");
  await name.click();
  await expect(name).toHaveAttribute("placeholder", "");
  await name.fill("Jamie");
  await page
    .getByRole("heading", { name: "Create an account", exact: true })
    .click();
  await expect(name).toHaveValue("Jamie");
  await page.getByRole("combobox", { name: "Country code" }).selectOption("IN");
  await page.locator("#accountPhone").fill("9876543210");
  await page.route("**/api/auth/mobile/code", (route) => {
    expect(route.request().postDataJSON().phone).toBe("+919876543210");
    return route.fulfill({
      json: {
        verification_id: "synthetic",
        challenge: "synthetic-challenge",
        phone: "+919876543210",
      },
    });
  });
  await page.locator("#accountSubmit").click();
  await expect(page.locator(".otp-input-group input")).toHaveCount(6);
  await expect(page.locator(".mobile-account")).toContainText("+919876543210");
});

test("account creation from time requests supports country selection",async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Find imaging options',exact:true}).click();
 await page.locator('#location').fill('Ohio');
 await page.getByRole('button',{name:'Find options',exact:true}).click();
 await page.locator('article.card [data-appointment]').first().click();
 await page.getByRole('button',{name:'Create account and continue',exact:true}).click();
 await page.locator('#accountName').fill('Synthetic Patient');
 await page.getByRole('combobox',{name:'Country code'}).selectOption('IN');
 const requestPhone='98765'+String(Date.now()).slice(-5);
 await page.locator('#accountPhone').fill(requestPhone);
 await page.locator('#accountSubmit').click();
 await page.locator('#registrationOTP').fill('123456');
 await page.locator('#accountSubmit').click();
 await expect(page.locator('.time-choice-panel')).toBeVisible();
 await expect(page.locator('.flow-verified')).toContainText('+91'+requestPhone);
});
