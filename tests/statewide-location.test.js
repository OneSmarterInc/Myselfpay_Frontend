import { describe, it, expect, vi } from "vitest";
import {
  StatewideLocationManager,
  statewideRecords,
} from "../src/statewide-location.js";
import { spatialOffers } from "../src/spatial.js";

const site = (city, latitude, longitude, state = "OH") => ({
  city,
  state,
  latitude,
  longitude,
  precision: "city",
});
const entry = (name, locations = []) => ({
  name,
  booking_id: name,
  states: "OH",
  location_type: locations.length ? "site" : "unresolved",
  locations,
  mri: "$350 without contrast",
});
const response = () => ({
  version: "batch",
  resolved_location: { state: "OH" },
  location_suggestions: [],
  offers: [],
  programs: [],
  program_entries: [],
  nearby_unpriced: [
    entry("Cincinnati", [site("Cincinnati", 39.14, -84.5)]),
    entry("Cleveland", [site("Cleveland", 41.5, -81.69)]),
    entry("Missing coordinates"),
    entry("Statewide provider", [site("Covington", 39.08, -84.51, "KY")]),
  ],
});

describe("statewide current-location search", () => {
  it("keeps distant centers and centers without coordinates while excluding other-state coordinates", () => {
    const data = statewideRecords(response());
    expect(data.count).toBe(4);
    expect(data.records).toHaveLength(4);
    expect(
      data.records.find((record) => record.entry_key === "Statewide provider")
        .location,
    ).toBeNull();
    expect(
      data.records.find((record) => record.entry_key === "Cleveland").h3_res11,
    ).toBeTruthy();
  });

  it("sends only the selected location, calculates from overseas and reuses all state records after movement", async () => {
    const request = vi.fn(async () => response());
    const manager = new StatewideLocationManager(request);
    manager.setLocation("Ohio");
    const india = await manager.update(19.076, 72.8777);
    expect(
      india.records
        .filter((record) => record.location)
        .every((record) => record.distance_miles > 7000),
    ).toBe(true);
    expect(india.records.at(-1).distance_miles).toBeNull();
    const local = await manager.update(39.14, -84.5);
    expect(local.records[0].entry.name).toBe("Cincinnati");
    expect(local.records[0].distance_miles).toBe(0);
    expect(
      local.records.some((record) => record.entry.name === "Cleveland"),
    ).toBe(true);
    expect(local.initial).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe("/search");
    expect(request.mock.calls[0][1]).toMatchObject({
      location: "Ohio",
      scope: "state",
      mod: "",
      budget: 0,
      type: "all",
    });
    expect(JSON.stringify(request.mock.calls)).not.toMatch(
      /19\.076|72\.8777|latitude|longitude|h3_res11/,
    );
  });

  it("requires an explicit directory location and accepts ZIP+4 as its base ZIP", async () => {
    const manager = new StatewideLocationManager(vi.fn(async () => response()));
    expect(() => manager.setLocation("")).toThrow(/Select a US state/);
    expect(() => manager.setLocation("National")).toThrow(/Select a US state/);
    manager.setLocation("45202-1234");
    expect(manager.location).toBe("45202");
    expect(() =>
      statewideRecords({ ...response(), resolved_location: null }),
    ).toThrow(/anywhere in the world/);
    expect(() =>
      statewideRecords({ ...response(), nearby_unpriced: null }),
    ).toThrow(/invalid statewide/);
  });

  it("coalesces requests, caches selected states and ignores responses after reset", async () => {
    const request = vi.fn(async () => response());
    const manager = new StatewideLocationManager(request);
    manager.setLocation("Ohio");
    await Promise.all([manager.update(39, -84), manager.update(40, -83)]);
    expect(request).toHaveBeenCalledTimes(1);
    manager.setLocation("Cincinnati, OH");
    await manager.update(39, -84);
    manager.setLocation("Ohio");
    await manager.update(39, -84);
    expect(request).toHaveBeenCalledTimes(2);
    let resolve;
    const waiting = new StatewideLocationManager(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    waiting.setLocation("Ohio");
    const promise = waiting.update(39, -84);
    waiting.clear();
    resolve(response());
    expect(await promise).toBeNull();
    expect(waiting.cache.size).toBe(0);
  });

  it("preserves reviewed price scope rather than applying a city price to every branch", () => {
    const center = entry("Multiple sites", [
      site("Cincinnati", 39.14, -84.5),
      site("Cleveland", 41.5, -81.69),
    ]);
    const data = response();
    data.nearby_unpriced = [];
    data.offers = [
      {
        id: "price",
        entry: center,
        region: "Cincinnati, OH",
        type: "fixed",
        amount: 350,
        mod: "MRI",
        contrast: "without",
      },
    ];
    const records = statewideRecords(data).records;
    expect(records[0].offers).toHaveLength(1);
    expect(records[1].offers).toHaveLength(0);
    expect(
      spatialOffers(records, {
        mod: "",
        contrast: "unknown",
        budget: 0,
        type: "all",
      })[0].amount,
    ).toBe(350);
  });
});
