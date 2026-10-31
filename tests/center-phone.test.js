import { expect, it } from "vitest";
import { centerPhone } from "../src/center-phone.js";

it("uses explicit center phone fields before legacy coverage text", () => {
  expect(
    centerPhone({ phone: "5135550123", coverage: "(614) 555-0142" }),
  ).toEqual({ display: "513-555-0123", href: "tel:+15135550123" });
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
