import { test, expect } from '@playwright/test';
test('direct email portal link opens center login and verifies before dashboard access',async({page})=>{
 let verified=false;
 await page.route('**/api/me',r=>r.fulfill({status:401,json:{error:'Not signed in'}}));
 await page.route('**/api/directory-summary',r=>r.fulfill({json:{listing_count:0}}));
 await page.route('**/api/center/code',r=>{expect(r.request().postDataJSON().email).toBe('center@example.test');return r.fulfill({json:{verification_id:'synthetic-center'}});});
 await page.route('**/api/center/verify',r=>{expect(r.request().postDataJSON().code).toBe('123456');verified=true;return r.fulfill({json:{verified:true}});});
 await page.route('**/api/center/dashboard',r=>r.fulfill(verified?{json:{email:'center@example.test',centers:[],requests:[],center_csrf:'synthetic'}}:{status:401,json:{error:'Verify your center email'}}));
 await page.goto('/center-login');
 await expect(page.getByRole('heading',{name:'Center login',exact:true})).toBeVisible();
 await expect(page.locator('#centerEmail')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Find self-pay MRI and CT near you.'})).toHaveCount(0);
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.locator('#centerEmail').fill('center@example.test');
 await page.getByRole('button',{name:'Send email code',exact:true}).click();
 await page.locator('#centerOTP').fill('123456');
 await page.getByRole('button',{name:'Verify and open dashboard',exact:true}).click();
 await expect(page).toHaveURL(/#center$/);
 await expect(page.getByRole('heading',{name:'Center dashboard',exact:true})).toBeVisible();
});
