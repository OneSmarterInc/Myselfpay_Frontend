import {test,expect} from "@playwright/test";
for (const width of [320,390,760]) {
 test(`nearest info fits mobile width ${width} and toggles on tap`,async ({page})=>{
  await page.setViewportSize({width,height:740});
  await page.goto("/");
  await page.getByRole("button",{name:"Find imaging options",exact:true}).click();
  await page.locator("#location").fill("Ohio");
  await page.getByRole("button",{name:"Find options",exact:true}).click();
  await expect(page.locator("article.card").first()).toBeVisible();
  await page.getByRole("switch",{name:"Near to me",exact:true}).click();
  const info=page.getByRole("button",{name:"About nearest results"});
  await info.click();
  const tip=page.getByRole("tooltip");
  await expect(tip).toBeVisible();
  const box=await tip.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x+box.width).toBeLessThanOrEqual(width);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y+box.height).toBeLessThanOrEqual(740);
  await info.click();
  await expect(tip).not.toBeVisible();
  await info.click();
  await expect(tip).toBeVisible();
  await page.locator("header").click({position:{x:5,y:5}});
  await expect(tip).not.toBeVisible();
 });
}
