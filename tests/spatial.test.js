import { describe, it, expect, vi } from "vitest";
import { latLngToCell, cellToLatLng, gridDisk } from "h3-js";
import {
  locationCells,
  SpatialDataManager,
  sortNearby,
  haversineMiles,
  watchLocation,
  validateBundle,
  spatialOffers,
} from "../src/spatial.js";

const latitude = 39.1,
  longitude = -84.5;
const center = latLngToCell(latitude, longitude, 7);
function bundle(cell = center) {
  const [lat, lng] = cellToLatLng(cell);
  return {
    center_cell: cell,
    queried_cells: gridDisk(cell, 1),
    count: 1,
    truncated: false,
    records: [
      {
        id: "site",
        entry_key: "center",
        h3_res7: cell,
        h3_res11: latLngToCell(lat, lng, 11),
        location: { latitude: lat, longitude: lng, precision: "city" },
        entry: { name: "Synthetic center", mri: "$350" },
      },
    ],
  };
}

describe("private browser spatial search", () => {
  it("converts locally to H3 7/11 and never includes GPS or a microcell in the request", async () => {
    const request = vi.fn(async () => bundle());
    const manager = new SpatialDataManager(request);
    const result = await manager.update(latitude, longitude);
    expect(locationCells(latitude, longitude)).toEqual({
      macro: center,
      micro: latLngToCell(latitude, longitude, 11),
    });
    expect(request.mock.calls).toEqual([[`/v1/spatial-bundle/${center}/`]]);
    expect(JSON.stringify(request.mock.calls)).not.toContain(String(latitude));
    expect(result.records[0].distance_miles).toBeGreaterThanOrEqual(0);
  });

  it("reuses the same cell, coalesces requests, caches revisits and bounds its memory", async () => {
    const request = vi.fn(async (path) => bundle(path.split("/")[3]));
    const manager = new SpatialDataManager(request, { maxBundles: 2 });
    await Promise.all([
      manager.update(latitude, longitude),
      manager.update(latitude, longitude),
    ]);
    await manager.update(latitude + 0.000001, longitude);
    expect(request).toHaveBeenCalledTimes(1);
    const neighbors = gridDisk(center, 1).filter((cell) => cell !== center);
    await manager.update(...cellToLatLng(neighbors[0]));
    await manager.update(latitude, longitude);
    expect(request).toHaveBeenCalledTimes(2);
    await manager.update(...cellToLatLng(neighbors[1]));
    expect(manager.cache.size).toBe(2);
    manager.clear();
    expect(manager.cache.size).toBe(0);
    expect(manager.active).toBeNull();
  });

  it("expires bundles on revisits and prevents stale responses after a session reset", async () => {
    let now = 0;
    const request = vi.fn(async (path) => bundle(path.split("/")[3]));
    const manager = new SpatialDataManager(request, {
      now: () => now,
      ttl: 10,
    });
    await manager.update(latitude, longitude);
    await manager.update(
      ...cellToLatLng(gridDisk(center, 1).find((cell) => cell !== center)),
    );
    now = 11;
    await manager.update(latitude, longitude);
    expect(request).toHaveBeenCalledTimes(3);
    let resolve;
    const waiting = new SpatialDataManager(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const pending = waiting.update(latitude, longitude);
    waiting.clear();
    resolve(bundle());
    expect(await pending).toBeNull();
    expect(waiting.cache.size).toBe(0);
  });

  it("sorts actual miles and falls back when H3 gridDistance cannot traverse", () => {
    const nearby = bundle().records[0];
    const farther = {
      ...nearby,
      id: "farther",
      location: { ...nearby.location, latitude: latitude + 0.02 },
    };
    const result = sortNearby(
      [farther, nearby],
      latitude,
      longitude,
      locationCells(latitude, longitude).micro,
      () => {
        throw new Error("pentagon");
      },
    );
    expect(result[0].id).toBe("site");
    expect(result[0].grid_steps).toBeNull();
    expect(result[0].distance_method).toBe("haversine-fallback");
    expect(haversineMiles([0, 0], [0, 1])).toBeCloseTo(69.0934, 2);
  });

  it("handles permission denial, timeout, unavailable and unsupported browsers and clears watches", () => {
    const error = vi.fn();
    const nav = {
      geolocation: {
        watchPosition: vi.fn((ok, fail) => {
          fail({ code: 1 });
          return 12;
        }),
        clearWatch: vi.fn(),
      },
    };
    const stop = watchLocation(vi.fn(), error, nav, true);
    expect(error.mock.calls[0][0].message).toMatch(/denied/);
    stop();
    expect(nav.geolocation.clearWatch).toHaveBeenCalledWith(12);
    for (const [code, message] of [
      [2, /determine/],
      [3, /timed out/],
    ]) {
      nav.geolocation.watchPosition.mockImplementation((ok, fail) =>
        fail({ code }),
      );
      watchLocation(vi.fn(), error, nav, true);
      expect(error.mock.lastCall[0].message).toMatch(message);
    }
    watchLocation(vi.fn(), error, {}, false);
    expect(error.mock.lastCall[0].message).toMatch(/HTTPS/);
    nav.geolocation.watchPosition.mockImplementation(() => {
      throw new Error("blocked");
    });
    watchLocation(vi.fn(), error, nav, true);
    expect(error.mock.lastCall[0].message).toMatch(/could not start/);
  });

  it("validates the full response and retries failures without caching invalid data", async () => {
    expect(() =>
      validateBundle({ ...bundle(), center_cell: "bad" }, center),
    ).toThrow();
    const invalid = bundle();
    invalid.records[0].h3_res11 = center;
    expect(() => validateBundle(invalid, center)).toThrow();
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(bundle());
    const manager = new SpatialDataManager(request);
    await expect(manager.update(latitude, longitude)).rejects.toThrow(
      "offline",
    );
    await expect(manager.update(latitude, longitude)).resolves.toBeTruthy();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("deduplicates sites by the nearest branch and applies optional filters locally", () => {
    const record = bundle().records[0];
    const search = { mod: "MRI", contrast: "unknown", budget: 0, type: "all" };
    expect(
      spatialOffers([record, { ...record, id: "second" }], search),
    ).toHaveLength(1);
    expect(spatialOffers([record], { ...search, mod: "CT" })).toHaveLength(0);
    expect(spatialOffers([record], { ...search, budget: 200 })).toHaveLength(0);
    record.offers = [
      {
        id: "fixed",
        type: "fixed",
        amount: 350,
        mod: "MRI",
        contrast: "without",
      },
    ];
    expect(
      spatialOffers([record], { ...search, budget: 400, type: "fixed" })[0]
        .amount,
    ).toBe(350);
  });
});
