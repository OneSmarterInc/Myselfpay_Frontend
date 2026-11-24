import { describe, it, expect } from "vitest";
import { comparePrice } from "../../src/center-pro/priceComparison.js";
describe("price comparison", () => {
  it("compares currency in cents", () => {
    expect(comparePrice("475.00", "465.00")).toEqual({tone: "high", difference: 10});
    expect(comparePrice("395", "450")).toEqual({tone: "low", difference: 55});
    expect(comparePrice("395.00", 395)).toEqual({tone: "equal", difference: 0});
    expect(comparePrice("0.30", 0.1 + 0.2).tone).toBe("equal");
  });
  it("does not interpret missing data as zero", () => {
    for (const value of [null, undefined, "", "invalid", -1]) expect(comparePrice(395, value)).toBeNull();
    expect(comparePrice(10, 0)).toEqual({tone: "high", difference: 10});
  });
});
