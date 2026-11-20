import { describe, expect, it } from "vitest";
import { centerPhone } from "../src/center-phone.js";

it("uses explicit center phone fields before legacy coverage text", () => {
  expect(
    centerPhone({ phone: "5135550123", coverage: "(614) 555-0142" }),
  ).toEqual({ display: "(513) 555-0123", href: "tel:+15135550123" });
  expect(centerPhone({ "Phone Number": "+1 (513) 555-0123 ext 42" }).href).toBe(
    "tel:+15135550123;ext=42",
  );
  expect(centerPhone({ telephone: "+44 20 7946 0958" }).href).toBe(
    "tel:+442079460958",
  );
  expect(
    centerPhone({ phone: "N/A", coverage: "Call (513) 555-0123" }).href,
  ).toBe("tel:+15135550123");
  expect(
    centerPhone({ phone: "not supplied", coverage: "Ohio statewide" }),
  ).toBeNull();
});

import { formatPhone } from "../src/center-phone.js";
import { groupCode } from "../src/request-code.js";

describe("phone and code formats", () => {
  it("shows US numbers the way people read them", () => {
    expect(formatPhone("+18177146241")).toBe("(817) 714-6241");
    expect(formatPhone("817-714-6241")).toBe("(817) 714-6241");
    expect(formatPhone("+442071838750")).toBe("+442071838750");
    expect(formatPhone("")).toBe("");
  });
  it("groups a reference code in fours", () => {
    expect(groupCode("MSP-40E84C8B83F6C3CA")).toBe("MSP-40E8-4C8B-83F6-C3CA");
    expect(groupCode("REQ-123")).toBe("REQ-123");
    expect(groupCode("")).toBe("");
  });
});
