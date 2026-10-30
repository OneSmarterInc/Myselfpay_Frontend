import { describe, it, expect } from "vitest";
import { price, safeWebsite, phoneOf } from "../src/format.js";
describe("published prices preserve qualifications", () => {
  it("does not present a conflicting or quote price as payable", () => {
    expect(price({ type: "conflict", amount: 200 })).toBe("Ask for a price");
    expect(price({ type: "quote", amount: 200 })).toBe("Ask for a price");
    expect(price({ type: "starting", amount: 200 })).toBe("From $200.00");
    expect(price({ type: "average", amount: 200 })).toBe(
      "Published average $200.00",
    );
  });
  it("only links to secure provider URLs", () => {
    expect(safeWebsite("javascript:alert(1)")).toBeUndefined();
    expect(safeWebsite("https://example.com")).toBe("https://example.com/");
  });
  it("extracts phone numbers from directory contact text", () => {
    expect(phoneOf({ coverage: "Cincinnati, OH (513) 555-0100" })).toBe(
      "513-555-0100",
    );
  });
});
