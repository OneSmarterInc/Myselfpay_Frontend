import { describe, expect, it } from "vitest";
import { canCancel, statusLabel } from "../src/request-status.js";

describe("request status words", () => {
  it("says what happened to a closed request", () => {
    expect(statusLabel({ status: "cancelled", closed_reason: "patient_cancelled" })).toBe("You cancelled this request");
    expect(statusLabel({ status: "cancelled", closed_reason: "scheduled_elsewhere" })).toMatch(/another facility/);
    expect(statusLabel({ status: "unable", closed_reason: "no_openings" })).toMatch(/no openings/);
    expect(statusLabel({ status: "unable", closed_reason: "not_offered" })).toMatch(/doesn’t offer/);
  });
  it("falls back to a plain label", () => {
    expect(statusLabel({ status: "cancelled" })).toBe("Request closed");
    expect(statusLabel({ status: "unable" })).toMatch(/couldn’t schedule/);
    expect(statusLabel({ status: "requested" })).toBe("Waiting for the facility to call");
  });
  it("offers Cancel only while a request is open or confirmed", () => {
    for (const status of ["requested", "voicemail", "scheduled"]) expect(canCancel({ status })).toBe(true);
    for (const status of ["unable", "expired", "cancelled"]) expect(canCancel({ status })).toBe(false);
  });
});
