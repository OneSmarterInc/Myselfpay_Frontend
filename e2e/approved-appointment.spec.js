import {test,expect} from "@playwright/test";
import {completeMobileRegistration} from "./mobile-account.js";

const item={id:"MSP-APPROVED",clinic_name:"Synthetic Center",status:"scheduled",location:"Dayton",service:"MRI",slots:[{date:"2026-11-10",period:"morning"}],timezone:"America/New_York",delivery:"sent",price_text:"Confirm total",created:1793900000,approved_slot:{date:"2026-11-12",time:"14:30",timezone:"America/New_York",source:"custom"}};
test("approved receipt shows confirmed time and removes waiting instructions",async({page})=>{
 await page.route("**/api/booking/patient",r=>r.fulfill({json:item}));
 await page.goto("/#request/MSP-APPROVED/synthetic-token");
 await expect(page.getByRole("heading",{name:"Approved appointment",exact:true})).toBeVisible();
 await expect(page.locator(".approved-appointment")).toContainText("2:30 PM");
 await expect(page.getByRole("heading",{name:"While you wait",exact:true})).toHaveCount(0);
 await expect(page.locator(".flow-progress")).toHaveCount(0);
 for(const width of [360,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`approved-receipt-${width}.png`,fullPage:true});}
});
test("patient dashboard prominently shows the center-approved alternative",async({page})=>{
 await page.goto("/#signup");await page.locator("#accountName").fill("Synthetic Patient");await completeMobileRegistration(page);
 await page.route("**/api/dashboard?*",r=>r.fulfill({json:{profile:{name:"Synthetic Patient",phone:"+16145550142"},stats:{scheduled:1},total:1,page:1,pages:1,requests:[item]}}));
 await page.getByRole("link",{name:"Dashboard",exact:true}).click();
 await expect(page.locator(".dashboard-request .approved-appointment")).toContainText("2:30 PM");
 await expect(page.locator(".dashboard-request .approved-appointment")).toContainText("alternative");
});
