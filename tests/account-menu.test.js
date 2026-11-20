import { it, expect } from "vitest";
import { memberLabel } from "../src/account-menu.js";

it("shows the first initial and last four digits", () => {
  expect(memberLabel({ name: "Vera Test", phone: "+15555550142" })).toEqual({ initial: "V", text: "V · 0142" });
});
it("falls back when the name or number is missing", () => {
  expect(memberLabel({ phone: "5555550142" }).text).toBe("0142");
  expect(memberLabel({ name: "Vera" }).text).toBe("V");
  expect(memberLabel({})).toEqual({ initial: "A", text: "Account" });
});
