import { describe, it, expect } from "vitest";
import {
  deliveryMessage,
  productionBookingCopy,
} from "../src/booking-messages.js";
describe("live booking email wording", () => {
  it("only claims an email was sent when the API confirms sent", () => {
    expect(deliveryMessage("sent")).toContain("emailed to the center");
    expect(deliveryMessage("failed")).toContain("could not be sent");
    expect(deliveryMessage("queued")).toContain("queued");
    expect(deliveryMessage("uncertain")).toContain("has not been confirmed");
    expect(deliveryMessage("suppressed")).toContain("No email sent");
  });
  it("keeps disabled mode wording and replaces it for enabled delivery", () => {
    const html = "Preview only. No clinic will receive this request.";
    expect(productionBookingCopy(html, false)).toBe(html);
    expect(productionBookingCopy(html, true)).toContain(
      "receive your booking request by email",
    );
  });
});
