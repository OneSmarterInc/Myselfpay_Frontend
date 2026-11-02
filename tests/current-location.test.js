import { test, expect } from "vitest";
import { currentLocationLabel } from "../src/auto-location.js";
test("private city label resolves India coordinates without showing GPS", async () => {
 const label = await currentLocationLabel(20.78117,76.67788);
 expect(label).toBe("Near Shegaon, India");
 expect(label).not.toContain("20.78117");
});
test("city label handles invalid and remote coordinates", async () => {
 expect(await currentLocationLabel(NaN,0)).toContain("unavailable");
 expect(await currentLocationLabel(0,-140)).toContain("city unavailable");
});
