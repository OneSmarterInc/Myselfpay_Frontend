import { afterEach, describe, expect, it, vi } from "vitest";
import { api, APIError, setCsrf } from "../src/api.js";

afterEach(() => {
  vi.unstubAllGlobals();
  setCsrf("");
});

function mockResponse(body, status = 200, headers = {}) {
  const fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("React client for the Django REST Framework API", () => {
  it("sends JSON negotiation, cookie credentials and the returned CSRF token", async () => {
    const fetch = mockResponse({
      member: { name: "Guest" },
      csrf: "session-csrf",
    });
    await api("/guest", {});
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ offers: [] }), { status: 200 }),
    );
    await api("/search", { location: "Ohio" });
    expect(fetch.mock.calls[1][1]).toMatchObject({
      credentials: "include",
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": "session-csrf",
      },
    });
  });

  it("turns DRF field errors into visible messages and retains field details", async () => {
    mockResponse(
      {
        error: "Please check the highlighted fields.",
        details: { email: ["Enter a valid email address."] },
      },
      400,
    );
    const error = await api("/register", {}).catch((e) => e);
    expect(error).toBeInstanceOf(APIError);
    expect(error.message).toContain("email: Enter a valid email address.");
    expect(error.fieldErrors.email).toEqual(["Enter a valid email address."]);
    expect(error.status).toBe(400);
  });

  it("supports standard DRF detail errors and rate-limit retry headers", async () => {
    mockResponse({ detail: "Request was throttled." }, 429, {
      "Retry-After": "45",
    });
    const error = await api("/guest", {}).catch((e) => e);
    expect(error.message).toBe("Request was throttled.");
    expect(error.retryAfter).toBe(45);
  });
});
