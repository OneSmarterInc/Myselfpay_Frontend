import { test, expect } from "vitest";
import {
  beginLoading,
  loadingCount,
  subscribeLoading,
} from "../src/loading-state.js";
test("loading stays active until overlapping requests finish and completion is idempotent", () => {
  const values = [],
    unsubscribe = subscribeLoading(() => values.push(loadingCount()));
  const a = beginLoading(),
    b = beginLoading();
  expect(loadingCount()).toBe(2);
  a();
  a();
  expect(loadingCount()).toBe(1);
  b();
  expect(loadingCount()).toBe(0);
  unsubscribe();
  expect(values).toEqual([1, 2, 1, 0]);
});
