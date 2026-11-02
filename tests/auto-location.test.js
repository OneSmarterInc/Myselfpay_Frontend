import { describe, it, expect, vi } from "vitest";
import {
  stateForCoordinates,
  searchLocationHint,
} from "../src/auto-location.js";
import { StatewideLocationManager } from "../src/statewide-location.js";

function data(state = "OH") {
  return {
    version: "batch",
    search: { location: state },
    resolved_location: state === "National" ? null : { state },
    location_suggestions: [],
    offers: [],
    programs: [],
    program_entries: [],
    nearby_unpriced: [
      {
        booking_id: "center",
        name: "Synthetic center",
        states: "OH",
        location_type: "site",
        locations: [
          {
            city: "Cincinnati",
            state: "OH",
            latitude: 39.14,
            longitude: -84.5,
            precision: "city",
          },
        ],
        mri: "$350",
      },
    ],
  };
}

describe("automatic private location search", () => {
  it("detects US states locally, including DC, Alaska and Hawaii", async () => {
    for (const [latitude, longitude, state] of [
      [39.14, -84.5, "OH"],
      [39.08, -84.51, "KY"],
      [37.77, -122.42, "CA"],
      [40.75, -73.98, "NY"],
      [38.9, -77.03, "DC"],
      [61.22, -149.9, "AK"],
      [21.3, -157.85, "HI"],
    ])
      expect(await stateForCoordinates(latitude, longitude)).toBe(state);
  });

  it("never invents a US state for locations abroad", async () => {
    for (const point of [
      [19.076, 72.8777],
      [51.5, -0.12],
      [-33.87, 151.21],
      [0, 0],
      [43.65, -79.38],
    ])
      expect(await stateForCoordinates(...point)).toBeNull();
    await expect(stateForCoordinates(NaN, 0)).rejects.toThrow(/invalid/);
    expect(await searchLocationHint("Ohio")).toBe("OH");
    expect(await searchLocationHint("Cincinnati, OH")).toBe("OH");
    expect(await searchLocationHint("45202-1234")).toBe("45202");
    expect(await searchLocationHint("")).toBe("National");
    expect(await searchLocationHint("Mumbai")).toBe("National");
  });

  it("starts with no state entry and sends only the locally detected state", async () => {
    const request = vi.fn(async (_path, body) => data(body.location));
    const manager = new StatewideLocationManager(request);
    manager.setAutomaticLocation();
    const result = await manager.update(39.14, -84.5);
    expect(result.state).toBe("OH");
    expect(request.mock.calls[0][1].location).toBe("OH");
    expect(JSON.stringify(request.mock.calls)).not.toMatch(
      /39\.14|-84\.5|latitude|longitude/,
    );
    await manager.update(39.15, -84.5);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("automatically shows the US directory from abroad without a selected state or ZIP", async () => {
    const request = vi.fn(async (_path, body) => data(body.location));
    const manager = new StatewideLocationManager(request);
    manager.setAutomaticLocation();
    const result = await manager.update(19.076, 72.8777);
    expect(result.scope).toBe("national");
    expect(result.queryLocation).toBe("National");
    expect(result.records[0].distance_miles).toBeGreaterThan(7000);
    expect(request.mock.calls[0][1].location).toBe("National");
    expect(JSON.stringify(request.mock.calls)).not.toMatch(/19\.076|72\.8777/);
  });

  it("preserves an existing US preference abroad and automatically crosses state boundaries", async () => {
    const request = vi.fn(async (_path, body) => data(body.location));
    const manager = new StatewideLocationManager(request);
    manager.setAutomaticLocation("Ohio");
    expect((await manager.update(19.076, 72.8777)).state).toBe("OH");
    await manager.update(39.14, -84.5);
    expect(request).toHaveBeenCalledTimes(1);
    await manager.update(39.08, -84.51);
    expect(request.mock.lastCall[1].location).toBe("KY");
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("falls back safely for unrecognized ZIPs, empty state data and boundary-asset errors", async () => {
    const request = vi.fn(async (_path, body) =>
      body.location === "99999"
        ? { ...data(), resolved_location: null }
        : data(body.location),
    );
    const manager = new StatewideLocationManager(request);
    manager.setAutomaticLocation("99999");
    expect((await manager.update(19, 73)).scope).toBe("national");
    const empty = new StatewideLocationManager(async (_path, body) =>
      body.location === "OH"
        ? { ...data(), nearby_unpriced: [] }
        : data("National"),
    );
    empty.setAutomaticLocation();
    expect((await empty.update(39.14, -84.5)).scope).toBe("national");
    const unavailable = new StatewideLocationManager(
      async () => data("National"),
      {
        resolveState: async () => {
          throw new Error("offline asset");
        },
      },
    );
    unavailable.setAutomaticLocation();
    expect((await unavailable.update(39, -84)).scope).toBe("national");
  });

  it("ignores automatic resolution after logout and never retries authentication failures nationwide", async () => {
    let resolve;
    const request = vi.fn(async () => data());
    const manager = new StatewideLocationManager(request, {
      resolveState: () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    manager.setAutomaticLocation();
    const pending = manager.update(39, -84);
    manager.clear();
    resolve("OH");
    expect(await pending).toBeNull();
    expect(request).not.toHaveBeenCalled();
    const forbidden = vi.fn(async () => {
      throw Object.assign(new Error("Sign in again"), { status: 401 });
    });
    const protectedManager = new StatewideLocationManager(forbidden);
    protectedManager.setAutomaticLocation();
    await expect(protectedManager.update(39.14, -84.5)).rejects.toThrow(
      /Sign in/,
    );
    expect(forbidden).toHaveBeenCalledTimes(1);
  });
});
