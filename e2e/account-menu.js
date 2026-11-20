// The header has one account control; its menu holds My requests, Profile, Center dashboard and Sign out.
export async function chooseFromAccountMenu(page, name) {
  await page.locator("#accountMenuButton").click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}
