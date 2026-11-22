import { describe, expect, it } from "vitest";
import { axisFor, defaultExam, dollars, examFamily, EXAMS } from "../src/HospitalRates.jsx";

describe("hospital rates panel helpers", () => {
  it("formats whole dollars with a comma", () => {
    expect(dollars(1033.2)).toBe("$1,033");
    expect(dollars(819.19)).toBe("$819");
  });

  it("starts on the exam that matches the listing", () => {
    expect(defaultExam("MRI without contrast")).toBe("70551");
    expect(defaultExam("CT")).toBe("70450");
    expect(defaultExam("")).toBe("70551");
  });

  it("compares an MRI price with MRI exams and a CT price with CT exams", () => {
    expect(examFamily("70551")).toBe("MRI");
    expect(examFamily("72148")).toBe("MRI");
    expect(examFamily("74177")).toBe("CT");
  });

  it("offers the six exams", () => {
    expect(EXAMS.map(([code]) => code)).toEqual(["70551", "73721", "72148", "70450", "71250", "74177"]);
  });

  it("builds a round axis that covers every figure", () => {
    const axis = axisFor([450, 2525, 3109, 819]);
    expect(axis.ticks).toHaveLength(5);
    expect(axis.max).toBeGreaterThanOrEqual(3109);
    expect(axis.ticks[0]).toBe(0);
    expect(axis.ticks[4]).toBe(axis.max);
  });

  it("ignores missing figures", () => {
    const axis = axisFor([null, undefined, 1000]);
    expect(axis.max).toBeGreaterThanOrEqual(1000);
  });
});
