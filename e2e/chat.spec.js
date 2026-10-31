import { test, expect } from "@playwright/test";

test("predefined chat keeps the reference layout and updates real directory searches", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find imaging options", exact: true })
    .click();
  await page.locator("#agent").click();
  await expect(
    page.getByRole("heading", { name: "Ask MySelfPay", exact: true }),
  ).toBeVisible();
  const questions = [
    ["Knee MRI near Cincinnati under $500", "Cincinnati, OH", 500],
    ["Brain MRI without contrast near Hilo", "Hilo, HI", 0],
    ["Knee MRI near Dayton", "Dayton, OH", 0],
  ];
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/agent")) requests++;
  });
  for (const [question, location, budget] of questions) {
    const pending = page.waitForResponse((response) =>
      response.url().endsWith("/api/agent"),
    );
    await page.getByRole("button", { name: question, exact: true }).click();
    const response = await pending;
    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.agent_mode).toBe("predefined-questions");
    expect(result.search.location).toBe(location);
    expect(result.search.budget).toBe(budget);
    await expect(page.locator("#chat .message.user").last()).toHaveText(
      question,
    );
    await expect(page.locator("#chat .message:not(.user)").last()).toHaveText(
      result.reply,
    );
    if (question === "Brain MRI without contrast near Hilo") {
      await page
        .locator("#chat")
        .locator("..")
        .screenshot({ path: "../chat-predefined-desktop.png" });
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .locator("#chat")
        .locator("..")
        .screenshot({ path: "../chat-predefined-mobile.png" });
      await page.setViewportSize({ width: 1600, height: 1000 });
    }
  }
  expect(requests).toBe(3);
  await page.locator("#message").fill("Diagnose a headache");
  await page
    .locator("#chatForm")
    .getByRole("button", { name: "Send", exact: true })
    .click();
  await expect(page.locator("#toast")).toContainText(
    "Choose one of the predefined questions",
  );
  expect(requests).toBe(3);
  await page.getByRole("button", { name: "Voice demo", exact: true }).click();
  await expect(page.locator("#transcript")).toHaveJSProperty(
    "tagName",
    "SELECT",
  );
  await page.locator("#transcript").selectOption("Knee MRI near Dayton");
  await page.locator("#useTranscript").click();
  await expect(page.locator("#chat .message.user")).toHaveCount(4);
  await page.locator("#message").fill("Knee MRI near Dayton");
  await page
    .locator("#chatForm")
    .getByRole("button", { name: "Send", exact: true })
    .click();
  await expect(page.locator("#chat .message.user")).toHaveCount(5);
  await expect(page.locator("#message")).toBeDisabled();
  await page.locator("#newGuestChat").click();
  await expect(page.locator("#message")).toBeEnabled();
  await expect(page.locator("#chat .message.user")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Ask MySelfPay", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
