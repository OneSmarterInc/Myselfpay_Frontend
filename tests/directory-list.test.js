import { it, expect } from "vitest";
import {
  filterDirectory,
  sortDirectory,
  directoryCountLine,
  cityState,
  formatCount,
} from "../src/directory-list.js";

const rows = [
  { name: "Zed Imaging", area: "Columbus", states: "OH", mri: "$400" },
  { name: "Alpha Imaging", area: "Dayton", states: "OH", ct: "$200", coverage: "1 Main St, Dayton, OH 45402" },
  { name: "Beta Imaging", area: "Albany", states: "NY", mri: "Call for price", ct: "" },
];

it("orders by state, then city, then name without distances", () => {
  expect(sortDirectory(rows).map((r) => r.name)).toEqual(["Beta Imaging", "Zed Imaging", "Alpha Imaging"]);
});

it("orders nearest first when distances are known", () => {
  const near = rows.map((r, i) => ({ ...r, distance_miles: [30, 5, 12][i] }));
  expect(sortDirectory(near).map((r) => r.name)).toEqual(["Alpha Imaging", "Beta Imaging", "Zed Imaging"]);
});

it("searches name, city, state and ZIP", () => {
  expect(filterDirectory(rows, { query: "Dayton, OH" })).toHaveLength(1);
  expect(filterDirectory(rows, { query: "dayton" })).toHaveLength(1);
  expect(filterDirectory(rows, { query: "45402" })).toHaveLength(1);
  expect(filterDirectory(rows, { query: "ny" })).toHaveLength(1);
});

it("narrows to published prices and by exam", () => {
  expect(filterDirectory(rows, { priced: true }).map((r) => r.name)).toEqual(["Zed Imaging", "Alpha Imaging"]);
  expect(filterDirectory(rows, { exam: "CT" }).map((r) => r.name)).toEqual(["Alpha Imaging"]);
  expect(filterDirectory(rows, { exam: "MRI" }).map((r) => r.name)).toEqual(["Zed Imaging"]);
});

it("formats counts and the showing line", () => {
  expect(formatCount(5162)).toBe("5,162");
  expect(directoryCountLine(5162, 0)).toBe("Showing 1 to 10 of 5,162");
  expect(directoryCountLine(5162, 516)).toBe("Showing 5,161 to 5,162 of 5,162");
  expect(directoryCountLine(0, 0)).toMatch(/No facilities match/);
  expect(cityState({ area: "Chicago", states: "IL" })).toBe("Chicago, IL");
});
