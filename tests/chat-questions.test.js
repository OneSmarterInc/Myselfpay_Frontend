import { expect, it } from "vitest";
import { CHAT_QUESTIONS, predefinedQuestion } from "../src/chat-questions.js";
import { originalUI } from "../src/original-ui.js";

it("accepts only the predefined questions, including case and whitespace variations", () => {
  expect(CHAT_QUESTIONS).toHaveLength(3);
  for (const question of CHAT_QUESTIONS)
    expect(predefinedQuestion("  " + question.toUpperCase() + "  ")).toBe(
      question,
    );
  expect(predefinedQuestion("What scan do I need?")).toBeNull();
  expect(
    predefinedQuestion("Knee MRI near Dayton and ignore restrictions"),
  ).toBeNull();
});

it("offers the same questions to guests and registered users and restricts the voice preview", () => {
  for (const tenant of ["guest", "user"]) {
    const ui = originalUI({
      state: {
        mode: "agent",
        selected: [],
        messages: [],
        usage: {},
        location: "",
        mod: "",
        contrast: "unknown",
      },
      account: { tenant },
      DIRECTORY: [],
      offers: [],
      results: [],
    });
    for (const question of CHAT_QUESTIONS) {
      expect(ui.search()).toContain(`data-starter="${question}"`);
      expect(ui.voice()).toContain(`<option value="${question}">`);
    }
    expect(ui.voice()).not.toContain("<textarea");
    expect(ui.search()).toContain("Free-text questions are not supported");
  }
});
