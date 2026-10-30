import { describe, it, expect } from "vitest";
import { paginateGroups } from "../src/pagination.js";

describe("imaging listing pagination", () => {
  it("shares one ten-item page across offers and directory leads without losing records", () => {
    const groups = [
      [1, 2, 3],
      [4, 5],
      [],
      Array.from({ length: 18 }, (_, i) => i + 6),
    ];
    const pages = [0, 1, 2].map((page) => paginateGroups(groups, page));
    expect(pages.map((page) => page.items.flat().length)).toEqual([10, 10, 3]);
    expect(pages.flatMap((page) => page.items.flat())).toEqual(
      Array.from({ length: 23 }, (_, i) => i + 1),
    );
    expect(paginateGroups(groups, 99).current).toBe(2);
    expect(paginateGroups([[]]).pages).toBe(1);
  });
});
