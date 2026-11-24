import { describe, expect, it } from "vitest";
import { requestQuery } from "./api.js";
describe("request query", () => {
  it("encodes user search and preserves pagination and filters", () => {
    const params = new URLSearchParams(
      requestQuery({
        search: "MRI & CT",
        status: "confirmed",
        page: 3,
        size: 10,
        order: "reference",
      }),
    );
    expect(params.get("search")).toBe("MRI & CT");
    expect(params.get("status")).toBe("confirmed");
    expect(params.get("page")).toBe("3");
    expect(params.get("page_size")).toBe("10");
  });
});
