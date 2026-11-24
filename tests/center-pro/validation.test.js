import { it, expect } from "vitest";
import { validationMessage } from "../../src/center-pro/api.js";
it("renders nested and row validation without object strings", () => {
 expect(validationMessage({preferred_times:["Choose three different times."]})).toBe("Preferred times: Choose three different times.");
 expect(validationMessage([{}, {non_field_errors:["Closing time must be later."]}])).toBe("Row 2: Closing time must be later.");
 expect(validationMessage({detail:"Access denied."})).toBe("Access denied.");
});
