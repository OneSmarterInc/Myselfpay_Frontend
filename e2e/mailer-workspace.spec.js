import { test, expect } from '@playwright/test';
const row = (id,state,replies=0) => `<tr><td><input class="mailer-center-checkbox" type="checkbox" name="selected_contacts" value="${id}" form="mailer-compose"></td><td>${id}</td><td>Center ${id}</td><td>center${id}@example.test</td><td>12 Nov 2026</td><td>${state}</td><td>${state==='Not sent'?'—':`<a href="/admin/mailer/message/${id}/">${replies?`${replies} received`:'Open email'}</a>`}</td><td><button>Disable email</button></td></tr>`;
function fixture(rows) { return `<!doctype html><html><head><link rel="stylesheet" href="/mailer-workspace.css"><script src="/mailer-workspace.js" defer></script></head><body><form id="mailer-compose" data-matching-count="4"><input id="id_selection"><button>Preview recipients</button></form><p class="mailer-selected-count"></p><section class="mailer-directory"><input id="mailer-select-filtered" type="checkbox"><div class="sp-table-scroll"><table><thead><tr>${['Select','Row','Center','Email','Imported','Delivery','Replies','Action'].map(text=>`<th>${text}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><nav class="mailer-pagination"><span>Page 1 of 2</span></nav></section><input type="checkbox" id="mailer-select-page"></body></html>`; }
test('sent emails precede unsent across backend pages, replies filter and selection remain usable',async({page})=>{
  await page.route('**/admin/mailer/**',route=>route.fulfill({contentType:'text/html',body:fixture(new URL(route.request().url()).searchParams.get('page')==='2'?row(3,'Sent',1)+row(4,'Failed'):row(1,'Not sent')+row(2,'Sent'))}));
  await page.goto('/admin/mailer/');
  await expect(page.getByRole('status')).toContainText('Showing 4 centers');
  await expect(page.locator('tbody tr').first()).toContainText('Center 2');
  await expect(page.locator('tbody tr').nth(1)).toContainText('Center 3');
  await page.getByRole('button',{name:/Replies received/}).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('link',{name:'1 received'})).toHaveAttribute('href','/admin/mailer/message/3/');
  await page.locator('.mailer-center-checkbox').check();
  await expect(page.locator('.mailer-selected-count')).toHaveText('1 centers selected');
  await page.getByRole('button',{name:/Other emails/}).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.locator('.mailer-selected-count')).toHaveText('1 centers selected');
  const submitted = await page.evaluate(() => {
    const form=document.getElementById('mailer-compose');
    form.addEventListener('submit',event=>event.preventDefault());
    form.requestSubmit();
    return new FormData(form).getAll('selected_contacts');
  });
  expect(submitted).toContain('3');
  for(const width of [390,1280]) { await page.setViewportSize({width,height:900}); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true); await page.screenshot({path:`mailer-workspace-${width}.png`,fullPage:true}); }
});
test('partial failure is reported with retry rather than claiming all records loaded',async({page})=>{
  await page.route('**/admin/mailer/**',route=>new URL(route.request().url()).searchParams.get('page')==='2'?route.fulfill({status:503,body:'Unavailable'}):route.fulfill({contentType:'text/html',body:fixture(row(1,'Not sent')+row(2,'Sent'))}));
  await page.goto('/admin/mailer/');
  await expect(page.getByRole('button',{name:'Retry loading'})).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Loaded 2 of 4');
});
