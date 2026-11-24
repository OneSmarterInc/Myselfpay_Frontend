import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api.js";
afterEach(() => vi.unstubAllGlobals());
describe("API session boundary", () => {
  it("uses the rotated CSRF token on writes and sends session cookies", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrf_token: "synthetic-token" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ saved: true }) });
    vi.stubGlobal("fetch", fetch);
    await api("/session");
    await api("/sample", { method: "POST", body: { value: 1 } });
    const options = fetch.mock.calls[1][1];
    expect(options.credentials).toBe("include");
    expect(options.headers["X-CSRFToken"]).toBe("synthetic-token");
    expect(JSON.parse(options.body)).toEqual({ value: 1 });
  });
  it("reports server field validation errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({ note: ["This field is required."] }),
        }),
    );
    await expect(api("/sample")).rejects.toThrow(
      "note: This field is required.",
    );
  });
  it("reports non-JSON service failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error("HTML");
        },
      }),
    );
    await expect(api("/sample")).rejects.toThrow("service is unavailable");
  });
  it("signals expired authentication without treating permission errors as logout", async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: async () => ({ detail: "Owner access required." }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: async () => ({
            detail: "Authentication credentials were not provided.",
          }),
        }),
    );
    await expect(api("/owner")).rejects.toThrow();
    expect(dispatchEvent).not.toHaveBeenCalled();
    await expect(api("/session-required")).rejects.toThrow();
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
});
